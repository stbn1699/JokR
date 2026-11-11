import {rouletteRoundAt} from "../utils/roulette.js";

/*
 * Mode maintenance : avant une mise à jour, l'administrateur ferme le site (onglet « En direct » des Statistiques).
 * Chaque joueur passe sur l'écran « Mise à jour en cours » une fois sa partie finie (tout de suite hors partie,
 * à la dernière bille de Plinko, à la fin du dernier tour de roulette, à la grille validée ou au bout de
 * PUZZLE_GRACE_MS pour un puzzle), et le serveur refuse toute nouvelle partie :
 * - puzzles, défis du jour et défis entre amis : plus de nouvelle grille ; une partie déjà commencée se valide
 * - Plinko : plus de nouvelle bille (celles déjà lâchées finissent de tomber chez le joueur)
 * - roulette : le tour en cours au moment de la coupure se joue jusqu'au bout (dernier tour), puis plus de mise
 * Gardé en mémoire : un redémarrage du serveur (la mise à jour) rouvre tout.
 */

export const MAINTENANCE_MESSAGE = "Mise à jour en cours, nous revenons dans quelques minutes.";

// Temps laissé aux joueurs en plein puzzle pour finir leur grille, une fois la mise à jour activée
export const PUZZLE_GRACE_MS = 2 * 60 * 1000;

export type MaintenanceState = {
    // moment de la coupure (ms, temps Unix)
    since: number;
    // dernier tour de roulette où l'on peut encore miser
    lastRound: number;
};

let state: MaintenanceState | null = null;

export const maintenance = {
    get: (): MaintenanceState | null => state,

    start(now = Date.now()): MaintenanceState {
        state ??= {since: now, lastRound: rouletteRoundAt(now)};
        return state;
    },

    stop(): void {
        state = null;
    },

    // nouvelle partie de puzzle, nouvelle bille de Plinko
    blocksNewGames: (): boolean => state !== null,

    // mise refusée sur ce tour de roulette (tours après le dernier)
    blocksRound: (round: number): boolean => state !== null && round > state.lastRound,
};
