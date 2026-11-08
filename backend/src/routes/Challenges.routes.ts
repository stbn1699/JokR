import {Router, type Request, type Response} from "express";
import {rateLimit} from "express-rate-limit";
import {pool} from "../db/pool.js";
import {createDb} from "../db/kysely.js";
import {asyncHandler} from "../AsyncRouteHandlerMiddleware.js";
import {requireAuth, type AuthLocals} from "../middleware/auth.js";
import {isUuid, routeParam} from "../utils/validation.js";
import {dailyDate} from "../utils/dailyDate.js";
import {ChallengesRepository} from "../repository/Challenges.repository.js";
import {FriendsRepository} from "../repository/Friends.repository.js";
import {finishedPuzzle, isPuzzleGame, startPuzzle} from "../services/puzzleGames.js";
import {tracker} from "../services/tracker.js";

/*
 * Défis entre amis (JWT requis)
 * - POST /challenges { gameCode, friends } : envoie à des amis la grille de sa dernière partie gagnée sur ce jeu
 *   (dans les 24 h) ; ils la jouent quand ils veulent
 * - POST /challenges/daily { gameCode, friends } : défie des amis au défi du jour (après l'avoir réussi)
 * - GET /challenges/:id : le défi reçu (qui, quel jeu, son temps, le tien si tu l'as déjà fait)
 * - POST /challenges/:id/start : lance une partie avec la grille du défi (partie normale : XP habituelle),
 *   une seule fois : un défi déjà relevé ne se rejoue pas (la solution est connue, pas d'XP en boucle)
 * - POST /challenges/:id/result : temps de cette partie, à comparer (enregistré et annoncé la première fois)
 */
const router = Router();
const db = createDb(pool);
const challenges = new ChallengesRepository(db);
const friends = new FriendsRepository(db);

const sendLimiter = rateLimit({windowMs: 60 * 60 * 1000, limit: 30, standardHeaders: "draft-7", legacyHeaders: false,
    message: {status: "error", message: "Trop de défis envoyés, réessaie plus tard"}});

router.use(requireAuth);
// Mode admin : on regarde ses défis, mais on n'en envoie ni n'en relève (l'ami·e verrait le résultat)
router.use((req: Request, res: Response<unknown, AuthLocals>, next) => {
    if (res.locals.ghost && req.method !== "GET") {
        return void res.status(403).json({status: "error", message: "Pas de défi entre ami·e·s en mode admin"});
    }
    next();
});

// Amis choisis : pseudos de vrais amis du joueur (au plus 20) → identifiants, ou null si la liste ne va pas
async function chosenFriends(userId: string, usernames: unknown): Promise<string[] | null> {
    if (!Array.isArray(usernames) || usernames.length === 0 || usernames.length > 20) return null;
    const mine = new Set(await friends.friendIds(userId));
    const ids: string[] = [];
    for (const name of usernames) {
        const id = typeof name === "string" ? await friends.findUserId(name) : undefined;
        if (!id || !mine.has(id)) return null;
        ids.push(id);
    }
    return [...new Set(ids)];
}

const gameCodeOf = (value: unknown) => (typeof value === "string" ? value.toUpperCase() : "");

router.post("/", sendLimiter, asyncHandler(async (req: Request, res: Response<unknown, AuthLocals>) => {
    const me = res.locals.userId!;
    const code = gameCodeOf(req.body?.gameCode);
    if (!isPuzzleGame(code)) return void res.status(404).json({status: "error", message: "Jeu inconnu"});
    const targets = await chosenFriends(me, req.body?.friends);
    if (!targets) return void res.status(400).json({status: "error", message: "Choisis une ou plusieurs personnes parmi tes ami·e·s"});

    const win = await challenges.lastWin(me, code);
    const puzzle = win?.game_id ? finishedPuzzle(code, win.game_id) : null;
    if (!win || !puzzle || win.duration_ms === null) {
        return void res.status(404).json({status: "error", message: "Cette grille n'est plus disponible, gagne une nouvelle partie pour défier tes ami·e·s"});
    }
    const id = await challenges.create(me, {code, puzzle, gridSize: win.grid_size, emptyCells: win.empty_cells, senderMs: win.duration_ms}, targets);
    res.status(201).json({status: "ok", data: {challengeId: id, sent: targets.length}});
}));

router.post("/daily", sendLimiter, asyncHandler(async (req: Request, res: Response<unknown, AuthLocals>) => {
    const me = res.locals.userId!;
    const code = gameCodeOf(req.body?.gameCode);
    if (!isPuzzleGame(code)) return void res.status(404).json({status: "error", message: "Jeu inconnu"});
    const targets = await chosenFriends(me, req.body?.friends);
    if (!targets) return void res.status(400).json({status: "error", message: "Choisis une ou plusieurs personnes parmi tes ami·e·s"});
    const date = dailyDate();
    const time = await challenges.dailyTime(me, code, date);
    if (time === null) return void res.status(400).json({status: "error", message: "Réussis d'abord le défi du jour pour défier tes ami·e·s"});
    await challenges.challengeDaily(me, code, date, time, targets);
    res.status(200).json({status: "ok", data: {sent: targets.length}});
}));

// Défi reçu par le joueur connecté, ou réponse 404
async function received(req: Request, res: Response<unknown, AuthLocals>) {
    const id = routeParam(req.params, "id") ?? "";
    const challenge = isUuid(id) ? await challenges.forPlayer(id, res.locals.userId!) : undefined;
    if (!challenge || !isPuzzleGame(challenge.game_code)) {
        res.status(404).json({status: "error", message: "Ce défi n'existe pas, ou il ne t'a pas été envoyé"});
        return null;
    }
    return challenge;
}

const summary = (c: NonNullable<Awaited<ReturnType<typeof challenges.forPlayer>>>) => ({
    challengeId: c.id,
    gameCode: c.game_code,
    gameName: c.game_name,
    gridSize: c.grid_size,
    emptyCells: c.empty_cells,
    from: {username: c.sender_username, avatar: c.sender_avatar, level: c.sender_level},
    senderMs: c.sender_ms,
    // ton temps, si tu l'as déjà fait
    playerMs: c.duration_ms,
    createdAt: c.created_at,
});

router.get("/:id", asyncHandler(async (req: Request, res: Response<unknown, AuthLocals>) => {
    const challenge = await received(req, res);
    if (challenge) res.status(200).json({status: "ok", data: summary(challenge)});
}));

router.post("/:id/start", asyncHandler(async (req: Request, res: Response<unknown, AuthLocals>) => {
    const challenge = await received(req, res);
    if (!challenge || !isPuzzleGame(challenge.game_code)) return;
    if (challenge.duration_ms !== null) {
        return void res.status(409).json({status: "error", message: "Tu as déjà relevé ce défi"});
    }
    const {gameId, grid} = startPuzzle(challenge.game_code, challenge.puzzle);
    await challenges.setGame(challenge.id, res.locals.userId!, gameId);
    tracker.started(req, {gameId, gameCode: challenge.game_code, mode: "free", gridSize: challenge.grid_size, emptyCells: challenge.empty_cells});
    res.status(200).json({
        status: "ok",
        // même forme qu'un défi du jour (le site le charge de la même façon)
        data: {date: dailyDate(challenge.created_at), alreadyDone: false, gameId, grid, size: challenge.grid_size, emptyCells: challenge.empty_cells},
    });
}));

router.post("/:id/result", asyncHandler(async (req: Request, res: Response<unknown, AuthLocals>) => {
    const challenge = await received(req, res);
    if (!challenge) return;
    const me = res.locals.userId!;
    // Temps lu sur la partie lancée pour ce défi (le suivi des parties l'écrit juste après la victoire)
    let time: number | null = null;
    for (let attempt = 0; attempt < 5 && challenge.game_id && time === null; attempt++) {
        time = await challenges.sessionTime(me, challenge.game_id);
        if (time === null) await new Promise(r => setTimeout(r, 200));
    }
    if (time === null) return void res.status(409).json({status: "error", message: "Termine d'abord la grille du défi"});
    const first = await challenges.recordResult(challenge.id, me, time);
    res.status(200).json({
        status: "ok",
        data: {...summary(challenge), playerMs: first ? time : challenge.duration_ms ?? time, latestMs: time, first},
    });
}));

export default router;
