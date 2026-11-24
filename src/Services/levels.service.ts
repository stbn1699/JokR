import {api} from "../api/api.ts";
import type {DailyStart} from "../Models/daily.model.ts";

/*
 * Mode Niveaux des puzzles (voir backend/src/utils/levels.ts).
 * Joueur connecté : sa progression est sur le serveur. Invité : elle est gardée dans ce navigateur
 * (sans XP ni crédits), et ne rejoint pas son compte s'il en crée un ensuite.
 */

// Jeux qui ont un mode Niveaux (la carte de ces jeux ouvre la carte des niveaux)
export const LEVEL_GAMES = new Set([
    "QUEENS", "GALAXIES", "BINERO", "SUDOKU", "SHIKAKU", "TECTONIC", "RIKUDO", "TRACE",
    // jeux ajoutés depuis 3.3 : pour l'instant, les 3 leçons du tutoriel guidé
    "COLORIA", "TUYAUX", "LIENS", "BOUCHON", "PATURAGES", "BOUCLE", "DEMINEUR", "DEVIMOT", "ECHELLE", "MOTSMELES", "MOTSACASER",
]);

export type LevelInfo = { level: number; size: number; hints: number; done: boolean; bestMs: number | null };
export type LevelsOverview = { tutorial: number; levels: LevelInfo[] };
// Résumé d'un jeu pour l'accueil : niveaux réussis et le plus haut réussi
export type LevelsSummary = { count: number; tutorial: number; done: number; highest: number };

const guestKey = (gameCode: string) => `jokr:levels:${gameCode}`;

// Niveaux réussis par un invité, dans ce navigateur
export function guestDone(gameCode: string): number[] {
    try {
        const list = JSON.parse(localStorage.getItem(guestKey(gameCode)) ?? "[]") as unknown;
        return Array.isArray(list) ? list.filter((n): n is number => Number.isInteger(n)) : [];
    } catch {
        return [];
    }
}

export function rememberGuestLevel(gameCode: string, level: number) {
    try {
        const done = new Set(guestDone(gameCode));
        done.add(level);
        localStorage.setItem(guestKey(gameCode), JSON.stringify([...done].sort((a, b) => a - b)));
    } catch {
        // stockage indisponible : la progression ne sera pas gardée
    }
}

export const levelsService = {
    summary(signal?: AbortSignal): Promise<Record<string, LevelsSummary>> {
        return api<Record<string, LevelsSummary>>("/levels", {method: "GET"}, signal);
    },

    overview(gameCode: string, signal?: AbortSignal): Promise<LevelsOverview> {
        return api<LevelsOverview>(`/levels/${encodeURIComponent(gameCode)}`, {method: "GET"}, signal);
    },

    // Commence un niveau : même forme qu'un défi du jour (la page de jeu le charge de la même façon)
    start<Grid>(gameCode: string, level: number): Promise<DailyStart<Grid>> {
        return api<DailyStart<Grid>>(`/levels/${encodeURIComponent(gameCode)}/${level}/start`, {method: "POST"});
    },
};
