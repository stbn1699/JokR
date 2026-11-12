/*
 * Loteries du Hasard : une du jour, une de la semaine, une du mois.
 * - chaque tranche de LOTTERY_TICKET_CREDITS crédits misés (Plinko, roulette) sur la période donne un ticket
 * - au tirage, un ticket gagnant est tiré au sort (plus on a de tickets, plus on a de chances)
 * - le gagnant reçoit LOTTERY_PERCENT % de tous les crédits misés sur la période
 * Tirages à 23 h 59, heure de Paris : chaque jour, chaque dimanche, et le dernier jour du mois (28, 29, 30 ou 31).
 * Une période va du tirage précédent (exclu) au tirage (compris).
 */

export const LOTTERY_KINDS = ["day", "week", "month"] as const;
export type LotteryKind = typeof LOTTERY_KINDS[number];

export const LOTTERY_TICKET_CREDITS = 10;
// Part des crédits misés sur la période reversée au gagnant (en %)
export const LOTTERY_PERCENT: Record<LotteryKind, number> = {day: 5, week: 5, month: 5};

const TIME_ZONE = "Europe/Paris";
const DRAW_HOUR = 23;
const DRAW_MINUTE = 59;

export const lotteryTickets = (bet: number) => Math.floor(Math.max(0, bet) / LOTTERY_TICKET_CREDITS);
export const lotteryPrize = (kind: LotteryKind, totalBet: number) => Math.floor(totalBet * LOTTERY_PERCENT[kind] / 100);

type Day = { y: number; m: number; d: number };

// Jour (et jour de la semaine, 0 = dimanche) à Paris pour un instant donné
function parisDay(t: number): Day & { weekday: number } {
    const parts = Object.fromEntries(new Intl.DateTimeFormat("en-US", {
        timeZone: TIME_ZONE, year: "numeric", month: "numeric", day: "numeric", weekday: "short",
    }).formatToParts(new Date(t)).map(p => [p.type, p.value]));
    return {y: Number(parts.year), m: Number(parts.month), d: Number(parts.day), weekday: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(String(parts.weekday))};
}

// Décalage de Paris par rapport à UTC à cet instant (ms)
function parisOffset(t: number): number {
    const p = Object.fromEntries(new Intl.DateTimeFormat("en-US", {
        timeZone: TIME_ZONE, hourCycle: "h23", year: "numeric", month: "numeric", day: "numeric", hour: "numeric", minute: "numeric", second: "numeric",
    }).formatToParts(new Date(t)).map(x => [x.type, x.value]));
    return Date.UTC(Number(p.year), Number(p.month) - 1, Number(p.day), Number(p.hour), Number(p.minute), Number(p.second)) - Math.floor(t / 1000) * 1000;
}

// Instant du tirage (23 h 59 à Paris) d'un jour donné
function drawOn({y, m, d}: Day): number {
    const wall = Date.UTC(y, m - 1, d, DRAW_HOUR, DRAW_MINUTE);
    let t = wall - parisOffset(wall);
    t = wall - parisOffset(t);
    return t;
}

// Jour décalé de n jours (calendrier, sans fuseau)
function addDays({y, m, d}: Day, n: number): Day {
    const date = new Date(Date.UTC(y, m - 1, d + n));
    return {y: date.getUTCFullYear(), m: date.getUTCMonth() + 1, d: date.getUTCDate()};
}

const lastDayOfMonth = (y: number, m: number): Day => ({y, m, d: new Date(Date.UTC(y, m, 0)).getUTCDate()});

// Jour du tirage de la période qui contient `day` (le jour même, le dimanche, ou le dernier jour du mois)
function drawDayOf(kind: LotteryKind, day: Day & { weekday: number }): Day {
    if (kind === "day") return day;
    if (kind === "week") return addDays(day, (7 - day.weekday) % 7);
    return lastDayOfMonth(day.y, day.m);
}

// Tirage précédent celui du jour `day` (pour la même loterie)
function previousDrawDay(kind: LotteryKind, day: Day): Day {
    if (kind === "day") return addDays(day, -1);
    if (kind === "week") return addDays(day, -7);
    return day.m === 1 ? lastDayOfMonth(day.y - 1, 12) : lastDayOfMonth(day.y, day.m - 1);
}

// Prochain tirage après cet instant (strictement)
export function nextLotteryDraw(kind: LotteryKind, now: number = Date.now()): number {
    const today = parisDay(now);
    const draw = drawOn(drawDayOf(kind, today));
    if (draw > now) return draw;
    // tirage de la période déjà passé (après 23 h 59 le jour même) : celui de la période suivante
    return drawOn(drawDayOf(kind, {...addDays(today, 1), weekday: (today.weekday + 1) % 7}));
}

// Dernier tirage à cet instant ou avant
export function lastLotteryDraw(kind: LotteryKind, now: number = Date.now()): number {
    const next = nextLotteryDraw(kind, now);
    return drawOn(previousDrawDay(kind, parisDay(next)));
}

// Période d'un tirage : du tirage précédent (exclu) à celui-ci (compris)
export function lotteryPeriod(kind: LotteryKind, drawAt: number): { start: number; end: number } {
    return {start: drawOn(previousDrawDay(kind, parisDay(drawAt))), end: drawAt};
}

// Jour du tirage (AAAA-MM-JJ, Paris) : identifiant de la période
export function lotteryDrawDate(drawAt: number): string {
    const {y, m, d} = parisDay(drawAt);
    return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

// Tire le gagnant : un ticket au hasard parmi tous ceux de la période (random(n) : entier de 0 à n - 1)
// Fichier partagé avec le site : le tirage au sort (node:crypto) est donné par le serveur
export function pickLotteryWinner<T extends { tickets: number }>(players: T[], random: (n: number) => number): T | null {
    const total = players.reduce((sum, p) => sum + p.tickets, 0);
    if (total <= 0) return null;
    let ticket = random(total);
    for (const p of players) {
        if (ticket < p.tickets) return p;
        ticket -= p.tickets;
    }
    return null;
}
