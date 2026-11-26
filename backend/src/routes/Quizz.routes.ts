import {Router, type Request, type Response} from "express";
import {rateLimit} from "express-rate-limit";
import {pool} from "../db/pool.js";
import {createDb} from "../db/kysely.js";
import {asyncHandler} from "../AsyncRouteHandlerMiddleware.js";
import {requireAuth, type AuthLocals} from "../middleware/auth.js";
import {requireAdmin} from "../middleware/admin.js";
import {QuizzRepository} from "../repository/Quizz.repository.js";
import {isQuizzTopic, parseQuestions, parseReview} from "../utils/quizz.js";

/*
 * Questions du Quizz proposées par les joueurs
 * - GET /quizz/topics/:topicId/questions : questions validées du thème (ouvert à tous : elles s'ajoutent aux parties)
 * - POST /quizz/topics/:topicId/questions { questions: [{ question, answers }] } : propose des questions (JWT),
 *   mises en attente de validation
 * - GET /quizz/topics/:topicId/mine : nombre de questions proposées par le joueur sur ce thème, par état (JWT)
 * - GET /quizz/pending : questions en attente (administrateur)
 * - PUT /quizz/questions/:id { status: "approved" | "rejected", question?, answers? } : valide (en corrigeant
 *   au besoin) ou refuse une question (administrateur)
 */
const router = Router();
const db = createDb(pool);
const quizz = new QuizzRepository(db);

const submitLimiter = rateLimit({windowMs: 60 * 60 * 1000, limit: 20, standardHeaders: "draft-7", legacyHeaders: false,
    message: {status: "error", message: "Beaucoup d'envois d'un coup, réessaie dans une heure"}});

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const topicOf = (req: Request): string | null => {
    const id = String(req.params.topicId);
    return isQuizzTopic(id) ? id : null;
};

router.get("/topics/:topicId/questions", asyncHandler(async (req: Request, res: Response) => {
    const topic = topicOf(req);
    if (!topic) return void res.status(404).json({status: "error", message: "Thème introuvable"});
    res.status(200).json({status: "ok", data: await quizz.approved(topic)});
}));

router.post("/topics/:topicId/questions", requireAuth, submitLimiter,
    asyncHandler(async (req: Request, res: Response<unknown, AuthLocals>) => {
        const topic = topicOf(req);
        if (!topic) return void res.status(404).json({status: "error", message: "Thème introuvable"});
        const questions = parseQuestions(req.body);
        if (typeof questions === "string") return void res.status(400).json({status: "error", message: questions});
        await quizz.submit(res.locals.userId!, topic, questions);
        res.status(201).json({status: "ok", data: {count: questions.length}});
    }));

router.get("/topics/:topicId/mine", requireAuth, asyncHandler(async (req: Request, res: Response<unknown, AuthLocals>) => {
    const topic = topicOf(req);
    if (!topic) return void res.status(404).json({status: "error", message: "Thème introuvable"});
    res.status(200).json({status: "ok", data: await quizz.mine(res.locals.userId!, topic)});
}));

router.get("/pending", requireAuth, requireAdmin(db), asyncHandler(async (_req: Request, res: Response) => {
    res.status(200).json({status: "ok", data: await quizz.pending()});
}));

router.put("/questions/:id", requireAuth, requireAdmin(db), asyncHandler(async (req: Request, res: Response<unknown, AuthLocals>) => {
    const id = String(req.params.id);
    if (!UUID.test(id)) return void res.status(404).json({status: "error", message: "Question introuvable"});
    const review = parseReview(req.body);
    if (typeof review === "string") return void res.status(400).json({status: "error", message: review});
    const found = await quizz.review(id, res.locals.userId!, review);
    if (!found) return void res.status(404).json({status: "error", message: "Question introuvable ou déjà traitée"});
    res.status(200).json({status: "ok", data: null});
}));

export default router;
