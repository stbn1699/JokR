import {Router, type Request, type Response} from "express";
import {rateLimit} from "express-rate-limit";
import {pool} from "../db/pool.js";
import {createDb} from "../db/kysely.js";
import {asyncHandler} from "../AsyncRouteHandlerMiddleware.js";
import {requireAuth, type AuthLocals} from "../middleware/auth.js";
import {requireAdmin} from "../middleware/admin.js";
import {QuizzRepository} from "../repository/Quizz.repository.js";
import {QuizzThemesRepository} from "../repository/QuizzThemes.repository.js";
import {readWikiArticle} from "../services/wikipedia.js";
import {QuizzDuelsRepository} from "../repository/QuizzDuels.repository.js";
import {FriendsRepository} from "../repository/Friends.repository.js";
import {isQuizzTopic, parseQuestions, parseReport, parseReportReview, parseReview, QUIZZ_TOPIC_CATEGORIES, QUIZZ_TOPIC_NAMES} from "../utils/quizz.js";
import {QuizzGamesRepository} from "../repository/QuizzGames.repository.js";
import {parseGameStart} from "../utils/quizzGames.js";
import {QuizzReportsRepository} from "../repository/QuizzReports.repository.js";
import {parseAnswer, parseAnswers, parseDuelQuestions, ROUNDS} from "../utils/quizzDuel.js";
import {mixKind, mixName} from "../utils/quizzMixes.js";
import {THEME_DRAFTS_MAX, parseDraft, themeProblems} from "../utils/quizzThemes.js";

/*
 * Questions du Quizz (table quizz_questions : celles du site et celles proposées par les joueurs)
 * - GET /quizz/counts : nombre de questions validées par thème (ouvert à tous : cartes de la page Quizz)
 * - GET /quizz/topics/:topicId/questions : questions validées du thème (ouvert à tous : les questions des parties)
 * - GET /quizz/questions?topics=a,b,c : questions validées de plusieurs thèmes, par thème (mélanges de thèmes)
 * - POST /quizz/topics/:topicId/questions { questions: [{ question, answers }] } : propose des questions (JWT),
 *   mises en attente de validation
 * - GET /quizz/topics/:topicId/mine : nombre de questions proposées par le joueur sur ce thème, par état (JWT)
 * - GET /quizz/pending : questions en attente (administrateur)
 * - PUT /quizz/questions/:id { status: "approved" | "rejected", question?, answers? } : valide (en corrigeant
 *   au besoin) ou refuse une question (administrateur)
 *
 * Statistiques : toutes les parties et toutes les réponses (voir utils/quizzGames.ts ; JWT)
 * - POST /quizz/games { topicId, mode, duelId?, questions } : début d'une partie ({ id })
 * - POST /quizz/games/:id/answer { round, index, ms } : une réponse, dès qu'elle est donnée ; à la dernière,
 *   la récompense de la partie { reward: { xp, credits } | null } (voir quizzReward)
 * - GET /quizz/topics/:topicId/solo : record solo du joueur sur ce thème ou ce mélange ({ best, games })
 *
 * Questions contestées en fin de partie (« la réponse me semble fausse »)
 * - POST /quizz/reports { topicId, question, answers, picked, reason } : conteste une question jouée (JWT)
 * - GET /quizz/reports : questions contestées à examiner, regroupées (administrateur)
 * - PUT /quizz/reports/review { topicId, question, status: "fixed" | "dismissed", edit? } : décision (administrateur)
 *
 * Thèmes créés par les joueurs (voir utils/quizzThemes.ts)
 * - GET /quizz/themes : thèmes validés (ouvert à tous)
 * - GET /quizz/wiki?url= : titre, description et introduction d'un article de Wikipédia (JWT, aperçu)
 * - GET /quizz/my-themes : mes thèmes ; POST /quizz/my-themes { brouillon } : nouveau brouillon (JWT)
 * - GET | PUT | DELETE /quizz/my-themes/:id : reprendre, enregistrer, supprimer un brouillon (JWT, auteur)
 * - POST /quizz/my-themes/:id/submit { brouillon } : soumettre (tout doit être bon ; JWT, auteur)
 * - GET /quizz/themes/pending, PUT /quizz/themes/:id/review { status } : validation (administrateur)
 *
 * Duels (voir utils/quizzDuel.ts ; JWT). Sur un thème, ou un mélange de thèmes (utils/quizzMixes.ts) : chaque
 * question dit alors de quel thème elle vient
 * - POST /quizz/duels { topicId, questions, answers?, friend?, gameId? } : nouveau duel (gameId : la partie
 *   enregistrée pour les statistiques, liée au duel). Avec `answers` (partie déjà jouée) :
 *   chacun son tour, contre `friend` (pseudo d'un·e ami·e) ou au hasard ; sans : en direct contre `friend`
 * - POST /quizz/topics/:topicId/duels/random : prend un duel au hasard qui attend un adversaire ({ id } ou null)
 * - GET /quizz/topics/:topicId/duels : mes duels sur ce thème (à jouer, en attente, récents, bilan)
 * - GET /quizz/duels/:id : un duel (joueurs, questions, réponses visibles) ; POST /quizz/duels/:id/join : entrer
 *   dans le salon (en direct) ; POST /quizz/duels/:id/answer { round, index, ms } : une réponse (en direct) ;
 *   POST /quizz/duels/:id/answers { answers } : sa partie (chacun son tour) ; POST /quizz/duels/:id/turns : jouer
 *   sans attendre (le salon devient chacun son tour) ; DELETE /quizz/duels/:id : renoncer (pas encore joué)
 */
const router = Router();
const db = createDb(pool);
const quizz = new QuizzRepository(db);
const themes = new QuizzThemesRepository(db);
const friendships = new FriendsRepository(db);
const topicName = async (id: string) => {
    const mix = mixKind(id);
    return mix ? mixName(mix) : QUIZZ_TOPIC_NAMES[id] ?? await themes.approvedName(id) ?? id;
};
const duels = new QuizzDuelsRepository(db, topicName);
const reports = new QuizzReportsRepository(db);
const games = new QuizzGamesRepository(db);

const submitLimiter = rateLimit({windowMs: 60 * 60 * 1000, limit: 20, standardHeaders: "draft-7", legacyHeaders: false,
    message: {status: "error", message: "Beaucoup d'envois d'un coup, réessaie dans une heure"}});

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Thème du site ou thème validé créé par un joueur
const topicOf = async (req: Request, id = String(req.params.topicId)): Promise<string | null> => {
    if (isQuizzTopic(id)) return id;
    return /^[a-z0-9-]{1,60}$/.test(id) && await themes.approvedName(id) !== null ? id : null;
};

// Thème ou mélange de thèmes où l'on peut jouer un duel
const playableOf = async (req: Request, id = String(req.params.topicId)): Promise<string | null> =>
    mixKind(id) ? id : topicOf(req, id);

// brouillons enregistrés automatiquement toutes les quelques secondes : limite large
const saveLimiter = rateLimit({windowMs: 60 * 60 * 1000, limit: 1500, standardHeaders: "draft-7", legacyHeaders: false,
    message: {status: "error", message: "Beaucoup d'enregistrements, réessaie dans un moment"}});
const wikiLimiter = rateLimit({windowMs: 10 * 60 * 1000, limit: 60, standardHeaders: "draft-7", legacyHeaders: false,
    message: {status: "error", message: "Beaucoup de recherches, réessaie dans quelques minutes"}});

router.get("/counts", asyncHandler(async (_req: Request, res: Response) => {
    res.status(200).json({status: "ok", data: await quizz.approvedCounts()});
}));

router.get("/topics/:topicId/questions", asyncHandler(async (req: Request, res: Response) => {
    const topic = await topicOf(req);
    if (!topic) return void res.status(404).json({status: "error", message: "Thème introuvable"});
    res.status(200).json({status: "ok", data: await quizz.approved(topic)});
}));

router.get("/questions", asyncHandler(async (req: Request, res: Response) => {
    const ids = [...new Set(String(req.query.topics ?? "").split(",").filter(id => /^[a-z0-9-]{1,60}$/.test(id)))].slice(0, 300);
    res.status(200).json({status: "ok", data: await quizz.approvedMany(ids)});
}));

router.post("/topics/:topicId/questions", requireAuth, submitLimiter,
    asyncHandler(async (req: Request, res: Response<unknown, AuthLocals>) => {
        const topic = await topicOf(req);
        if (!topic) return void res.status(404).json({status: "error", message: "Thème introuvable"});
        const questions = parseQuestions(req.body);
        if (typeof questions === "string") return void res.status(400).json({status: "error", message: questions});
        await quizz.submit(res.locals.userId!, topic, questions);
        res.status(201).json({status: "ok", data: {count: questions.length}});
    }));

router.get("/topics/:topicId/mine", requireAuth, asyncHandler(async (req: Request, res: Response<unknown, AuthLocals>) => {
    const topic = await topicOf(req);
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

// ---------- Statistiques : parties et réponses

// une partie : 1 début + 7 réponses
const gameLimiter = rateLimit({windowMs: 60 * 60 * 1000, limit: 2000, standardHeaders: "draft-7", legacyHeaders: false,
    message: {status: "error", message: "Beaucoup de parties d'un coup, réessaie dans un moment"}});

router.post("/games", requireAuth, gameLimiter, asyncHandler(async (req: Request, res: Response<unknown, AuthLocals>) => {
    const game = parseGameStart(req.body);
    if (typeof game === "string") return void res.status(400).json({status: "error", message: game});
    const topic = await playableOf(req, game.topicId);
    if (!topic) return void res.status(404).json(NOT_FOUND);
    // thème d'origine et catégorie de chaque question (un thème seul : le sien ; un mélange : celui de la question)
    const categories = new Map<string, string | null>();
    const sources: { topic: string; category: string }[] = [];
    for (const q of game.questions) {
        const source = mixKind(topic) ? q.topic ?? "" : topic;
        if (!categories.has(source)) {
            const real = source && await topicOf(req, source);
            categories.set(source, real ? QUIZZ_TOPIC_CATEGORIES[source] ?? await themes.approvedCategory(source) : null);
        }
        const category = categories.get(source);
        if (!category) {
            return void res.status(400).json({status: "error", message: "Partie invalide"});
        }
        sources.push({topic: source, category});
    }
    const id = await games.start(res.locals.userId!, game, sources);
    res.status(201).json({status: "ok", data: {id}});
}));

router.post("/games/:id/answer", requireAuth, gameLimiter, asyncHandler(async (req: Request, res: Response<unknown, AuthLocals>) => {
    const id = String(req.params.id);
    const round = (req.body as { round?: unknown } | undefined)?.round;
    const answer = parseAnswer(req.body);
    if (!UUID.test(id) || !Number.isInteger(round) || (round as number) < 0 || (round as number) >= ROUNDS || !answer) {
        return void res.status(400).json({status: "error", message: "Réponse invalide"});
    }
    const result = await games.answer(id, res.locals.userId!, round as number, answer);
    if (!result) return void res.status(409).json({status: "error", message: "Réponse inattendue"});
    // dernière réponse : la récompense versée (XP et crédits), ou null
    res.status(200).json({status: "ok", data: result});
}));

router.get("/topics/:topicId/solo", requireAuth, asyncHandler(async (req: Request, res: Response<unknown, AuthLocals>) => {
    const topic = await playableOf(req);
    if (!topic) return void res.status(404).json(NOT_FOUND);
    res.status(200).json({status: "ok", data: await games.soloRecord(res.locals.userId!, topic)});
}));

// ---------- Questions contestées

const reportLimiter = rateLimit({windowMs: 60 * 60 * 1000, limit: 30, standardHeaders: "draft-7", legacyHeaders: false,
    message: {status: "error", message: "Beaucoup de contestations d'un coup, réessaie dans une heure"}});

router.post("/reports", requireAuth, reportLimiter, asyncHandler(async (req: Request, res: Response<unknown, AuthLocals>) => {
    const report = parseReport(req.body);
    if (typeof report === "string") return void res.status(400).json({status: "error", message: report});
    if (!await topicOf(req, report.topicId)) return void res.status(404).json({status: "error", message: "Thème introuvable"});
    await reports.report(res.locals.userId!, report);
    res.status(201).json({status: "ok", data: null});
}));

router.get("/reports", requireAuth, requireAdmin(db), asyncHandler(async (_req: Request, res: Response) => {
    res.status(200).json({status: "ok", data: await reports.pending()});
}));

router.put("/reports/review", requireAuth, requireAdmin(db), asyncHandler(async (req: Request, res: Response<unknown, AuthLocals>) => {
    const review = parseReportReview(req.body);
    if (typeof review === "string") return void res.status(400).json({status: "error", message: review});
    const done = await reports.review(res.locals.userId!, review, topicName);
    if (done === "not_editable") {
        return void res.status(400).json({status: "error", message: "Cette question n'est plus en base telle quelle : marque-la corrigée sans la modifier"});
    }
    if (done === 0) return void res.status(404).json({status: "error", message: "Contestation introuvable ou déjà traitée"});
    res.status(200).json({status: "ok", data: {count: done}});
}));

// ---------- Thèmes créés par les joueurs

const NOT_FOUND = {status: "error", message: "Thème introuvable"};

router.get("/themes", asyncHandler(async (_req: Request, res: Response) => {
    res.status(200).json({status: "ok", data: await themes.approved()});
}));

router.get("/wiki", requireAuth, wikiLimiter, asyncHandler(async (req: Request, res: Response) => {
    const article = await readWikiArticle(String(req.query.url ?? ""));
    if (!article) {
        return void res.status(404).json({status: "error",
            message: "Article de Wikipédia introuvable : colle l'adresse d'un article (https://fr.wikipedia.org/wiki/…)"});
    }
    res.status(200).json({status: "ok", data: article});
}));

router.get("/my-themes", requireAuth, asyncHandler(async (_req: Request, res: Response<unknown, AuthLocals>) => {
    res.status(200).json({status: "ok", data: await themes.mine(res.locals.userId!)});
}));

router.post("/my-themes", requireAuth, saveLimiter, asyncHandler(async (req: Request, res: Response<unknown, AuthLocals>) => {
    const created = await themes.create(res.locals.userId!, parseDraft(req.body));
    if (created === "limit") {
        return void res.status(400).json({status: "error", message: `${THEME_DRAFTS_MAX} thèmes en cours au plus : termine ou supprime un brouillon`});
    }
    res.status(201).json({status: "ok", data: created});
}));

router.get("/my-themes/:id", requireAuth, asyncHandler(async (req: Request, res: Response<unknown, AuthLocals>) => {
    const id = String(req.params.id);
    const theme = UUID.test(id) ? await themes.get(res.locals.userId!, id) : null;
    if (!theme) return void res.status(404).json(NOT_FOUND);
    res.status(200).json({status: "ok", data: theme});
}));

router.put("/my-themes/:id", requireAuth, saveLimiter, asyncHandler(async (req: Request, res: Response<unknown, AuthLocals>) => {
    const id = String(req.params.id);
    const saved = UUID.test(id) ? await themes.save(res.locals.userId!, id, parseDraft(req.body)) : null;
    if (!saved) return void res.status(404).json({status: "error", message: "Brouillon introuvable ou déjà soumis"});
    res.status(200).json({status: "ok", data: saved});
}));

router.delete("/my-themes/:id", requireAuth, asyncHandler(async (req: Request, res: Response<unknown, AuthLocals>) => {
    const id = String(req.params.id);
    if (!UUID.test(id) || !await themes.remove(res.locals.userId!, id)) return void res.status(404).json(NOT_FOUND);
    res.status(200).json({status: "ok", data: null});
}));

router.post("/my-themes/:id/submit", requireAuth, saveLimiter, asyncHandler(async (req: Request, res: Response<unknown, AuthLocals>) => {
    const id = String(req.params.id);
    if (!UUID.test(id) || !await themes.get(res.locals.userId!, id)) return void res.status(404).json(NOT_FOUND);
    const draft = parseDraft(req.body);
    // le brouillon est d'abord enregistré : rien n'est perdu si la soumission est refusée
    if (!await themes.save(res.locals.userId!, id, draft)) {
        return void res.status(400).json({status: "error", message: "Ce thème est déjà soumis"});
    }
    const wiki = draft.wikiUrl ? await readWikiArticle(draft.wikiUrl) : null;
    const problems = themeProblems(draft, wiki !== null);
    if (problems.length > 0 || !wiki) return void res.status(400).json({status: "error", message: problems.join(" · ")});
    if (await themes.nameTaken(id, draft.name)) return void res.status(400).json({status: "error", message: "Un thème porte déjà ce nom"});
    await themes.submit(res.locals.userId!, id, draft, wiki);
    res.status(200).json({status: "ok", data: null});
}));

router.get("/themes/pending", requireAuth, requireAdmin(db), asyncHandler(async (_req: Request, res: Response) => {
    res.status(200).json({status: "ok", data: await themes.pending()});
}));

router.put("/themes/:id/review", requireAuth, requireAdmin(db), asyncHandler(async (req: Request, res: Response<unknown, AuthLocals>) => {
    const id = String(req.params.id);
    const status = req.body?.status;
    if (status !== "approved" && status !== "rejected") {
        return void res.status(400).json({status: "error", message: "Choisis « Valider » ou « Refuser »"});
    }
    const done = UUID.test(id) ? await themes.review(id, res.locals.userId!, status) : false;
    if (done === "taken") return void res.status(400).json({status: "error", message: "Un thème validé porte déjà ce nom"});
    if (!done) return void res.status(404).json({status: "error", message: "Thème introuvable ou déjà traité"});
    res.status(200).json({status: "ok", data: null});
}));

// ---------- Duels

const duelLimiter = rateLimit({windowMs: 60 * 60 * 1000, limit: 120, standardHeaders: "draft-7", legacyHeaders: false,
    message: {status: "error", message: "Beaucoup de duels d'un coup, réessaie dans un moment"}});
const DUEL_NOT_FOUND = {status: "error", message: "Duel introuvable"};

router.post("/duels", requireAuth, duelLimiter, asyncHandler(async (req: Request, res: Response<unknown, AuthLocals>) => {
    const me = res.locals.userId!;
    const body = (req.body ?? {}) as Record<string, unknown>;
    const topic = typeof body.topicId === "string" ? await playableOf(req, body.topicId) : null;
    if (!topic) return void res.status(404).json(NOT_FOUND);
    const questions = parseDuelQuestions(body.questions);
    const answers = body.answers === undefined ? null : parseAnswers(body.answers);
    if (!questions || (body.answers !== undefined && !answers)) {
        return void res.status(400).json({status: "error", message: "Partie invalide"});
    }
    // mélange : chaque question vient d'un vrai thème
    if (mixKind(topic)) {
        const sources = [...new Set(questions.map(q => q.topic ?? ""))];
        for (const source of sources) {
            if (!source || !await topicOf(req, source)) return void res.status(400).json({status: "error", message: "Partie invalide"});
        }
    }
    let friendId: string | null = null;
    if (body.friend !== undefined) {
        const id = typeof body.friend === "string" ? await friendships.findUserId(body.friend) : undefined;
        if (!id || await friendships.relation(me, id) !== "friends") {
            return void res.status(400).json({status: "error", message: "Tu ne peux défier que tes ami·e·s"});
        }
        friendId = id;
    } else if (!answers) {
        return void res.status(400).json({status: "error", message: "Le duel en direct se joue contre un·e ami·e"});
    }
    const id = await duels.create(me, {topicId: topic, questions, answers, friendId});
    if (typeof body.gameId === "string" && UUID.test(body.gameId)) await games.linkDuel(body.gameId, me, id);
    res.status(201).json({status: "ok", data: {id}});
}));

router.post("/topics/:topicId/duels/random", requireAuth, duelLimiter, asyncHandler(async (req: Request, res: Response<unknown, AuthLocals>) => {
    const topic = await playableOf(req);
    if (!topic) return void res.status(404).json(NOT_FOUND);
    const id = await duels.claimRandom(res.locals.userId!, topic);
    res.status(200).json({status: "ok", data: id ? {id} : null});
}));

router.get("/topics/:topicId/duels", requireAuth, asyncHandler(async (req: Request, res: Response<unknown, AuthLocals>) => {
    const topic = await playableOf(req);
    if (!topic) return void res.status(404).json(NOT_FOUND);
    res.status(200).json({status: "ok", data: await duels.mine(res.locals.userId!, topic)});
}));

router.get("/duels/:id", requireAuth, asyncHandler(async (req: Request, res: Response<unknown, AuthLocals>) => {
    const id = String(req.params.id);
    const duel = UUID.test(id) ? await duels.view(id, res.locals.userId!) : undefined;
    if (!duel) return void res.status(404).json(DUEL_NOT_FOUND);
    res.status(200).json({status: "ok", data: {...duel, topicName: await topicName(duel.topicId)}});
}));

router.post("/duels/:id/join", requireAuth, asyncHandler(async (req: Request, res: Response<unknown, AuthLocals>) => {
    const id = String(req.params.id);
    if (!UUID.test(id) || !await duels.join(id, res.locals.userId!)) {
        return void res.status(409).json({status: "error", message: "Le salon est fermé : ton ami·e n'y est plus"});
    }
    res.status(200).json({status: "ok", data: null});
}));

router.post("/duels/:id/answer", requireAuth, asyncHandler(async (req: Request, res: Response<unknown, AuthLocals>) => {
    const id = String(req.params.id);
    const round = (req.body as { round?: unknown } | undefined)?.round;
    const answer = parseAnswer(req.body);
    if (!UUID.test(id) || !Number.isInteger(round) || (round as number) < 0 || (round as number) >= ROUNDS || !answer) {
        return void res.status(400).json({status: "error", message: "Réponse invalide"});
    }
    if (!await duels.answer(id, res.locals.userId!, round as number, answer)) {
        return void res.status(409).json({status: "error", message: "Réponse inattendue"});
    }
    res.status(200).json({status: "ok", data: null});
}));

router.post("/duels/:id/answers", requireAuth, asyncHandler(async (req: Request, res: Response<unknown, AuthLocals>) => {
    const id = String(req.params.id);
    const answers = parseAnswers((req.body as { answers?: unknown } | undefined)?.answers);
    if (!UUID.test(id) || !answers) return void res.status(400).json({status: "error", message: "Partie invalide"});
    if (!await duels.submit(id, res.locals.userId!, answers)) {
        return void res.status(409).json({status: "error", message: "Ce duel est déjà joué"});
    }
    res.status(200).json({status: "ok", data: null});
}));

router.post("/duels/:id/turns", requireAuth, asyncHandler(async (req: Request, res: Response<unknown, AuthLocals>) => {
    const id = String(req.params.id);
    if (!UUID.test(id) || !await duels.toTurns(id, res.locals.userId!)) {
        return void res.status(409).json({status: "error", message: "La partie a déjà commencé"});
    }
    res.status(200).json({status: "ok", data: null});
}));

router.delete("/duels/:id", requireAuth, asyncHandler(async (req: Request, res: Response<unknown, AuthLocals>) => {
    const id = String(req.params.id);
    if (!UUID.test(id) || !await duels.cancel(id, res.locals.userId!)) return void res.status(404).json(DUEL_NOT_FOUND);
    res.status(200).json({status: "ok", data: null});
}));

export default router;

