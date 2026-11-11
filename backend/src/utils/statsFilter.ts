import {sql} from "kysely";

/*
 * Filtres de la page Statistiques (administrateur), lus dans l'adresse de la requête :
 * - de, a : début et fin de la période (dates ISO, à la minute près) ; la fin est exclue
 * - jeu : un seul jeu (code d'un puzzle comme SUDOKU, ou plinko / roulette pour le hasard)
 * Chaque requête des statistiques ajoute ces conditions à ses WHERE (fragments SQL ci-dessous).
 */

export type StatsFilter = { from: Date | null; to: Date | null; game: string | null };

export const NO_FILTER: StatsFilter = {from: null, to: null, game: null};

// Au plus 400 jours sur les frises jour par jour (la période elle-même n'est pas limitée)
export const MAX_TIMELINE_DAYS = 400;

const GAME_CODE = /^[A-Za-z_]{1,32}$/;

function parseDate(value: unknown): Date | null | "invalid" {
    if (value === undefined || value === "") return null;
    if (typeof value !== "string") return "invalid";
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? "invalid" : date;
}

/** Lit les filtres d'une requête ; renvoie un message d'erreur s'ils sont invalides */
export function parseStatsFilter(query: Record<string, unknown>): StatsFilter | string {
    const from = parseDate(query.de);
    const to = parseDate(query.a);
    if (from === "invalid" || to === "invalid") return "Date invalide";
    if (from && to && from >= to) return "Le début doit être avant la fin";
    const game = query.jeu === undefined || query.jeu === "" ? null : query.jeu;
    if (game !== null && (typeof game !== "string" || !GAME_CODE.test(game))) return "Jeu invalide";
    return {from, to, game};
}

export const isFiltered = (f: StatsFilter) => f.from !== null || f.to !== null || f.game !== null;

// Condition « la colonne tombe dans la période » (toujours vraie sans période)
export function within(column: string, f: StatsFilter) {
    const c = sql.ref(column);
    const parts = [sql`true`];
    if (f.from) parts.push(sql`${c} >= ${f.from}`);
    if (f.to) parts.push(sql`${c} < ${f.to}`);
    return sql.join(parts, sql` and `);
}

// Condition « la colonne est le jeu choisi » (toujours vraie sans jeu)
export const gameIs = (column: string, f: StatsFilter) => f.game ? sql`${sql.ref(column)} = ${f.game}` : sql`true`;

/*
 * Premier et dernier jour (heure française) des frises jour par jour : ceux de la période,
 * sinon les `days` derniers jours. Au plus MAX_TIMELINE_DAYS jours (les plus récents de la période).
 */
export function timelineDays(f: StatsFilter, days: number) {
    const TZ = sql.lit("Europe/Paris");
    const end = f.to
        ? sql`((${f.to}::timestamptz - interval '1 millisecond') at time zone ${TZ})::date`
        : sql`(now() at time zone ${TZ})::date`;
    const start = f.from ? sql`(${f.from}::timestamptz at time zone ${TZ})::date` : sql`${end} - ${days - 1}::int`;
    return {start: sql`greatest(${start}, ${end} - ${MAX_TIMELINE_DAYS - 1}::int)`, end};
}
