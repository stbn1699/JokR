import {achievements} from "../services/achievements/index.js";
import {Router, type Request, type Response} from "express";
import {rateLimit} from "express-rate-limit";
import {pool} from "../db/pool.js";
import {createDb} from "../db/kysely.js";
import {asyncHandler} from "../AsyncRouteHandlerMiddleware.js";
import {requireAuth, type AuthLocals} from "../middleware/auth.js";
import {routeParam} from "../utils/validation.js";
import {cleanMessage} from "../utils/social.js";
import {FriendsRepository} from "../repository/Friends.repository.js";
import {ChallengesRepository} from "../repository/Challenges.repository.js";
import {SocialRepository} from "../repository/Social.repository.js";
import {presence} from "../services/presence.js";
import {DUEL_GAMES, duelDifficulties, duelPuzzle} from "../services/duels.js";

/*
 * Onglet Social du joueur connecté (JWT requis)
 * - GET /social : ami·e·s (présence, messages non lus, bilan des défis), demandes reçues, jeux des duels
 * - GET /social/unread : nombre de messages non lus (pastille de l'onglet)
 * - GET /social/:username/messages : la discussion (les 100 derniers), messages reçus marqués comme lus
 * - POST /social/:username/messages { text } : envoie un message
 * - POST /social/:username/duels { gameCode, difficulty } : lance un duel (même grille pour les deux, chacun la joue
 *   sur /defi-ami/:id) ; renvoie son identifiant
 * Seulement entre ami·e·s. Le mode admin regarde, mais n'écrit ni ne défie personne.
 */
const router = Router();
const db = createDb(pool);
const social = new SocialRepository(db);
const friends = new FriendsRepository(db);
const challenges = new ChallengesRepository(db);

const messageLimiter = rateLimit({windowMs: 60 * 1000, limit: 30, standardHeaders: "draft-7", legacyHeaders: false,
    message: {status: "error", message: "Doucement ! Attends un peu avant d'envoyer d'autres messages"}});
const duelLimiter = rateLimit({windowMs: 60 * 60 * 1000, limit: 30, standardHeaders: "draft-7", legacyHeaders: false,
    message: {status: "error", message: "Trop de duels lancés, réessaie plus tard"}});

router.use(requireAuth);
router.use((req: Request, res: Response<unknown, AuthLocals>, next) => {
    if (res.locals.ghost && req.method !== "GET") {
        return void res.status(403).json({status: "error", message: "Pas de discussion ni de duel en mode admin"});
    }
    next();
});

// Présence de chaque joueur : en partie (jeu de puzzle ouvert) plutôt qu'en ligne s'il a plusieurs onglets
function presenceOf(ids: Set<string>) {
    const seen = new Map<string, { status: "online" | "playing"; gameCode: string | null }>();
    for (const p of presence.list()) {
        if (!p.userId || !ids.has(p.userId) || p.closed) continue;
        const playing = p.page === "puzzle" && p.gameCode !== null;
        if (playing || !seen.has(p.userId)) {
            seen.set(p.userId, {status: playing ? "playing" : "online", gameCode: playing ? p.gameCode!.toUpperCase() : null});
        }
    }
    return seen;
}

router.get("/", asyncHandler(async (_req: Request, res: Response<unknown, AuthLocals>) => {
    const me = res.locals.userId!;
    const [list, lists, unread, last, record, names] = await Promise.all([
        social.friends(me), friends.list(me), social.unreadBySender(me), social.lastMessageAt(me), social.records(me), social.gameNames(),
    ]);
    const present = presenceOf(new Set(list.map(f => f.id)));
    res.status(200).json({
        status: "ok",
        data: {
            friends: list.map(f => {
                const p = present.get(f.id);
                return {
                    username: f.username, avatar: f.avatar, level: f.level,
                    presence: p?.status ?? "offline",
                    gameName: p?.gameCode ? names.get(p.gameCode) ?? null : null,
                    unread: unread.get(f.id) ?? 0,
                    lastMessageAt: last.get(f.id) ?? null,
                    record: record.get(f.id) ?? {wins: 0, losses: 0},
                };
            }),
            incoming: lists.incoming,
            outgoing: lists.outgoing,
            duelGames: DUEL_GAMES.map(code => ({code, name: names.get(code) ?? code, difficulties: duelDifficulties(code)})),
        },
    });
}));

router.get("/unread", asyncHandler(async (_req: Request, res: Response<unknown, AuthLocals>) => {
    res.status(200).json({status: "ok", data: {unread: await social.unreadTotal(res.locals.userId!)}});
}));

// L'ami·e visé·e par le pseudo de l'adresse, ou une réponse d'erreur
async function friendOf(req: Request, res: Response<unknown, AuthLocals>): Promise<string | null> {
    const username = routeParam(req.params, "username");
    const id = username && username.length <= 30 ? await friends.findUserId(username) : undefined;
    if (!id || await friends.relation(res.locals.userId!, id) !== "friends") {
        res.status(404).json({status: "error", message: "Tu ne peux discuter qu'avec tes ami·e·s"});
        return null;
    }
    return id;
}

router.get("/:username/messages", asyncHandler(async (req: Request, res: Response<unknown, AuthLocals>) => {
    const me = res.locals.userId!;
    const other = await friendOf(req, res);
    if (!other) return;
    const messages = await social.conversation(me, other);
    // le mode admin lit sans marquer comme lu (l'ami·e garderait sinon une discussion « vue »)
    if (!res.locals.ghost) await social.markRead(me, other);
    res.status(200).json({status: "ok", data: {messages}});
}));

router.post("/:username/messages", messageLimiter, asyncHandler(async (req: Request, res: Response<unknown, AuthLocals>) => {
    const other = await friendOf(req, res);
    if (!other) return;
    const text = cleanMessage(req.body?.text);
    if (!text) return void res.status(400).json({status: "error", message: "Message vide ou trop long (500 caractères au plus)"});
    res.status(201).json({status: "ok", data: {message: await social.send(res.locals.userId!, other, text)}});
}));

router.post("/:username/duels", duelLimiter, asyncHandler(async (req: Request, res: Response<unknown, AuthLocals>) => {
    const me = res.locals.userId!;
    const other = await friendOf(req, res);
    if (!other) return;
    const code = typeof req.body?.gameCode === "string" ? req.body.gameCode.toUpperCase() : "";
    const grid = duelPuzzle(code, req.body?.difficulty);
    if (!grid) return void res.status(400).json({status: "error", message: "Choisis un jeu et une difficulté proposés"});
    const challengeId = await challenges.createDuel(me, other, grid);
    void achievements.track(me, ctx => ctx.add("challenges.sent"));
    res.status(201).json({status: "ok", data: {challengeId}});
}));

export default router;
