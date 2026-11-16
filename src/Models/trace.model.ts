// Paramètres proposés avant une partie de Tracé (GET /trace/settings)
export interface TraceSizeSettings {
    // Côté de la grille (5 à 8)
    size: number;
    // Numéros donnés en plus de ceux qu'il faut (plus = plus facile)
    minHints: number;
    maxHints: number;
    defaultHints: number;
    // XP et crédits gagnés à la résolution, pour chaque nombre de numéros en plus
    xpByHints: Record<number, number>;
    creditsByHints: Record<number, number>;
}

export interface TraceSettings {
    defaultSize: number;
    sizes: TraceSizeSettings[];
}

// Grille envoyée par le serveur (même forme que TracePuzzle dans backend/src/utils/trace.ts)
export type {TracePuzzle} from "../../backend/src/utils/trace.ts";
