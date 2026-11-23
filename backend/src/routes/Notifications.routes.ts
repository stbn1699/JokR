import {Router, type Request, type Response} from "express";
import {pool} from "../db/pool.js";
import {createDb} from "../db/kysely.js";
import {asyncHandler} from "../AsyncRouteHandlerMiddleware.js";
import {requireAuth, type AuthLocals} from "../middleware/auth.js";
import {NotificationsRepository} from "../repository/Notifications.repository.js";
import {PushRepository} from "../repository/Push.repository.js";
import {config} from "../config.js";
import {isPushEndpoint, parsePushSubscription} from "../utils/push.js";

const LIMIT = 30;

/*
 * Notifications du joueur connecté (cloche du header), JWT requis
 * - GET /notifications : les 30 dernières et le nombre de non lues
 * - POST /notifications/read : toutes marquées comme vues, ou seulement { ids } (ex. popup des XP fermée)
 * - GET /notifications/push : clé publique du serveur (null si les notifications push ne sont pas configurées)
 * - POST /notifications/push : abonne cet appareil au joueur ; DELETE : le désabonne ({ endpoint })
 */
const router = Router();
const notifications = new NotificationsRepository(createDb(pool));
const push = new PushRepository(createDb(pool));

router.use(requireAuth);

router.get("/", asyncHandler(async (_req: Request, res: Response<unknown, AuthLocals>) => {
    const userId = res.locals.userId!;
    const [items, unread] = await Promise.all([notifications.list(userId, LIMIT), notifications.unreadCount(userId)]);
    res.status(200).json({status: "ok", data: {items, unread}});
}));

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

router.post("/read", asyncHandler(async (req: Request, res: Response<unknown, AuthLocals>) => {
    const ids: unknown = req.body?.ids;
    if (ids !== undefined && (!Array.isArray(ids) || ids.length > 50 || !ids.every(id => typeof id === "string" && UUID.test(id)))) {
        res.status(400).json({status: "error", message: "Notifications invalides"});
        return;
    }
    await notifications.markRead(res.locals.userId!, ids as string[] | undefined);
    res.status(200).json({status: "ok", data: null});
}));

router.get("/push", (_req: Request, res: Response<unknown, AuthLocals>) => {
    res.status(200).json({status: "ok", data: {publicKey: config.push?.publicKey ?? null}});
});

router.post("/push", asyncHandler(async (req: Request, res: Response<unknown, AuthLocals>) => {
    const keys = parsePushSubscription(req.body);
    if (!config.push || !keys) {
        res.status(400).json({status: "error", message: "Abonnement aux notifications invalide"});
        return;
    }
    await push.save(res.locals.userId!, keys);
    res.status(200).json({status: "ok", data: null});
}));

router.delete("/push", asyncHandler(async (req: Request, res: Response<unknown, AuthLocals>) => {
    const endpoint: unknown = req.body?.endpoint;
    if (!isPushEndpoint(endpoint)) {
        res.status(400).json({status: "error", message: "Abonnement aux notifications invalide"});
        return;
    }
    await push.remove(res.locals.userId!, endpoint);
    res.status(200).json({status: "ok", data: null});
}));

export default router;
