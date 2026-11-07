import {Router, type Request, type Response} from "express";
import {pool} from "../db/pool.js";
import {createDb} from "../db/kysely.js";
import {asyncHandler} from "../AsyncRouteHandlerMiddleware.js";
import {requireAuth, type AuthLocals} from "../middleware/auth.js";
import {NotificationsRepository} from "../repository/Notifications.repository.js";

const LIMIT = 30;

/*
 * Notifications du joueur connecté (cloche du header), JWT requis
 * - GET /notifications : les 30 dernières et le nombre de non lues
 * - POST /notifications/read : toutes marquées comme vues, ou seulement { ids } (ex. popup des XP fermée)
 */
const router = Router();
const notifications = new NotificationsRepository(createDb(pool));

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

export default router;
