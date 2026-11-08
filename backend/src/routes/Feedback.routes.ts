import {Router, type Request, type Response} from "express";
import {rateLimit} from "express-rate-limit";
import {pool} from "../db/pool.js";
import {createDb} from "../db/kysely.js";
import {asyncHandler} from "../AsyncRouteHandlerMiddleware.js";
import {requireAuth, type AuthLocals} from "../middleware/auth.js";
import {requireAdmin} from "../middleware/admin.js";
import {FeedbackRepository} from "../repository/Feedback.repository.js";
import {parseFeedback} from "../utils/feedback.js";

/*
 * Retours des joueurs (JWT requis)
 * - POST /feedback { kind: "bug" | "idea", message, page } : envoie un retour
 * - GET /feedback : derniers retours (administrateur)
 * - PUT /feedback/:id/done { done } : marque un retour comme traité ou non (administrateur)
 */
const router = Router();
const db = createDb(pool);
const feedback = new FeedbackRepository(db);

const sendLimiter = rateLimit({windowMs: 60 * 60 * 1000, limit: 10, standardHeaders: "draft-7", legacyHeaders: false,
    message: {status: "error", message: "Beaucoup de messages envoyés, réessaie dans une heure"}});

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

router.use(requireAuth);

router.post("/", sendLimiter, asyncHandler(async (req: Request, res: Response<unknown, AuthLocals>) => {
    const input = parseFeedback(req.body, req.get("user-agent"));
    if (typeof input === "string") return void res.status(400).json({status: "error", message: input});
    await feedback.create(res.locals.userId!, input);
    res.status(201).json({status: "ok", data: null});
}));

router.get("/", requireAdmin(db), asyncHandler(async (_req: Request, res: Response) => {
    res.status(200).json({status: "ok", data: await feedback.list()});
}));

router.put("/:id/done", requireAdmin(db), asyncHandler(async (req: Request, res: Response) => {
    const id = String(req.params.id);
    if (!UUID.test(id)) return void res.status(404).json({status: "error", message: "Retour introuvable"});
    const found = await feedback.setDone(id, req.body?.done !== false);
    if (!found) return void res.status(404).json({status: "error", message: "Retour introuvable"});
    res.status(200).json({status: "ok", data: null});
}));

export default router;
