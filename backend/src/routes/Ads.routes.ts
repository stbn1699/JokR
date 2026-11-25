import {Router, type Request, type Response} from "express";
import {rateLimit} from "express-rate-limit";
import {pool} from "../db/pool.js";
import {createDb} from "../db/kysely.js";
import {asyncHandler} from "../AsyncRouteHandlerMiddleware.js";
import {requireAuth, type AuthLocals} from "../middleware/auth.js";
import {config} from "../config.js";
import {AdRewardsRepository} from "../repository/AdRewards.repository.js";
import {LiveRouletteRepository} from "../repository/LiveRoulette.repository.js";
import {AD_REWARD_CREDITS, AD_REWARDS_PER_DAY, adRewardsLeft} from "../utils/adRewards.js";
import {dailyDate, nextDailyChange} from "../utils/dailyDate.js";
import {isUuid} from "../utils/validation.js";

/*
 * Pubs récompensées (voir backend/src/utils/adRewards.ts), JWT requis :
 * - GET /ads/reward → { enabled, client, test, perAd, perDay, left, nextAt }
 *   (enabled : pubs disponibles sur ce serveur ; client : identifiant AdSense, null en dev = fausse pub ;
 *   left : pubs encore possibles aujourd'hui ; nextAt : minuit, heure de Paris)
 * - POST /ads/reward/start → { ticket } juste avant la pub ; 409 si plus de pub aujourd'hui
 * - POST /ads/reward/claim { ticket } après la pub regardée → { credits, creditsWon, left } (solde après le gain) ;
 *   409 si plus de pub aujourd'hui, 400 si le ticket est inconnu, déjà payé, trop récent ou trop vieux
 * Mode admin : la pub se lance, mais rien n'est donné ni enregistré.
 */
const router = Router();
const db = createDb(pool);
const ads = new AdRewardsRepository(db);
const liveRoulette = new LiveRouletteRepository(db);

const GHOST_TICKET = "ghost";

const adLimiter = rateLimit({windowMs: 60 * 1000, limit: 20, standardHeaders: "draft-7", legacyHeaders: false,
    message: {status: "error", message: "Doucement ! Attends un peu avant de relancer une pub"}});

router.use(requireAuth);

const DISABLED = "Les pubs ne sont pas disponibles pour l'instant";
const LIMIT = "Plus de pub aujourd'hui, reviens demain !";

router.get("/reward", asyncHandler(async (_req: Request, res: Response<unknown, AuthLocals>) => {
    const now = new Date();
    const claimed = res.locals.ghost ? 0 : await ads.claimedOn(res.locals.userId!, dailyDate(now));
    res.status(200).json({status: "ok", data: {
        enabled: config.ads.enabled, client: config.ads.client, test: config.ads.test,
        perAd: AD_REWARD_CREDITS, perDay: AD_REWARDS_PER_DAY, left: adRewardsLeft(claimed), nextAt: nextDailyChange(now).getTime(),
    }});
}));

router.post("/reward/start", adLimiter, asyncHandler(async (_req: Request, res: Response<unknown, AuthLocals>) => {
    if (!config.ads.enabled) return void res.status(503).json({status: "error", message: DISABLED});
    if (res.locals.ghost) return void res.status(200).json({status: "ok", data: {ticket: GHOST_TICKET}});
    const date = dailyDate();
    if (adRewardsLeft(await ads.claimedOn(res.locals.userId!, date)) === 0) {
        return void res.status(409).json({status: "error", message: LIMIT});
    }
    res.status(200).json({status: "ok", data: {ticket: await ads.start(res.locals.userId!, date)}});
}));

router.post("/reward/claim", adLimiter, asyncHandler(async (req: Request, res: Response<unknown, AuthLocals>) => {
    if (!config.ads.enabled) return void res.status(503).json({status: "error", message: DISABLED});
    const ticket: unknown = req.body?.ticket;
    if (res.locals.ghost) {
        const credits = await liveRoulette.credits(res.locals.userId!);
        return void res.status(200).json({status: "ok", data: {credits, creditsWon: 0, left: AD_REWARDS_PER_DAY}});
    }
    if (typeof ticket !== "string" || !isUuid(ticket)) return void res.status(400).json({status: "error", message: "Pub inconnue"});
    const date = dailyDate();
    const result = await ads.claim(res.locals.userId!, ticket, date);
    if (!result.ok) {
        const [status, message] = {
            limit: [409, LIMIT],
            user: [404, "Compte introuvable"],
            ticket: [400, "Pub inconnue ou déjà comptée"],
            "too-soon": [400, "La pub n'a pas été regardée jusqu'au bout"],
            expired: [400, "Pub trop ancienne, relance-en une"],
        }[result.reason] as [number, string];
        return void res.status(status).json({status: "error", message});
    }
    const left = adRewardsLeft(await ads.claimedOn(res.locals.userId!, date));
    res.status(200).json({status: "ok", data: {credits: result.credits, creditsWon: result.creditsWon, left}});
}));

export default router;
