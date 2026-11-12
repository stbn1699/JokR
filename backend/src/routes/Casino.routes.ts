import {Router, type Request, type Response} from "express";
import {randomInt} from "node:crypto";
import {rateLimit} from "express-rate-limit";
import {pool} from "../db/pool.js";
import {createDb} from "../db/kysely.js";
import {asyncHandler} from "../AsyncRouteHandlerMiddleware.js";
import {requireAuth, type AuthLocals} from "../middleware/auth.js";
import {CasinoRepository} from "../repository/Casino.repository.js";
import {DEFAULT_PLINKO_RISK, isPlinkoBet, isPlinkoRisk, plinkoMultiplier, plinkoPayout, simulatePlinko} from "../utils/plinko.js";
import {
    parseRouletteBets,
    ROULETTE_MAX_PER_BET,
    ROULETTE_MAX_TOTAL,
    rouletteBettingOpen,
    rouletteClosesAt,
    rouletteEndsAt,
    roulettePayout,
    rouletteRoundAt,
} from "../utils/roulette.js";
import {HISTORY_SIZE, LiveRouletteRepository} from "../repository/LiveRoulette.repository.js";
import {maintenance, MAINTENANCE_MESSAGE} from "../services/maintenance.js";
import {LotteryRepository} from "../repository/Lottery.repository.js";
import {LOTTERY_KINDS, LOTTERY_PERCENT, LOTTERY_TICKET_CREDITS, lotteryPeriod, lotteryPrize, lotteryTickets, nextLotteryDraw} from "../utils/lottery.js";

/*
 * Jeux de hasard (JWT requis)
 * - POST /casino/plinko { bet, risk? } : mise des crédits sur une bille, avec le tableau de gains choisi
 *   (risk : low, medium ou high, medium par défaut, voir PLINKO_TABLES). Le serveur tire une graine, simule la
 *   chute (backend/src/utils/plinko.ts), paie le gain et renvoie la graine : le site rejoue la même chute.
 *   → { seed, slot, multiplier, payout, credits } (credits : solde après la mise et le gain)
 * - GET /casino/plinko/live : billes des autres joueurs ces dernières secondes (le site les montre en fond)
 *   → { drops: [{ id, seed, slot, bet, payout, username, ago, ball, friend }], players } (friend : un ami du joueur)
 * - Roulette en direct (une table commune, un tour toutes les 30 s, voir backend/src/utils/roulette.ts) :
 *   - GET /casino/roulette/live : tour en cours, numéro (une fois les mises fermées), jetons de chacun,
 *     derniers numéros, derniers tours du joueur (mine : numéro, mise, gain et détail des mises, autant que de
 *     numéros), solde du joueur et heure du serveur (le site cale la roue dessus)
 *   - POST /casino/roulette/bets { bets: [{ key, amount }] } : pose des jetons sur le tour en cours
 *   - DELETE /casino/roulette/bets : retire tous ses jetons du tour en cours
 *   Le tirage et le paiement sont faits par services/rouletteScheduler.ts.
 * - GET /casino/lottery : les trois loteries (jour, semaine, mois, voir backend/src/utils/lottery.ts) →
 *   [{ kind, drawAt, periodStart, percent, totalBet, prize, totalTickets, players, myBet, myTickets, nextTicketIn,
 *   winners: [{ date, username, prize, tickets, totalTickets }] }] (prize : ce que gagnerait le gagnant maintenant)
 *   Les tirages sont faits par services/lotteryScheduler.ts.
 * Mise à jour en préparation (services/maintenance.ts) : plus de bille de Plinko, et plus de mise à la roulette
 * après le tour en cours au moment de la coupure (503, code « maintenance »).
 */
const router = Router();
const db = createDb(pool);
const casino = new CasinoRepository(db);
const liveRoulette = new LiveRouletteRepository(db);
const lottery = new LotteryRepository(db);

// Une bille toutes les ~0,3 s au plus, en moyenne sur une minute
const dropLimiter = rateLimit({windowMs: 60 * 1000, limit: 200, standardHeaders: "draft-7", legacyHeaders: false,
    message: {status: "error", message: "Doucement ! Attends un peu avant de relancer"}});

router.use(requireAuth);

// Une bille met au plus 8 s à tomber : on ne renvoie que celles encore en l'air
const PLINKO_LIVE_MS = 8000;

router.get("/plinko/live", asyncHandler(async (_req: Request, res: Response<unknown, AuthLocals>) => {
    res.status(200).json({status: "ok", data: await casino.recentPlinko(res.locals.userId!, PLINKO_LIVE_MS)});
}));

router.post("/plinko", dropLimiter, asyncHandler(async (req: Request, res: Response<unknown, AuthLocals>) => {
    const bet: unknown = req.body?.bet;
    if (!isPlinkoBet(bet)) return void res.status(400).json({status: "error", message: "Mise invalide"});
    const risk: unknown = req.body?.risk ?? DEFAULT_PLINKO_RISK;
    if (!isPlinkoRisk(risk)) return void res.status(400).json({status: "error", message: "Tableau inconnu"});
    if (maintenance.blocksNewGames()) return void res.status(503).json({status: "error", code: "maintenance", message: MAINTENANCE_MESSAGE});

    // mode admin : la bille tombe pour de vrai, mais rien n'est retiré, gagné ni enregistré (invisible des autres)
    if (res.locals.ghost) {
        const seed = randomInt(0, 2 ** 32);
        const {slot} = simulatePlinko(seed);
        const credits = await liveRoulette.credits(res.locals.userId!);
        return void res.status(200).json({status: "ok", data: {seed, slot, multiplier: plinkoMultiplier(slot, risk), payout: plinkoPayout(bet, slot, risk), credits}});
    }

    const result = await casino.play(res.locals.userId!, "plinko", bet, () => {
        const seed = randomInt(0, 2 ** 32);
        const {slot} = simulatePlinko(seed);
        return {seed, outcome: slot, payout: plinkoPayout(bet, slot, risk)};
    });
    if (!result.ok || !result.draw) {
        const credits = !result.ok && result.reason === "credits";
        return void res.status(credits ? 402 : 404).json({status: "error", message: credits ? "Pas assez de crédits" : "Compte introuvable"});
    }

    const {seed, outcome: slot, payout} = result.draw;
    res.status(200).json({status: "ok", data: {seed, slot, multiplier: plinkoMultiplier(slot, risk), payout, credits: result.credits}});
}));

const CLOSED_MESSAGE = "Les mises de ce tour sont fermées, attends le prochain";

// Tour en cours, jetons de chacun, derniers numéros, derniers tours du joueur et solde
router.get("/roulette/live", asyncHandler(async (_req: Request, res: Response<unknown, AuthLocals>) => {
    const now = Date.now();
    const round = rouletteRoundAt(now);
    const open = rouletteBettingOpen(round, now);
    // mises fermées : le numéro est tiré ici s'il ne l'est pas encore (le planificateur le fait aussi)
    const number = open ? null : await liveRoulette.close(round);
    const [bets, history, mine, credits] = await Promise.all([
        liveRoulette.bets(round),
        liveRoulette.history(open ? round - 1 : round),
        liveRoulette.myRounds(res.locals.userId!, open ? round - 1 : round, HISTORY_SIZE),
        liveRoulette.credits(res.locals.userId!),
    ]);

    // un joueur par ligne : ses mises (total et jetons posés, dans l'ordre), son total et, une fois le tour tiré, son gain
    const players = new Map<string, { username: string; avatar: string; level: number; mine: boolean; total: number; payout: number; bets: Map<string, number[]> }>();
    for (const b of bets) {
        // jetons posés en mode admin : visibles seulement par leur auteur
        if (b.ghost && b.user_id !== res.locals.userId) continue;
        const p = players.get(b.user_id) ?? {
            username: b.username, avatar: b.avatar, level: b.user_level, mine: b.user_id === res.locals.userId, total: 0, payout: 0, bets: new Map(),
        };
        p.total += b.amount;
        p.bets.set(b.key, [...p.bets.get(b.key) ?? [], b.amount]);
        if (number !== null) p.payout += roulettePayout([{key: b.key, amount: b.amount}], number);
        players.set(b.user_id, p);
    }

    res.status(200).json({
        status: "ok", data: {
            now, round, closesAt: rouletteClosesAt(round), endsAt: rouletteEndsAt(round), number, credits,
            history,
            mine,
            players: [...players.values()].map(p => ({
                username: p.username, avatar: p.avatar, level: p.level, mine: p.mine, total: p.total,
                payout: number === null ? null : p.payout,
                bets: [...p.bets].map(([key, chips]) => ({key, amount: chips.reduce((sum, c) => sum + c, 0), chips})),
            })),
        },
    });
}));

// Pose des jetons sur le tour en cours (crédits retirés tout de suite) → { credits }
router.post("/roulette/bets", dropLimiter, asyncHandler(async (req: Request, res: Response<unknown, AuthLocals>) => {
    const bets = parseRouletteBets(req.body?.bets);
    if (typeof bets === "string") return void res.status(400).json({status: "error", message: bets});
    const now = Date.now();
    const round = rouletteRoundAt(now);
    if (!rouletteBettingOpen(round, now)) return void res.status(409).json({status: "error", message: CLOSED_MESSAGE});
    if (maintenance.blocksRound(round)) return void res.status(503).json({status: "error", code: "maintenance", message: MAINTENANCE_MESSAGE});

    const result = await liveRoulette.place(res.locals.userId!, round, bets, res.locals.ghost === true);
    if (!result.ok) {
        const [status, message] = result.reason === "closed" ? [409, CLOSED_MESSAGE]
            : result.reason === "credits" ? [402, "Pas assez de crédits"]
            : result.reason === "limit" ? [400, `${ROULETTE_MAX_PER_BET} crédits au plus par case et ${ROULETTE_MAX_TOTAL} par tour`]
            : [404, "Compte introuvable"];
        return void res.status(status).json({status: "error", message});
    }
    res.status(200).json({status: "ok", data: {round, credits: result.credits}});
}));

// Retire tous ses jetons du tour en cours (tant que les mises sont ouvertes) → { credits }
router.delete("/roulette/bets", asyncHandler(async (_req: Request, res: Response<unknown, AuthLocals>) => {
    const now = Date.now();
    const round = rouletteRoundAt(now);
    const credits = rouletteBettingOpen(round, now) ? await liveRoulette.cancel(res.locals.userId!, round) : null;
    if (credits === null) return void res.status(409).json({status: "error", message: CLOSED_MESSAGE});
    res.status(200).json({status: "ok", data: {credits}});
}));

// Loteries : mises, tickets et cagnotte de la période en cours, mes chances, et derniers gagnants
const LOTTERY_WINNERS = 5;
router.get("/lottery", asyncHandler(async (_req: Request, res: Response<unknown, AuthLocals>) => {
    const now = Date.now();
    const me = res.locals.userId!;
    const data = await Promise.all(LOTTERY_KINDS.map(async kind => {
        const drawAt = nextLotteryDraw(kind, now);
        const {start} = lotteryPeriod(kind, drawAt);
        const [bets, winners] = await Promise.all([lottery.betsByUser(start, now), lottery.recentWinners(kind, LOTTERY_WINNERS)]);
        const totalBet = bets.reduce((sum, b) => sum + b.bet, 0);
        const myBet = bets.find(b => b.userId === me)?.bet ?? 0;
        return {
            kind, drawAt, periodStart: start, percent: LOTTERY_PERCENT[kind],
            totalBet, prize: lotteryPrize(kind, totalBet),
            totalTickets: bets.reduce((sum, b) => sum + lotteryTickets(b.bet), 0),
            players: bets.filter(b => lotteryTickets(b.bet) > 0).length,
            myBet, myTickets: lotteryTickets(myBet),
            // crédits à miser encore pour un ticket de plus
            nextTicketIn: LOTTERY_TICKET_CREDITS - (myBet % LOTTERY_TICKET_CREDITS),
            winners: winners.map(w => ({date: w.date, username: w.username, prize: w.prize, tickets: w.winner_tickets ?? 0, totalTickets: w.total_tickets})),
        };
    }));
    res.status(200).json({status: "ok", data});
}));

export default router;
