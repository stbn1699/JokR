import type {DailyRanking, DailyRepository} from "../repository/Daily.repository.js";
import type {SudokuService} from "./Sudoku.service.js";
import type {BineroService} from "./Binero.service.js";

/*
 * Défi du jour : une grille par jeu et par jour, la même pour tout le monde.
 * Elle est générée à la première demande du jour puis conservée en base.
 */

// Difficulté du défi pour chaque jeu
export const DAILY_GAMES = {
    SUDOKU: {size: 9, emptyCells: 45},
    BINERO: {size: 10, emptyCells: 50},
} as const;

export type DailyGameCode = keyof typeof DAILY_GAMES;

export const isDailyGame = (code: string): code is DailyGameCode => code in DAILY_GAMES;

export class DailyService {
    constructor(
        private repo: DailyRepository,
        private sudoku: SudokuService,
        private binero: BineroService,
    ) {
    }

    // Grille du défi (générée et enregistrée si c'est la première demande du jour)
    async challenge(gameCode: DailyGameCode, date: string) {
        const existing = await this.repo.findChallenge(date, gameCode);
        if (existing) return existing;

        const {size, emptyCells} = DAILY_GAMES[gameCode];
        const puzzle = gameCode === "SUDOKU"
            ? await this.sudoku.generate(81 - emptyCells)
            : this.binero.generate(size, size * size - emptyCells);

        await this.repo.insertChallenge(date, gameCode, puzzle, size, emptyCells);
        // Relecture : si deux joueurs ont lancé la génération en même temps, tous deux ont la même grille
        return (await this.repo.findChallenge(date, gameCode))!;
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

    async leaderboard(gameCode: DailyGameCode, date: string, limit = 20) {
        const rows = await this.repo.leaderboard(date, gameCode, limit);
        return rows.map((row, i) => ({rank: i + 1, username: row.username, durationMs: row.duration_ms}));
    }
}
