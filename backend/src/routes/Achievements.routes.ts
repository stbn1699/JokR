import {Router, type Request, type Response} from "express";
import {rateLimit} from "express-rate-limit";
import {asyncHandler} from "../AsyncRouteHandlerMiddleware.js";
import {requireAuth, type AuthLocals} from "../middleware/auth.js";
import {achievements} from "../services/achievements/index.js";
import {CLIENT_EVENTS, clientEvent} from "../services/achievements/events.js";
import {pool} from "../db/pool.js";
import {createDb} from "../db/kysely.js";

/*
 * Succès du joueur connecté (liste : backend/src/utils/achievements.ts, connue aussi du site)
 * - GET /achievements → { unlocked: [{ id, reward, unlockedAt }], stats } : débloqués et statistiques (barres
 *   d'avancement) ; relit tout avant de répondre (les succès d'un état du compte se débloquent ici au besoin)
 * - GET /achievements/unseen → { unlocked: [...], credits } : débloqués pas encore montrés (popups), et le solde
 * - POST /achievements/seen { ids } : popups montrées
 * - POST /achievements/event { kind, game? } : ce que seul le site voit (visite de l'interface, page des
 *   nouveautés, règles d'un jeu ouvertes)
 */
const router = Router();
const db = createDb(pool);

const eventLimiter = rateLimit({windowMs: 60 * 1000, limit: 30, standardHeaders: "draft-7", legacyHeaders: false,
    message: {status: "error", message: "Doucement !"}});

router.use(requireAuth);

router.get("/", asyncHandler(async (_req: Request, res: Response<unknown, AuthLocals>) => {
    res.status(200).json({status: "ok", data: await achievements.overview(res.locals.userId!)});
}));

router.get("/unseen", asyncHandler(async (_req: Request, res: Response<unknown, AuthLocals>) => {
    const me = res.locals.userId!;
    const [unlocked, user] = await Promise.all([
        achievements.unseen(me),
        db.selectFrom("users").select("credits").where("id", "=", me).executeTakeFirst(),
    ]);
    res.status(200).json({status: "ok", data: {unlocked, credits: user?.credits ?? 0}});
}));

router.post("/seen", asyncHandler(async (req: Request, res: Response<unknown, AuthLocals>) => {
    const ids: unknown = req.body?.ids;
    if (!Array.isArray(ids) || ids.length > 100 || !ids.every(id => typeof id === "string" && id.length <= 64)) {
        return void res.status(400).json({status: "error", message: "Succès invalides"});
    }
    await achievements.markSeen(res.locals.userId!, ids as string[]);
    res.status(200).json({status: "ok", data: null});
}));

const GAME = /^[a-z]{2,16}$/i;
router.post("/event", eventLimiter, asyncHandler(async (req: Request, res: Response<unknown, AuthLocals>) => {
    const kind: unknown = req.body?.kind;
    const game: unknown = req.body?.game;
    if (!CLIENT_EVENTS.includes(kind as typeof CLIENT_EVENTS[number])) return void res.status(400).json({status: "error", message: "Événement inconnu"});
    if (kind === "rules" && (typeof game !== "string" || !GAME.test(game))) return void res.status(400).json({status: "error", message: "Jeu inconnu"});
    await achievements.track(res.locals.userId, ctx => clientEvent(ctx, kind as typeof CLIENT_EVENTS[number], typeof game === "string" ? game.toUpperCase() : undefined));
    res.status(200).json({status: "ok", data: null});
}));

export default router;
