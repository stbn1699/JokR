import {CASINO_DAY_GAMES} from "../../utils/achievements.js";
import {PLINKO_SLOTS, PLINKO_TABLES, type PlinkoRisk} from "../../utils/plinko.js";
import {type SlotMachine, type SlotWin, slotLines} from "../../utils/slots.js";
import {type BlackjackState, handTotal, isBlackjack} from "../../utils/blackjack.js";
import {evaluatePoker, type PokerHand, type PokerState} from "../../utils/poker.js";
import {rouletteWinningKeys, type RouletteBet} from "../../utils/roulette.js";
import {WHEEL_SEGMENTS} from "../../utils/wheel.js";
import type {Card} from "../../utils/blackjack.js";

/*
 * Ce que chaque action du joueur change dans les statistiques des succès (voir utils/achievements.ts).
 * Fonctions pures sur un StatCtx : le service (AchievementsService) charge les statistiques du joueur, appelle la
 * fonction, enregistre ce qui a changé puis regarde les succès concernés. `live` demande au service de relire en
 * base un état du compte (solde, objets, niveaux…) avant de regarder les succès.
 */

export type LiveProvider = "credits" | "account" | "shop" | "levels" | "wins" | "friends" | "challenges" | "feedback";

// Ce qui ne vaut pas la peine d'être gardé en base (perdu au redémarrage du serveur)
export type UserMemory = {
    // pertes au Hasard des 5 dernières minutes (« Express »)
    losses: { at: number; amount: number }[];
    // début de la session de Hasard en cours sans puzzle (« Accro »), dernière mise
    casinoSince?: number | undefined;
    casinoLast?: number;
    // coups de la main de blackjack en cours
    blackjackActions?: string[] | undefined;
    blackjackBet?: number | undefined;
};

export interface StatCtx {
    readonly now: Date;
    readonly mem: UserMemory;
    get(key: string): number | undefined;
    set(key: string, value: number): void;
    add(key: string, n?: number): number;
    max(key: string, value: number): void;
    min(key: string, value: number): void;
    live(...providers: LiveProvider[]): void;
}

// ---------- Outils

const PARIS = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Paris", year: "numeric", month: "numeric", day: "numeric", hour: "numeric", minute: "numeric", weekday: "short", hourCycle: "h23",
});

// Date et heure à Paris
export function parisTime(now: Date) {
    const parts = Object.fromEntries(PARIS.formatToParts(now).map(p => [p.type, p.value]));
    const year = Number(parts.year), month = Number(parts.month), day = Number(parts.day);
    return {year, month, day, hour: Number(parts.hour), minute: Number(parts.minute), weekday: parts.weekday as string,
        // numéro du jour (jours depuis 1970) : deux jours qui se suivent ont des numéros qui se suivent
        dayNumber: Math.round(Date.UTC(year, month - 1, day) / 86_400_000)};
}

// Numéro du jour d'une date AAAA-MM-JJ
export const dayNumberOf = (date: string) => Math.round(Date.parse(`${date}T00:00:00Z`) / 86_400_000);

// Empreinte d'un texte (FNV-1a 32 bits) : une « façon de jouer » gardée comme un nombre
export function fingerprint(text: string): number {
    let h = 0x811c9dc5;
    for (let i = 0; i < text.length; i++) {
        h ^= text.charCodeAt(i);
        h = Math.imul(h, 0x01000193);
    }
    return h >>> 0;
}

// Série : +1 si `hit`, sinon retour à 0 ; record dans `<key>.best`. Renvoie la série en cours.
export function streak(ctx: StatCtx, key: string, hit: boolean): number {
    const value = hit ? (ctx.get(key) ?? 0) + 1 : 0;
    ctx.set(key, value);
    if (hit) ctx.max(`${key}.best`, value);
    return value;
}

// Série de jours qui se suivent (une fois par jour au plus) ; record dans `<key>.best`
export function dayStreak(ctx: StatCtx, key: string, day: number): number {
    const last = ctx.get(`${key}.last`);
    if (last === day) return ctx.get(key) ?? 1;
    const value = last === day - 1 ? (ctx.get(key) ?? 0) + 1 : 1;
    ctx.set(key, value);
    ctx.set(`${key}.last`, day);
    ctx.max(`${key}.best`, value);
    return value;
}

// Compteur du jour (remis à 0 chaque jour) ; record dans `<key>.best`. Renvoie le compte du jour.
export function perDay(ctx: StatCtx, key: string, n: number, day: number): number {
    const value = ctx.get(`${key}.date`) === day ? (ctx.get(key) ?? 0) + n : n;
    ctx.set(key, value);
    ctx.set(`${key}.date`, day);
    ctx.max(`${key}.best`, value);
    return value;
}

/*
 * « La définition de la folie » : la même façon de jouer (`signature`) partie après partie, perdue à chaque fois.
 * Une partie perdue jouée autrement recommence la série à 1, une partie gagnée la remet à 0.
 */
export function madness(ctx: StatCtx, game: string, signature: string, lost: boolean) {
    const key = `madness.${game}`;
    const sig = fingerprint(signature);
    const same = ctx.get(`${key}.sig`) === sig;
    ctx.set(`${key}.sig`, sig);
    const value = lost ? (same ? (ctx.get(key) ?? 0) + 1 : 1) : 0;
    ctx.set(key, value);
    ctx.max(`${key}.best`, value);
}

const today = (ctx: StatCtx) => parisTime(ctx.now).dayNumber;

// ---------- Jetons

export function earn(ctx: StatCtx, amount: number) {
    if (amount > 0) ctx.add("earned.total", amount);
}

export function spend(ctx: StatCtx, amount: number) {
    if (amount <= 0) return;
    ctx.add("spent.total", amount);
    perDay(ctx, "spent.day", amount, today(ctx));
}

/*
 * Solde relu en base : ce qui dépend de son évolution (appelé par le service à chaque relecture du solde).
 * Phénix (moins de 10 puis plus de 10 000), Icare (plus de 100 000 puis moins de 10), Économe (30 jours au-dessus
 * de 10 000 : compté à chaque relecture, au moins une fois par jour où le joueur passe sur le site).
 */
export function watchCredits(ctx: StatCtx, credits: number) {
    if (credits < 10) {
        ctx.set("credits.low", 1);
        if ((ctx.get("credits.peak") ?? 0) > 100_000) ctx.set("icarus", 1);
    }
    if (credits > 10_000 && ctx.get("credits.low") === 1) ctx.set("phoenix", 1);
    ctx.max("credits.peak", credits);
    const day = today(ctx);
    if (credits > 10_000) {
        const since = ctx.get("rich.since") || day;
        ctx.set("rich.since", since);
        ctx.set("rich.days", day - since + 1);
    } else if (ctx.get("rich.since")) {
        ctx.set("rich.since", 0);
        ctx.set("rich.days", 0);
    }
}

// ---------- Hasard : ce qui est commun à toutes les mises

const EXPRESS_MS = 5 * 60 * 1000;
const ADDICT_MS = 60 * 60 * 1000;
// une pause plus longue que ça coupe la session de Hasard (« Accro »)
const ADDICT_BREAK_MS = 15 * 60 * 1000;

export function casinoDay(ctx: StatCtx, game: typeof CASINO_DAY_GAMES[number]) {
    const day = today(ctx);
    const mask = (ctx.get("casino.day.date") === day ? ctx.get("casino.day.mask") ?? 0 : 0) | (1 << CASINO_DAY_GAMES.indexOf(game));
    ctx.set("casino.day.mask", mask);
    ctx.set("casino.day.date", day);
    if (mask === (1 << CASINO_DAY_GAMES.length) - 1) ctx.set("casino.day.all", 1);

    const now = ctx.now.getTime();
    const {mem} = ctx;
    if (mem.casinoSince === undefined || now - (mem.casinoLast ?? 0) > ADDICT_BREAK_MS) mem.casinoSince = now;
    mem.casinoLast = now;
    if (now - mem.casinoSince >= ADDICT_MS) ctx.set("casino.addict", 1);
}

// Une mise jouée et payée (bet : misé, payout : rendu en tout, mise comprise)
export function casinoPlay(ctx: StatCtx, game: typeof CASINO_DAY_GAMES[number], bet: number, payout: number) {
    ctx.add("bet.total", bet);
    spend(ctx, bet);
    earn(ctx, payout);
    const loss = bet - payout;
    if (loss > 0) ctx.add("lost.total", loss);
    if (bet > 0 && payout >= 100 * bet) ctx.set("casino.x100", 1);
    streak(ctx, "casino.loss.streak", payout < bet);
    casinoDay(ctx, game);

    const now = ctx.now.getTime();
    const losses = ctx.mem.losses.filter(l => now - l.at < EXPRESS_MS);
    if (loss !== 0) losses.push({at: now, amount: loss});
    ctx.mem.losses = losses;
    if (losses.reduce((n, l) => n + l.amount, 0) >= 1000) ctx.set("casino.express", 1);
    ctx.live("credits");
}

// ---------- Plinko

const PLINKO_CENTER = (PLINKO_SLOTS - 1) / 2;
export const PLINKO_TOP_BET = 500;

export function plinkoDrop(ctx: StatCtx, drop: { bet: number; risk: PlinkoRisk; slot: number; multiplier: number; payout: number }) {
    const {bet, risk, slot, multiplier, payout} = drop;
    casinoPlay(ctx, "plinko", bet, payout);
    ctx.add("plinko.balls");
    const edge = slot === 0 || slot === PLINKO_SLOTS - 1;
    if (edge) {
        ctx.set(`plinko.edge.${risk}`, 1);
        if (bet >= PLINKO_TOP_BET) ctx.set("plinko.edge.maxbet", 1);
    }
    streak(ctx, "plinko.center.streak", Math.abs(slot - PLINKO_CENTER) <= 1);
    streak(ctx, "plinko.low.streak", multiplier === Math.min(...PLINKO_TABLES[risk]));
    streak(ctx, "plinko.murphy.streak", risk === "extreme" && multiplier <= 1);
    if (risk === "extreme" && (slot === 1 || slot === PLINKO_SLOTS - 2)) ctx.set("plinko.nearedge", 1);
    madness(ctx, "plinko", `${bet}:${risk}`, multiplier < 1);
}

// ---------- Machines à sous

export function slotSpinPlayed(ctx: StatCtx, spin: { machine: SlotMachine; reels: number; lines: number; bet: number; grid: string[][]; wins: SlotWin[]; payout: number }) {
    const {machine, reels, lines, bet, grid, wins, payout} = spin;
    casinoPlay(ctx, "slots", bet, payout);
    ctx.add("slots.spins");
    const wild = machine.symbols.find(s => s.wild)?.id;
    const top = [...machine.symbols].filter(s => !s.wild).sort((a, b) => b.base - a.base)[0]?.id;
    if (payout > 0) ctx.add(`slots.${machine.id}.wins`);
    if (wins.some(w => w.symbol === top && w.count === reels)) ctx.set(`slots.${machine.id}.top`, 1);
    if (wins.some(w => w.symbol === wild && w.count === reels)) {
        ctx.set(`slots.${machine.id}.wild`, 1);
        if (reels === 5) ctx.set(`slots.${machine.id}.jackpot`, 1);
    }
    if (lines === 10 && wins.length === 10) ctx.set("slots.rainbow", 1);
    streak(ctx, "slots.loss.streak", payout === 0);
    // 4 jokers puis autre chose sur une ligne de 5 cases
    if (reels === 5 && slotLines(reels, lines).some(rows => {
        const line = rows.map((row, reel) => grid[row]![reel]!);
        return line.slice(0, 4).every(s => s === wild) && line[4] !== wild;
    })) ctx.set("slots.near", 1);
    madness(ctx, "slots", `${machine.id}:${bet}:${reels}:${lines}`, payout === 0);
}

// ---------- Keno

export function kenoPlayed(ctx: StatCtx, game: { bet: number; picks: number[]; hits: number; payout: number }) {
    const {bet, picks, hits, payout} = game;
    casinoPlay(ctx, "keno", bet, payout);
    ctx.max("keno.hits.best", hits);
    if (picks.length === 15) ctx.set("keno.picks15", 1);
    if (hits === 0 && picks.length === 10) ctx.set("keno.zero10", 1);
    if (hits === 0 && picks.length === 15) ctx.set("keno.zero15", 1);
    madness(ctx, "keno", `${bet}:${[...picks].sort((a, b) => a - b).join(",")}`, payout === 0);
}

// ---------- Poker

const POKER_RANKING: PokerHand[] = ["nothing", "jacksOrBetter", "twoPair", "threeKind", "straight", "flush", "fullHouse", "fourKind", "straightFlush", "royal"];
const pokerRank = (hand: PokerHand) => POKER_RANKING.indexOf(hand);

// dealt : les 5 cartes reçues ; final : la main finie
export function pokerPlayed(ctx: StatCtx, dealt: Card[], final: PokerState) {
    const hand = final.hand ?? "nothing";
    const payout = final.payout ?? 0;
    casinoPlay(ctx, "poker", final.bet, payout);
    if (hand !== "nothing") ctx.set(`poker.${hand}`, 1);
    if (hand === "fourKind" && final.cards.filter(c => c.rank === "A").length >= 4) ctx.set("poker.fouraces", 1);
    const kept = final.held.filter(Boolean).length;
    if (kept === 0 && pokerRank(hand) >= pokerRank("threeKind")) ctx.set("poker.redraw", 1);
    if (hand === "nothing") {
        if (kept === 5) ctx.set("poker.blind", 1);
        if (dealt.filter((c, i) => c.rank === "A" && !final.held[i]).length >= 2) ctx.set("poker.acesout", 1);
        if (kept < 5 && evaluatePoker(dealt) !== "nothing") ctx.set("poker.regret", 1);
    }
    if (evaluatePoker(dealt) === "royal" && hand !== "royal") ctx.set("poker.inexcusable", 1);
    madness(ctx, "poker", `${final.bet}:${final.held.map(h => (h ? 1 : 0)).join("")}`, payout === 0);
}

// ---------- Blackjack

// before : la main avant le dernier coup (null si elle s'est finie dès la donne) ; actions : coups joués ; startBet : mise de départ
export function blackjackPlayed(ctx: StatCtx, final: BlackjackState, before: BlackjackState | null, actions: string[], startBet: number) {
    const bet = final.hands.reduce((n, h) => n + h.bet, 0);
    const payout = final.hands.reduce((n, h) => n + (h.payout ?? 0), 0);
    casinoPlay(ctx, "blackjack", bet, payout);
    const won = (o?: string) => o === "win" || o === "blackjack";
    if (final.hands.length === 1 && final.hands[0]!.outcome === "blackjack") ctx.add("bj.naturals");
    if (final.hands.some(h => h.doubled && won(h.outcome))) ctx.set("bj.doublewin", 1);
    if (final.hands.length === 2 && final.hands.every(h => won(h.outcome))) ctx.set("bj.splitwin", 1);
    if (final.hands.some(h => h.cards.length >= 5 && handTotal(h.cards).total <= 21)) ctx.set("bj.fivecards", 1);
    if (final.hands.some(h => h.cards.length === 3 && h.cards.every(c => c.rank === "7"))) ctx.set("bj.777", 1);
    streak(ctx, "bj.win.streak", payout > bet);

    const busts = final.hands.filter(h => h.outcome === "bust");
    if (busts.some(h => handTotal(h.cards).total === 22)) ctx.set("bj.22", 1);
    streak(ctx, "bj.bust.streak", busts.length > 0);
    // tirer sur 20 : la main jouée avait 20 avant le dernier coup, et elle a sauté
    if (before && actions.at(-1) === "hit") {
        const played = before.hands[before.active];
        const after = final.hands[before.active];
        if (played && after?.outcome === "bust" && handTotal(played.cards).total === 20) ctx.set("bj.greedy", 1);
    }
    if (isBlackjack(final.dealer) && final.hands.some(h => h.outcome === "lose" && handTotal(h.cards).total === 20)) ctx.set("bj.robbed", 1);
    if (final.hands.some(h => h.outcome === "lose" && handTotal(h.cards).total <= 11)) ctx.set("bj.coward", 1);
    madness(ctx, "blackjack", `${startBet}:${actions.join(",")}`, payout < bet);
}

// ---------- Roulette

// Tapis : tout le solde posé sur le tour (vérifié à la pose des jetons)
export function rouletteAllIn(ctx: StatCtx, round: number) {
    ctx.set("roulette.allin.round", round);
}

// Un tour payé : tous les jetons du joueur sur ce tour, le numéro sorti et ce qu'il a touché
export function rouletteRound(ctx: StatCtx, round: { id: number; number: number; bets: RouletteBet[]; payout: number }) {
    const {id, number, bets, payout} = round;
    const bet = bets.reduce((n, b) => n + b.amount, 0);
    const keys = new Set(bets.map(b => b.key));
    const winning = new Set(rouletteWinningKeys(bets, number));
    casinoPlay(ctx, "roulette", bet, payout);
    ctx.add("roulette.rounds");
    if (payout > 0) ctx.add("roulette.wins");
    if (number === 0 && payout > 0) ctx.set("roulette.zero", 1);

    // numéro seul gagnant, et le même que le tour d'avant (numéro + 1 gardé, 0 : pas de plein gagné)
    const straight = winning.has(`n:${number}`);
    if (straight) {
        ctx.set("roulette.straight", 1);
        if (ctx.get("roulette.laststraight") === number + 1) ctx.set("roulette.sametwice", 1);
    }
    ctx.set("roulette.laststraight", straight ? number + 1 : 0);

    const red = keys.has("red"), black = keys.has("black");
    if (red && black) ctx.set("roulette.bothcolors", 1);
    streak(ctx, "roulette.color.streak", (red && winning.has("red")) || (black && winning.has("black")));
    // même couleur perdue tour après tour (1 : rouge, 2 : noir)
    const color = red !== black ? (red ? 1 : 2) : 0;
    const colorLost = color !== 0 && !winning.has(red ? "red" : "black");
    const sameColor = ctx.get("roulette.colorloss.color") === color;
    ctx.set("roulette.colorloss.color", color);
    const colorLoss = colorLost ? (sameColor ? (ctx.get("roulette.colorloss.streak") ?? 0) + 1 : 1) : 0;
    ctx.set("roulette.colorloss.streak", colorLoss);
    ctx.max("roulette.colorloss.streak.best", colorLoss);

    let straights = 0;
    for (let n = 0; n <= 36; n++) if (keys.has(`n:${n}`)) straights++;
    if (straights === 37) {
        ctx.set("roulette.cover", 1);
        if (payout < bet) ctx.set("roulette.accountant", 1);
    }
    if (bet - payout > 10_000) ctx.set("roulette.bigloss", 1);
    streak(ctx, "roulette.zeroloss.streak", keys.has("n:0") && number !== 0);
    if (ctx.get("roulette.allin.round") === id && payout > bet) ctx.set("roulette.allin", 1);

    const signature = [...bets.reduce((m, b) => m.set(b.key, (m.get(b.key) ?? 0) + b.amount), new Map<string, number>())]
        .sort(([a], [b]) => a.localeCompare(b)).map(([k, a]) => `${k}=${a}`).join(";");
    madness(ctx, "roulette", signature, payout < bet);
}

// ---------- Roue du jour

export function wheelSpun(ctx: StatCtx, spin: { segment: number; creditsWon: number }) {
    const segment = WHEEL_SEGMENTS[spin.segment];
    if (!segment) return;
    ctx.add("wheel.spins");
    earn(ctx, spin.creditsWon);
    if (segment.jackpot) ctx.set("wheel.jackpot", 1);
    const seen = (ctx.get("wheel.seen") ?? 0) | (1 << spin.segment);
    ctx.set("wheel.seen", seen);
    ctx.set("wheel.segments", bitCount(seen));
    streak(ctx, "wheel.respin.streak", segment.reward === "respin");
    const smallest = Math.min(...WHEEL_SEGMENTS.filter(s => s.reward === "credits").map(s => s.amount));
    streak(ctx, "wheel.small.streak", segment.reward === "credits" && segment.amount === smallest);
    dayStreak(ctx, "wheel.days", today(ctx));
    casinoDay(ctx, "wheel");
    ctx.live("credits", "account", "shop");
}

export const bitCount = (n: number) => {
    let count = 0;
    for (let v = n; v > 0; v >>>= 1) count += v & 1;
    return count;
};

// ---------- Loteries

// Un tirage : ce joueur avait `tickets` tickets ; `most` : personne n'en avait autant que lui
export function lotteryDrawn(ctx: StatCtx, draw: { kind: string; tickets: number; won: boolean; prize: number; most: boolean; players: number }) {
    if (draw.tickets <= 0) return;
    ctx.add("lottery.tickets", draw.tickets);
    if (draw.won) {
        ctx.set(`lottery.win.${draw.kind}`, 1);
        ctx.set("lottery.won", 1);
        earn(ctx, draw.prize);
        if (draw.tickets === 1) ctx.set("lottery.onewin", 1);
        ctx.live("credits");
    } else if (draw.most && draw.players >= 2) {
        ctx.set("lottery.favorite", 1);
    }
    ctx.set("lottery.tickets.nowin", ctx.get("lottery.won") === 1 ? 0 : ctx.get("lottery.tickets") ?? 0);
}

// ---------- Boutique et profil

export function shopBought(ctx: StatCtx, price: number) {
    spend(ctx, price);
    ctx.live("shop", "credits");
}

export function backgroundChanged(ctx: StatCtx) {
    perDay(ctx, "background.day", 1, today(ctx));
}

export function avatarChanged(ctx: StatCtx) {
    ctx.add("avatar.changes");
    perDay(ctx, "avatar.day", 1, today(ctx));
}

// ---------- Puzzles

// Victoire enregistrée (toutes les grilles : libres, niveaux, défis du jour, défis entre amis)
export function puzzleWon(ctx: StatCtx, win: { gameCode: string; gridSize: number; credits: number }) {
    earn(ctx, win.credits);
    ctx.max(`maxsize.${win.gameCode}`, win.gridSize);
    perDay(ctx, "puzzles.day", 1, today(ctx));
    // un puzzle coupe la session de Hasard (« Accro »)
    ctx.mem.casinoSince = undefined;
    ctx.live("credits", "account", "wins", "levels");
}

// Fin d'une partie suivie (grilles fausses envoyées) ; mode « daily » : défi du jour
export function puzzleSession(ctx: StatCtx, session: { gameCode: string; mode: string; failed: number }) {
    ctx.max("puzzle.failed.best", session.failed);
    if (session.mode !== "daily") return;
    const clean = session.failed === 0;
    if (clean) ctx.set(`daily.clean.${session.gameCode}`, 1);
    streak(ctx, `daily.clean.${session.gameCode}.streak`, clean);
}

// Défi du jour réussi (la réussite qui compte) ; doneThatDay : défis réussis par le joueur ce jour-là, celui-ci compris
export function dailyDone(ctx: StatCtx, daily: { gameCode: string; date: string; durationMs: number; doneThatDay: number; today: string }) {
    const {gameCode, date, durationMs} = daily;
    ctx.add("daily.done");
    ctx.min(`daily.fastest.${gameCode}`, durationMs);
    ctx.max("daily.slowest", durationMs);
    if (gameCode === "QUEENS" && durationMs < 60_000) ctx.add("daily.queens.under60");
    const day = dayNumberOf(date);
    dayStreak(ctx, "daily.streak", day);
    if (daily.doneThatDay >= 8) {
        ctx.add("daily.fullday");
        dayStreak(ctx, "daily.fullday.streak", day);
    }
    const {hour, minute} = parisTime(ctx.now);
    if (hour < 7) ctx.set("daily.early", 1);
    if (hour >= 2 && hour < 5) ctx.set("daily.night", 1);
    if (hour === 23 && minute === 59) ctx.set("daily.lastminute", 1);
    if (date !== daily.today) ctx.set("daily.late", 1);
}

// Places finales d'un jour de défis (une ligne par jeu réussi) ; firstMs : temps du 1er de chaque jeu
export function dailyClosed(ctx: StatCtx, games: { gameCode: string; rank: number; total: number; durationMs: number; firstMs: number }[]) {
    for (const g of games) {
        ctx.min(`daily.best.${g.gameCode}`, g.rank);
        if (g.rank === g.total && g.total >= 3) ctx.set("daily.lastplace", 1);
        if (g.rank === 51) ctx.set("daily.rank51", 1);
        if (g.rank === 42) ctx.set("daily.rank42", 1);
        if (g.rank === 2 && g.durationMs - g.firstMs < 1000) ctx.set("daily.soclose", 1);
    }
    if (games.length >= 8 && games.every(g => g.rank === 1)) ctx.set("daily.slam", 1);
}

// ---------- Présence sur le site (au plus une fois par minute)

export function activity(ctx: StatCtx) {
    const t = parisTime(ctx.now);
    if (t.month === 12 && t.day === 25) ctx.set("date.christmas", 1);
    if (t.month === 1 && t.day === 1) ctx.set("date.newyear", 1);
    if (t.month === 4 && t.day === 1) ctx.set("date.aprilfools", 1);
    if (t.day === 13 && t.weekday === "Fri") ctx.set("date.friday13", 1);
    if (t.month === 10 && t.day === 10) {
        ctx.set("date.anniversary", 1);
        if (ctx.get("date.anniversary.last") !== t.year) {
            ctx.set("date.anniversary.last", t.year);
            ctx.add("date.anniversary.years");
        }
    }
    if (t.hour === 0 && t.minute === 0) ctx.set("time.midnight", 1);
    dayStreak(ctx, "login.streak", t.dayNumber);
    const seen = ctx.get("seen.day");
    if (seen !== undefined && t.dayNumber - seen >= 30) ctx.set("comeback", 1);
    ctx.set("seen.day", t.dayNumber);
    perDay(ctx, "active.day", 1, t.dayNumber);
    ctx.live("credits", "account");
}

// Ce que le site signale lui-même (visite de l'interface, nouveautés, règles d'un jeu)
export const CLIENT_EVENTS = ["tour", "changelog", "rules"] as const;
export function clientEvent(ctx: StatCtx, kind: typeof CLIENT_EVENTS[number], game?: string) {
    if (kind === "tour") ctx.set("client.tour", 1);
    if (kind === "changelog") ctx.set("client.changelog", 1);
    if (kind === "rules" && game) ctx.max("rules.best", ctx.add(`rules.${game}`));
}
