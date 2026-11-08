import {Router, type Request, type Response} from "express";
import {randomInt} from "node:crypto";
import {rateLimit} from "express-rate-limit";
import {pool} from "../db/pool.js";
import {createDb} from "../db/kysely.js";
import {asyncHandler} from "../AsyncRouteHandlerMiddleware.js";
import {requireAuth, type AuthLocals} from "../middleware/auth.js";
import {CasinoRepository} from "../repository/Casino.repository.js";
import {isPlinkoBet, PLINKO_MULTIPLIERS, plinkoPayout, simulatePlinko} from "../utils/plinko.js";

/*
 * Jeux de hasard (JWT requis)
 * - POST /casino/plinko { bet } : mise des crédits sur une bille. Le serveur tire une graine, simule la
 *   chute (backend/src/utils/plinko.ts), paie le gain et renvoie la graine : le site rejoue la même chute.
 *   → { seed, slot, multiplier, payout, credits } (credits : solde après la mise et le gain)
 */
const router = Router();
const casino = new CasinoRepository(createDb(pool));

// Une bille toutes les ~0,3 s au plus, en moyenne sur une minute
const dropLimiter = rateLimit({windowMs: 60 * 1000, limit: 200, standardHeaders: "draft-7", legacyHeaders: false,
    message: {status: "error", message: "Doucement ! Attends un peu avant de relancer"}});

router.use(requireAuth);

router.post("/plinko", dropLimiter, asyncHandler(async (req: Request, res: Response<unknown, AuthLocals>) => {
    const bet: unknown = req.body?.bet;
    if (!isPlinkoBet(bet)) return void res.status(400).json({status: "error", message: "Mise invalide"});

    const result = await casino.play(res.locals.userId!, "plinko", bet, () => {
        const seed = randomInt(0, 2 ** 32);
        const {slot} = simulatePlinko(seed);
        return {seed, outcome: slot, payout: plinkoPayout(bet, slot)};
    });
    if (!result.ok || !result.draw) {
        const credits = !result.ok && result.reason === "credits";
        return void res.status(credits ? 402 : 404).json({status: "error", message: credits ? "Pas assez de crédits" : "Compte introuvable"});
    }

    const {seed, outcome: slot, payout} = result.draw;
    res.status(200).json({status: "ok", data: {seed, slot, multiplier: PLINKO_MULTIPLIERS[slot], payout, credits: result.credits}});
}));

export default router;
