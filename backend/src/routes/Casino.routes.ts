import {Router, type Request, type Response} from "express";
import {randomInt} from "node:crypto";
import {rateLimit} from "express-rate-limit";
import {pool} from "../db/pool.js";
import {createDb} from "../db/kysely.js";
import {asyncHandler} from "../AsyncRouteHandlerMiddleware.js";
import {requireAuth, type AuthLocals} from "../middleware/auth.js";
import {CasinoRepository} from "../repository/Casino.repository.js";
import {DEFAULT_PLINKO_RISK, isPlinkoBet, isPlinkoRisk, PLINKO_RISKS, plinkoMultiplier, plinkoPayout, simulatePlinko} from "../utils/plinko.js";
import {ShopRepository} from "../repository/Shop.repository.js";
import {upgradeValueFor} from "../utils/upgrades.js";
import {
    parseRouletteBets,
    rouletteBettingOpen,
    rouletteClosesAt,
    rouletteEndsAt,
    roulettePayout,
    rouletteRoundAt,
} from "../utils/roulette.js";
import {HISTORY_SIZE, LiveRouletteRepository} from "../repository/LiveRoulette.repository.js";
import {maintenance, MAINTENANCE_MESSAGE} from "../services/maintenance.js";
import {LotteryRepository} from "../repository/Lottery.repository.js";
import {encodeSlotSpin, isSlotBet, isSlotLineCount, isSlotReelCount, SLOT_MACHINES, slotMachine, slotSpin, slotStops} from "../utils/slots.js";
import {wheelAvailable, type WheelItem, WheelRepository} from "../repository/Wheel.repository.js";
import {WHEEL_SEGMENTS, WHEEL_TOTAL_WEIGHT, wheelSegmentFor, wheelTickets} from "../utils/wheel.js";
import {plinkoBallSets} from "../utils/plinkoBalls.js";
import {BlackjackRepository} from "../repository/Blackjack.repository.js";
import {PokerRepository} from "../repository/Poker.repository.js";
import {isPokerBet, isPokerHolds, pokerView} from "../utils/poker.js";
import {encodeKenoDraw, isKenoBet, isKenoPicks, kenoDraw, kenoHits, kenoMultiplier, kenoPayout} from "../utils/keno.js";
import {blackjackView, isBlackjackAction, isBlackjackBet, totalBet, totalPayout} from "../utils/blackjack.js";
import {dailyDate, nextDailyChange} from "../utils/dailyDate.js";
import {LOTTERY_KINDS, LOTTERY_PERCENT, lotteryPeriod, lotteryPrize, nextLotteryDraw} from "../utils/lottery.js";
import {achievements} from "../services/achievements/index.js";
import {blackjackPlayed, kenoPlayed, plinkoDrop, pokerPlayed, rouletteAllIn, slotSpinPlayed, wheelSpun} from "../services/achievements/events.js";

/*
 * Jeux de hasard (JWT requis)
 * Améliorations de la boutique (backend/src/utils/upgrades.ts) : chaque jeu vérifie ce que le joueur a débloqué
 * (colonnes et lignes des machines à sous, tableaux et billes du Plinko, numéros du Keno, limites de la roulette,
 * tours de roue, prix du ticket de loterie) ; 403 sinon. Mode admin : tout est débloqué.
 * - POST /casino/plinko { bet, risk?, count? } : mise des crédits sur `count` billes (1 par défaut, jusqu'à ce que
 *   permet l'amélioration « Billes par lancer »), avec le tableau de gains choisi (risk : low, medium, high ou
 *   extreme, medium par défaut, voir PLINKO_TABLES). Le serveur tire une graine par bille, simule la chute
 *   (backend/src/utils/plinko.ts), paie les gains et renvoie les graines : le site rejoue les mêmes chutes.
 *   Faute de crédits, moins de billes partent.
 *   → { drops: [{ seed, slot, multiplier, payout }], credits } (credits : solde après les mises et les gains)
 * - GET /casino/plinko/live : billes des autres joueurs ces dernières secondes (le site les montre en fond)
 *   → { drops: [{ id, seed, slot, bet, payout, username, ago, ball, friend }], players } (friend : un ami du joueur)
 * - Roulette en direct (une table commune, un tour toutes les 30 s, voir backend/src/utils/roulette.ts) :
 *   - GET /casino/roulette/live : tour en cours, numéro (une fois les mises fermées), jetons de chacun,
 *     derniers numéros, derniers tours du joueur (mine : numéro, mise, gain et détail des mises, autant que de
 *     numéros), solde du joueur et heure du serveur (le site cale la roue dessus)
 *   - POST /casino/roulette/bets { bets: [{ key, amount }], group? } : pose des jetons sur le tour en cours
 *     (group : geste du joueur, un clic, un glisser ou « Reproduire ma mise »)
 *   - DELETE /casino/roulette/bets/last : retire les jetons de son dernier geste et rend les crédits
 *   - DELETE /casino/roulette/bets : retire tous ses jetons du tour en cours
 *   Le tirage et le paiement sont faits par services/rouletteScheduler.ts.
 * - POST /casino/slots/:machine { bet, reels, lines } : un lancer de machine à sous (voir backend/src/utils/slots.ts),
 *   sur 3, 4 ou 5 colonnes et 1, 3, 5 ou 10 lignes de gain. Le serveur tire l'arrêt de chaque rouleau, encaisse la
 *   mise et paie les lignes gagnantes → { stops, grid, wins: [{ line, symbol, count, pays }], payout, credits }
 *   Partie enregistrée sous le jeu « slots » (seed : machine, colonnes, lignes et arrêts ; outcome : lignes gagnantes).
 * - GET /casino/lottery : les trois loteries (jour, semaine, mois, voir backend/src/utils/lottery.ts) →
 *   [{ kind, drawAt, periodStart, percent, totalBet, prize, totalTickets, players, myBet, myTickets, nextTicketIn,
 *   winners: [{ date, username, prize, tickets, totalTickets }] }] (prize : ce que gagnerait le gagnant maintenant)
 *   Les tirages sont faits par services/lotteryScheduler.ts.
 * - Roue du jour (voir backend/src/utils/wheel.ts) : un lancer gratuit par jour (heure de Paris), plus un par
 *   case « relance ».
 *   - GET /casino/wheel → { available, nextAt, today: { segment } | null } (nextAt : minuit ; today : dernier lancer)
 *   - POST /casino/wheel → { segment, credits, level, xp, item, creditsWon, tickets, available } (solde, niveau et
 *     XP après le gain ; item : bille offerte ; tickets : tickets de loterie offerts ; available : encore un lancer
 *     aujourd'hui) ; 409 si plus de lancer.
 *     Mode admin : la roue tourne autant qu'on veut, sans rien donner ni enregistrer.
 * - POST /casino/keno { bet, picks } : une partie de Keno (voir backend/src/utils/keno.ts) avec 1 à 10 numéros choisis
 *   entre 1 et 40 ; 10 numéros sont tirés → { drawn, hits, multiplier, payout, credits } (drawn : dans l'ordre de sortie)
 *   Partie enregistrée sous le jeu « keno » (seed : numéros tirés, un bit chacun ; outcome : numéros trouvés).
 * - Poker à 5 cartes en solo (vidéo poker, voir backend/src/utils/poker.ts) : le paquet reste sur le serveur.
 *   - GET /casino/poker → { hand, recent, credits } (hand : main en cours ou null ; recent : dernières mains finies)
 *   - POST /casino/poker { bet } : donne 5 cartes (mise retirée) → { hand, credits } ; 409 si une main est en cours
 *   - POST /casino/poker/draw { held: [5 booléens] } : remplace les cartes non gardées, paie la main → { hand, credits }
 * - Blackjack en solo (voir backend/src/utils/blackjack.ts) : la main en cours est gardée par le serveur, le site n'en
 *   reçoit que ce que le joueur voit (pas le sabot, ni la carte cachée du croupier avant la fin).
 *   - GET /casino/blackjack → { hand, recent, credits } (hand : main en cours ou null ; recent : dernières mains finies)
 *   - POST /casino/blackjack { bet } : nouvelle main (mise retirée) → { hand, credits } ; 409 si une main est en cours
 *   - POST /casino/blackjack/:action (hit, stand, double, split) → { hand, credits } (doubler, séparer : mise ajoutée)
 *   Main finie : gain versé, partie enregistrée sous le jeu « blackjack » (outcome : nombre de mains).
 * Mise à jour en préparation (services/maintenance.ts) : plus de bille de Plinko, et plus de mise à la roulette
 * après le tour en cours au moment de la coupure (503, code « maintenance »).
 */
const router = Router();
const db = createDb(pool);
const casino = new CasinoRepository(db);
const liveRoulette = new LiveRouletteRepository(db);
const lottery = new LotteryRepository(db);
const wheel = new WheelRepository(db);
const blackjack = new BlackjackRepository(db);
const poker = new PokerRepository(db);
const shop = new ShopRepository(db);

// Améliorations du joueur (mode admin : tout est débloqué)
const upgradesOf = (res: Response<unknown, AuthLocals>) => shop.upgradeLevels(res.locals.userId!, res.locals.ghost === true);
const LOCKED = "Débloque-le d'abord dans la boutique (Améliorations)";

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
    const count: unknown = req.body?.count ?? 1;
    if (typeof count !== "number" || !Number.isInteger(count) || count < 1) {
        return void res.status(400).json({status: "error", message: "Nombre de billes invalide"});
    }
    const upgrades = await upgradesOf(res);
    if (PLINKO_RISKS.indexOf(risk) >= upgradeValueFor(upgrades, "plinko-risk") || count > upgradeValueFor(upgrades, "plinko-balls")) {
        return void res.status(403).json({status: "error", message: LOCKED});
    }
    if (maintenance.blocksNewGames()) return void res.status(503).json({status: "error", code: "maintenance", message: MAINTENANCE_MESSAGE});

    const fall = () => {
        const seed = randomInt(0, 2 ** 32);
        const {slot} = simulatePlinko(seed);
        return {seed, outcome: slot, payout: plinkoPayout(bet, slot, risk)};
    };
    const view = (d: ReturnType<typeof fall>) => ({seed: d.seed, slot: d.outcome, multiplier: plinkoMultiplier(d.outcome, risk), payout: d.payout});

    // mode admin : les billes tombent pour de vrai, mais rien n'est retiré, gagné ni enregistré (invisibles des autres)
    if (res.locals.ghost) {
        const credits = await liveRoulette.credits(res.locals.userId!);
        return void res.status(200).json({status: "ok", data: {drops: Array.from({length: count}, () => view(fall())), credits}});
    }

    const result = await casino.playMany(res.locals.userId!, "plinko", bet, count, fall);
    if (!result.ok) {
        const credits = result.reason === "credits";
        return void res.status(credits ? 402 : 404).json({status: "error", message: credits ? "Pas assez de crédits" : "Compte introuvable"});
    }
    void achievements.track(res.locals.userId, ctx => result.draws.forEach(d => plinkoDrop(ctx, {
        bet, risk, slot: d.outcome, multiplier: plinkoMultiplier(d.outcome, risk), payout: d.payout,
    })));
    res.status(200).json({status: "ok", data: {drops: result.draws.map(view), credits: result.credits}});
}));

// Machines à sous : un lancer
router.post("/slots/:machine", dropLimiter, asyncHandler(async (req: Request, res: Response<unknown, AuthLocals>) => {
    const machine = slotMachine(req.params.machine);
    if (!machine) return void res.status(404).json({status: "error", message: "Machine inconnue"});
    const bet: unknown = req.body?.bet;
    if (!isSlotBet(bet)) return void res.status(400).json({status: "error", message: "Mise invalide"});
    const reels: unknown = req.body?.reels ?? 3;
    const lines: unknown = req.body?.lines ?? 1;
    if (!isSlotReelCount(reels) || !isSlotLineCount(lines)) {
        return void res.status(400).json({status: "error", message: "Nombre de colonnes ou de lignes invalide"});
    }
    const upgrades = await upgradesOf(res);
    if (reels > upgradeValueFor(upgrades, "slots-reels") || lines > upgradeValueFor(upgrades, "slots-lines")) {
        return void res.status(403).json({status: "error", message: LOCKED});
    }
    if (maintenance.blocksNewGames()) return void res.status(503).json({status: "error", code: "maintenance", message: MAINTENANCE_MESSAGE});

    // mode admin : les rouleaux tournent pour de vrai, mais rien n'est retiré, gagné ni enregistré
    if (res.locals.ghost) {
        const stops = slotStops(machine, reels, n => randomInt(n));
        const credits = await liveRoulette.credits(res.locals.userId!);
        return void res.status(200).json({status: "ok", data: {stops, ...slotSpin(machine, stops, bet, lines), credits}});
    }

    let stops: number[] = [];
    const result = await casino.play(res.locals.userId!, "slots", bet, () => {
        stops = slotStops(machine, reels, n => randomInt(n));
        const spin = slotSpin(machine, stops, bet, lines);
        return {seed: encodeSlotSpin(SLOT_MACHINES.indexOf(machine), lines, stops), outcome: spin.wins.length, payout: spin.payout};
    });
    if (!result.ok || !result.draw) {
        const credits = !result.ok && result.reason === "credits";
        return void res.status(credits ? 402 : 404).json({status: "error", message: credits ? "Pas assez de crédits" : "Compte introuvable"});
    }
    const spin = slotSpin(machine, stops, bet, lines);
    void achievements.track(res.locals.userId, ctx => slotSpinPlayed(ctx, {machine, reels, lines, bet, grid: spin.grid, wins: spin.wins, payout: spin.payout}));
    res.status(200).json({status: "ok", data: {stops, ...spin, credits: result.credits}});
}));

// Roue du jour : encore un lancer aujourd'hui ? (en mode admin, toujours)
router.get("/wheel", asyncHandler(async (_req: Request, res: Response<unknown, AuthLocals>) => {
    const now = new Date();
    const [done, upgrades] = await Promise.all([res.locals.ghost ? [] : wheel.spinsOn(res.locals.userId!, dailyDate(now)), upgradesOf(res)]);
    const last = done.at(-1);
    res.status(200).json({status: "ok", data: {
        available: wheelAvailable(done, upgradeValueFor(upgrades, "wheel-spins")), nextAt: nextDailyChange(now).getTime(), today: last === undefined ? null : {segment: last},
    }});
}));

// Bille offerte par la case « cadeau » : une bille de la boutique que le joueur n'a pas encore
function pickWheelBall(owned: Set<string>): WheelItem | null {
    const balls = plinkoBallSets().flatMap(set => set.balls).filter(b => b.price > 0 && !owned.has(b.id));
    if (balls.length === 0) return null;
    const ball = balls[randomInt(balls.length)]!;
    return {id: ball.id, name: ball.name, file: ball.file};
}

router.post("/wheel", asyncHandler(async (_req: Request, res: Response<unknown, AuthLocals>) => {
    const segment = wheelSegmentFor(randomInt(WHEEL_TOTAL_WEIGHT));
    // mode admin : la roue tourne autant qu'on veut, mais rien n'est donné ni enregistré
    if (res.locals.ghost) {
        const credits = await liveRoulette.credits(res.locals.userId!);
        const item = WHEEL_SEGMENTS[segment]!.reward === "item" ? pickWheelBall(new Set()) : null;
        const tickets = wheelTickets(WHEEL_SEGMENTS[segment]!, dailyDate());
        return void res.status(200).json({status: "ok", data: {segment, credits, level: null, xp: null, item, creditsWon: 0, tickets, available: true}});
    }
    const date = dailyDate();
    const daily = upgradeValueFor(await upgradesOf(res), "wheel-spins");
    const result = await wheel.spin(res.locals.userId!, date, segment, pickWheelBall, daily);
    if (!result.ok) {
        return void res.status(result.reason === "already" ? 409 : 404).json({status: "error",
            message: result.reason === "already" ? "Tu as déjà lancé la roue aujourd'hui, reviens demain !" : "Compte introuvable"});
    }
    void achievements.track(res.locals.userId, ctx => wheelSpun(ctx, {segment, creditsWon: result.creditsWon}));
    const available = wheelAvailable(await wheel.spinsOn(res.locals.userId!, date), daily);
    res.status(200).json({status: "ok", data: {segment, credits: result.credits, level: result.level, xp: result.xp,
        item: result.item, creditsWon: result.creditsWon, tickets: result.tickets, available}});
}));

// ---------- Keno
router.post("/keno", dropLimiter, asyncHandler(async (req: Request, res: Response<unknown, AuthLocals>) => {
    const bet: unknown = req.body?.bet;
    const picks: unknown = req.body?.picks;
    if (!isKenoBet(bet)) return void res.status(400).json({status: "error", message: "Mise invalide"});
    const maxPicks = upgradeValueFor(await upgradesOf(res), "keno-picks");
    if (!isKenoPicks(picks, maxPicks)) return void res.status(400).json({status: "error", message: `Choisis de 1 à ${maxPicks} numéros entre 1 et 40`});
    if (maintenance.blocksNewGames()) return void res.status(503).json({status: "error", code: "maintenance", message: MAINTENANCE_MESSAGE});

    const result = (drawn: number[]) => {
        const hits = kenoHits(picks, drawn);
        return {drawn, hits, multiplier: kenoMultiplier(picks.length, hits), payout: kenoPayout(bet, picks.length, hits)};
    };
    // mode admin : le tirage a lieu pour de vrai, mais rien n'est retiré, gagné ni enregistré
    if (res.locals.ghost) {
        const credits = await liveRoulette.credits(res.locals.userId!);
        return void res.status(200).json({status: "ok", data: {...result(kenoDraw(n => randomInt(n))), credits}});
    }
    let drawn: number[] = [];
    const play = await casino.play(res.locals.userId!, "keno", bet, () => {
        drawn = kenoDraw(n => randomInt(n));
        const r = result(drawn);
        return {seed: encodeKenoDraw(drawn), outcome: r.hits, payout: r.payout};
    });
    if (!play.ok) {
        const credits = play.reason === "credits";
        return void res.status(credits ? 402 : 404).json({status: "error", message: credits ? "Pas assez de crédits" : "Compte introuvable"});
    }
    const keno = result(drawn);
    void achievements.track(res.locals.userId, ctx => kenoPlayed(ctx, {bet, picks, hits: keno.hits, payout: keno.payout}));
    res.status(200).json({status: "ok", data: {...keno, credits: play.credits}});
}));

// ---------- Poker à 5 cartes
const POKER_RECENT = 6;

const POKER_ERRORS = {
    user: [404, "Compte introuvable"],
    credits: [402, "Pas assez de crédits"],
    active: [409, "Finis d'abord ta main en cours"],
    none: [404, "Pas de main en cours"],
} as const;

router.get("/poker", asyncHandler(async (_req: Request, res: Response<unknown, AuthLocals>) => {
    const me = res.locals.userId!;
    const [hand, recent, credits] = await Promise.all([poker.active(me), poker.recent(me, POKER_RECENT), liveRoulette.credits(me)]);
    res.status(200).json({status: "ok", data: {
        hand: hand ? pokerView(hand) : null,
        recent: recent.map(s => ({bet: s.bet, payout: s.payout ?? 0, hand: s.hand ?? "nothing"})),
        credits,
    }});
}));

router.post("/poker", dropLimiter, asyncHandler(async (req: Request, res: Response<unknown, AuthLocals>) => {
    const bet: unknown = req.body?.bet;
    if (!isPokerBet(bet)) return void res.status(400).json({status: "error", message: "Mise invalide"});
    if (maintenance.blocksNewGames()) return void res.status(503).json({status: "error", code: "maintenance", message: MAINTENANCE_MESSAGE});
    const result = await poker.deal(res.locals.userId!, bet, res.locals.ghost === true);
    if (!result.ok) {
        const [status, message] = POKER_ERRORS[result.reason];
        return void res.status(status).json({status: "error", message});
    }
    res.status(200).json({status: "ok", data: {hand: pokerView(result.state), credits: result.credits}});
}));

// Une main donnée se finit toujours, même pendant la préparation d'une mise à jour
router.post("/poker/draw", dropLimiter, asyncHandler(async (req: Request, res: Response<unknown, AuthLocals>) => {
    const held: unknown = req.body?.held;
    if (!isPokerHolds(held)) return void res.status(400).json({status: "error", message: "Cartes gardées invalides"});
    const dealt = (await poker.active(res.locals.userId!))?.cards;
    const result = await poker.draw(res.locals.userId!, held);
    if (!result.ok) {
        const [status, message] = POKER_ERRORS[result.reason];
        return void res.status(status).json({status: "error", message});
    }
    if (dealt && !res.locals.ghost) void achievements.track(res.locals.userId, ctx => pokerPlayed(ctx, dealt, result.state));
    res.status(200).json({status: "ok", data: {hand: pokerView(result.state), credits: result.credits}});
}));

// ---------- Blackjack
const BLACKJACK_RECENT = 5;

const BLACKJACK_ERRORS = {
    user: [404, "Compte introuvable"],
    credits: [402, "Pas assez de crédits"],
    active: [409, "Finis d'abord ta main en cours"],
    none: [404, "Pas de main en cours"],
    invalid: [400, "Ce coup n'est pas possible maintenant"],
} as const;

router.get("/blackjack", asyncHandler(async (_req: Request, res: Response<unknown, AuthLocals>) => {
    const me = res.locals.userId!;
    const [hand, recent, credits] = await Promise.all([blackjack.active(me), blackjack.recent(me, BLACKJACK_RECENT), liveRoulette.credits(me)]);
    res.status(200).json({status: "ok", data: {
        hand: hand ? blackjackView(hand) : null,
        recent: recent.map(s => ({bet: totalBet(s), payout: totalPayout(s), outcomes: s.hands.map(h => h.outcome)})),
        credits,
    }});
}));

router.post("/blackjack", dropLimiter, asyncHandler(async (req: Request, res: Response<unknown, AuthLocals>) => {
    const bet: unknown = req.body?.bet;
    if (!isBlackjackBet(bet)) return void res.status(400).json({status: "error", message: "Mise invalide"});
    if (maintenance.blocksNewGames()) return void res.status(503).json({status: "error", code: "maintenance", message: MAINTENANCE_MESSAGE});
    const result = await blackjack.start(res.locals.userId!, bet, res.locals.ghost === true);
    if (!result.ok) {
        const [status, message] = BLACKJACK_ERRORS[result.reason];
        return void res.status(status).json({status: "error", message});
    }
    void achievements.track(res.locals.userId, ctx => {
        ctx.mem.blackjackActions = [];
        ctx.mem.blackjackBet = bet;
        // main finie dès la donne (blackjack du joueur ou du croupier)
        if (result.state.finished) blackjackPlayed(ctx, result.state, null, [], bet);
    });
    res.status(200).json({status: "ok", data: {hand: blackjackView(result.state), credits: result.credits}});
}));

// Une main commencée se finit toujours, même pendant la préparation d'une mise à jour
router.post("/blackjack/:action", dropLimiter, asyncHandler(async (req: Request, res: Response<unknown, AuthLocals>) => {
    const action = req.params.action;
    if (!isBlackjackAction(action)) return void res.status(404).json({status: "error", message: "Coup inconnu"});
    const before = await blackjack.active(res.locals.userId!);
    const result = await blackjack.act(res.locals.userId!, action);
    if (!result.ok) {
        const [status, message] = BLACKJACK_ERRORS[result.reason];
        return void res.status(status).json({status: "error", message});
    }
    void achievements.track(res.locals.userId, ctx => {
        const actions = [...ctx.mem.blackjackActions ?? [], action];
        ctx.mem.blackjackActions = actions;
        if (result.state.finished) blackjackPlayed(ctx, result.state, before, actions, ctx.mem.blackjackBet ?? result.state.hands[0]?.bet ?? 0);
    });
    res.status(200).json({status: "ok", data: {hand: blackjackView(result.state), credits: result.credits}});
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
    const upgrades = await upgradesOf(res);
    const limits = {perBet: upgradeValueFor(upgrades, "roulette-case"), total: upgradeValueFor(upgrades, "roulette-total")};
    const bets = parseRouletteBets(req.body?.bets, limits);
    if (typeof bets === "string") return void res.status(400).json({status: "error", message: bets});
    const now = Date.now();
    const round = rouletteRoundAt(now);
    if (!rouletteBettingOpen(round, now)) return void res.status(409).json({status: "error", message: CLOSED_MESSAGE});
    if (maintenance.blocksRound(round)) return void res.status(503).json({status: "error", code: "maintenance", message: MAINTENANCE_MESSAGE});

    // geste du joueur (clic, glisser, « Reproduire ma mise ») : « Annuler la dernière mise » retire tout le geste
    const group: unknown = req.body?.group;
    const betGroup = typeof group === "string" && /^[A-Za-z0-9_-]{1,16}$/.test(group) ? group : null;
    const result = await liveRoulette.place(res.locals.userId!, round, bets, res.locals.ghost === true, betGroup, limits);
    if (!result.ok) {
        const [status, message] = result.reason === "closed" ? [409, CLOSED_MESSAGE]
            : result.reason === "credits" ? [402, "Pas assez de crédits"]
            : result.reason === "limit" ? [400, `${limits.perBet} crédits au plus par case et ${limits.total} par tour`]
            : [404, "Compte introuvable"];
        return void res.status(status).json({status: "error", message});
    }
    // Tapis : plus rien en poche après avoir posé plus de 1 000 jetons sur ce tour
    if (result.credits === 0 && !res.locals.ghost) {
        const placed = await db.selectFrom("roulette_bets").select(eb => eb.fn.coalesce(eb.fn.sum<string>("amount"), eb.lit(0)).as("n"))
            .where("round_id", "=", round).where("user_id", "=", res.locals.userId!).executeTakeFirst();
        if (Number(placed?.n ?? 0) > 1000) void achievements.track(res.locals.userId, ctx => rouletteAllIn(ctx, round));
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

// Retire les jetons de son dernier geste sur le tour en cours (tant que les mises sont ouvertes) → { credits, removed }
router.delete("/roulette/bets/last", asyncHandler(async (_req: Request, res: Response<unknown, AuthLocals>) => {
    const now = Date.now();
    const round = rouletteRoundAt(now);
    const result = rouletteBettingOpen(round, now) ? await liveRoulette.undoLast(res.locals.userId!, round) : null;
    if (result === null) return void res.status(409).json({status: "error", message: CLOSED_MESSAGE});
    res.status(200).json({status: "ok", data: result});
}));

// Loteries : mises, tickets et cagnotte de la période en cours, mes chances, et derniers gagnants
const LOTTERY_WINNERS = 5;
router.get("/lottery", asyncHandler(async (_req: Request, res: Response<unknown, AuthLocals>) => {
    const now = Date.now();
    const me = res.locals.userId!;
    // crédits par ticket du joueur (amélioration « Prix du ticket »)
    const ticketPrice = upgradeValueFor(await shop.upgradeLevels(me), "lottery-ticket");
    const data = await Promise.all(LOTTERY_KINDS.map(async kind => {
        const drawAt = nextLotteryDraw(kind, now);
        const {start} = lotteryPeriod(kind, drawAt);
        const [players, winners] = await Promise.all([lottery.players(kind, start, now), lottery.recentWinners(kind, LOTTERY_WINNERS)]);
        const totalBet = players.reduce((sum, b) => sum + b.bet, 0);
        const mine = players.find(b => b.userId === me);
        const myBet = mine?.bet ?? 0;
        return {
            kind, drawAt, periodStart: start, percent: LOTTERY_PERCENT[kind],
            totalBet, prize: lotteryPrize(kind, totalBet),
            // tickets des mises et tickets offerts par la roue du jour
            totalTickets: players.reduce((sum, b) => sum + b.tickets, 0),
            players: players.filter(b => b.tickets > 0).length,
            myBet, myTickets: mine?.tickets ?? 0,
            // crédits à miser encore pour un ticket de plus
            nextTicketIn: ticketPrice - (myBet % ticketPrice), ticketPrice,
            winners: winners.map(w => ({date: w.date, username: w.username, prize: w.prize, tickets: w.winner_tickets ?? 0, totalTickets: w.total_tickets})),
        };
    }));
    res.status(200).json({status: "ok", data});
}));

export default router;
