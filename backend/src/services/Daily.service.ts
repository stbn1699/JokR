import type {DailyRanking, DailyRepository} from "../repository/Daily.repository.js";
import type {SudokuService} from "./Sudoku.service.js";
import type {BineroService} from "./Binero.service.js";
import type {RikudoService} from "./Rikudo.service.js";

/*
 * Défi du jour : une grille par jeu et par jour, la même pour tout le monde.
 * Les grilles sont générées à minuit (heure de Paris) par dailyScheduler.ts et conservées en base.
 * Filet de sécurité : si une grille manque encore à la demande d'un joueur, elle est générée à ce moment-là
 * (l'insertion "on conflict do nothing" garantit une seule grille même si plusieurs demandes arrivent ensemble).
 */

// Difficulté du défi pour chaque jeu
export const DAILY_GAMES = {
    SUDOKU: {size: 9, emptyCells: 45},
    BINERO: {size: 10, emptyCells: 50},
    // Rikudo : size = nombre de cases du plateau
    RIKUDO: {size: 60, emptyCells: 40},
} as const;

export type DailyGameCode = keyof typeof DAILY_GAMES;

// XP et crédits multipliés pour la réussite qui compte au défi du jour (pas pour un défi passé rejoué)
export const DAILY_REWARD_MULTIPLIER = 2;

export const isDailyGame = (code: string): code is DailyGameCode => code in DAILY_GAMES;

export class DailyService {
    constructor(
        private repo: DailyRepository,
        private sudoku: SudokuService,
        private binero: BineroService,
        private rikudo: RikudoService,
    ) {
    }

    // Grille du défi (générée et enregistrée si c'est la première demande du jour)
    async challenge(gameCode: DailyGameCode, date: string) {
        const existing = await this.repo.findChallenge(date, gameCode);
        if (existing) return existing;

        const {size, emptyCells} = DAILY_GAMES[gameCode];
        const puzzle = await this.generate(gameCode, size, emptyCells);

        await this.repo.insertChallenge(date, gameCode, puzzle, size, emptyCells);
        // Relecture : si deux joueurs ont lancé la génération en même temps, tous deux ont la même grille
        return (await this.repo.findChallenge(date, gameCode))!;
    }

    private async generate(gameCode: DailyGameCode, size: number, emptyCells: number): Promise<unknown> {
        switch (gameCode) {
            case "SUDOKU":
                return this.sudoku.generate(81 - emptyCells);
            case "BINERO":
                return this.binero.generate(size, size * size - emptyCells);
            case "RIKUDO":
                return this.rikudo.generate(size, size - emptyCells);
        }
    }

    /** Génère les défis manquants du jour pour tous les jeux ; renvoie les jeux générés */
    async generateAll(date: string): Promise<DailyGameCode[]> {
        const created: DailyGameCode[] = [];
        for (const code of Object.keys(DAILY_GAMES) as DailyGameCode[]) {
            if (await this.repo.findChallenge(date, code)) continue;
            await this.challenge(code, date);
            created.push(code);
        }
        return created;
    }

    /** true si les défis de tous les jeux existent pour ce jour */
    async ready(date: string): Promise<boolean> {
        const found = await Promise.all((Object.keys(DAILY_GAMES) as DailyGameCode[])
            .map(code => this.repo.findChallenge(date, code)));
        return found.every(Boolean);
    }

    // Réussite déjà enregistrée pour ce joueur aujourd'hui (avec sa place), ou null
    async resultOf(gameCode: DailyGameCode, date: string, userId: string): Promise<(DailyRanking & { durationMs: number }) | null> {
        const result = await this.repo.findResult(date, gameCode, userId);
        if (!result) return null;
        return {durationMs: result.duration_ms, ...await this.repo.rankOf(date, gameCode, result.duration_ms)};
    }

    /**
     * Enregistre une réussite. `counted` est false si le joueur avait déjà réussi le défi ce jour-là :
     * seule la première réussite compte (pas d'XP ni de classement pour les suivantes).
     */
    async recordResult(gameCode: DailyGameCode, date: string, userId: string, durationMs: number) {
        const counted = await this.repo.insertResult(date, gameCode, userId, durationMs);
        if (!counted) {
            // Déjà réussi : on renvoie la place de la réussite qui compte (la première)
            const first = await this.resultOf(gameCode, date, userId);
            return {counted, rank: first?.rank ?? 0, total: first?.total ?? 0};
        }
        return {counted, ...await this.repo.rankOf(date, gameCode, durationMs)};
    }

    // Défi déjà enregistré pour un jour passé (null s'il n'y en a pas eu ce jour-là)
    async pastChallenge(gameCode: DailyGameCode, date: string) {
        return (await this.repo.findChallenge(date, gameCode)) ?? null;
    }

    /**
     * Défis d'un mois (AAAA-MM), jusqu'à aujourd'hui inclus, du plus récent au plus ancien,
     * avec le nombre de joueurs classés et, si `userId` est donné, la réussite du joueur (temps et place).
     * Renvoie aussi le premier mois qui a des défis (bornes du sélecteur de mois).
     */
    async month(month: string, today: string, userId?: string) {
        const [year, monthIndex] = month.split("-").map(Number);
        const lastDay = new Date(Date.UTC(year!, monthIndex!, 0)).getUTCDate();
        const monthEnd = `${month}-${String(lastDay).padStart(2, "0")}`;
        const to = monthEnd < today ? monthEnd : today;

        const [rows, first] = await Promise.all([this.repo.listRange(`${month}-01`, to), this.repo.firstDate()]);
        const dates = [...new Set(rows.map(r => r.date))];
        const mine = userId ? await this.repo.resultsOf(userId, dates) : [];
        const order = Object.keys(DAILY_GAMES);

        const days = await Promise.all(dates.map(async date => ({
            date,
            games: await Promise.all(rows
                .filter(r => r.date === date)
                .sort((a, b) => order.indexOf(a.game_code) - order.indexOf(b.game_code))
                .map(async r => {
                    const result = mine.find(m => m.date === date && m.game_code === r.game_code);
                    return {
                        code: r.game_code,
                        size: r.grid_size,
                        emptyCells: r.empty_cells,
                        players: Number(r.players),
                        result: result
                            ? {durationMs: result.duration_ms, ...await this.repo.rankOf(date, r.game_code, result.duration_ms)}
                            : null,
                    };
                })),
        })));

        return {
            month,
            today,
            firstMonth: (first ?? today).slice(0, 7),
            currentMonth: today.slice(0, 7),
            days,
        };
    }

    async leaderboard(gameCode: DailyGameCode, date: string, limit = 20) {
        const rows = await this.repo.leaderboard(date, gameCode, limit);
        return rows.map((row, i) => ({rank: i + 1, username: row.username, durationMs: row.duration_ms}));
    }
}
