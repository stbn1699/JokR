import {Router, type Request, type Response} from "express";
import {rateLimit} from "express-rate-limit";
import {pool} from "../db/pool.js";
import {createDb} from "../db/kysely.js";
import {asyncHandler} from "../AsyncRouteHandlerMiddleware.js";
import {requireAuth, type AuthLocals} from "../middleware/auth.js";
import {routeParam} from "../utils/validation.js";
import {FriendsRepository} from "../repository/Friends.repository.js";

/*
 * Amis du joueur connecté (JWT requis)
 * - GET /friends : amis, demandes reçues, demandes envoyées
 * - POST /friends/requests { username } : demande d'ami (acceptée tout de suite si l'autre avait déjà demandé)
 * - POST /friends/requests/:username/accept : accepte la demande reçue de ce joueur
 * - DELETE /friends/:username : refuse ou annule une demande, ou retire un ami
 */
const router = Router();
const friends = new FriendsRepository(createDb(pool));

// 30 demandes par heure : pas d'envoi en masse
const requestLimiter = rateLimit({windowMs: 60 * 60 * 1000, limit: 30, standardHeaders: "draft-7", legacyHeaders: false,
    message: {status: "error", message: "Trop de demandes d'amis, réessaie plus tard"}});

router.use(requireAuth);

// Le joueur visé par un pseudo, ou une réponse d'erreur (introuvable, soi-même)
async function target(username: unknown, me: string, res: Response): Promise<string | null> {
    const id = typeof username === "string" && username.length <= 30 ? await friends.findUserId(username) : undefined;
    if (!id) {
        res.status(404).json({status: "error", message: "Joueur introuvable"});
        return null;
    }
    if (id === me) {
        res.status(400).json({status: "error", message: "Tu ne peux pas t'ajouter toi-même"});
        return null;
    }
    return id;
}

router.get("/", asyncHandler(async (_req: Request, res: Response<unknown, AuthLocals>) => {
    res.status(200).json({status: "ok", data: await friends.list(res.locals.userId!)});
}));

router.post("/requests", requestLimiter, asyncHandler(async (req: Request, res: Response<unknown, AuthLocals>) => {
    const me = res.locals.userId!;
    const other = await target(req.body?.username, me, res);
    if (!other) return;
    const result = await friends.request(me, other);
    res.status(200).json({status: "ok", data: {result}});
}));

router.post("/requests/:username/accept", asyncHandler(async (req: Request, res: Response<unknown, AuthLocals>) => {
    const me = res.locals.userId!;
    const other = await target(routeParam(req.params, "username"), me, res);
    if (!other) return;
    if (!await friends.accept(me, other)) {
        res.status(404).json({status: "error", message: "Cette demande n'existe plus"});
        return;
    }
    res.status(200).json({status: "ok", data: {result: "accepted"}});
}));

router.delete("/:username", asyncHandler(async (req: Request, res: Response<unknown, AuthLocals>) => {
    const me = res.locals.userId!;
    const other = await target(routeParam(req.params, "username"), me, res);
    if (!other) return;
    await friends.remove(me, other);
    res.status(200).json({status: "ok", data: null});
}));

export default router;
