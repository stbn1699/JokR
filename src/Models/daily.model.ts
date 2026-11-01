// Place au défi du jour
export interface DailyRanking {
    rank: number;
    total: number;
}

// Réussite du défi du jour par le joueur
export interface DailyResult extends DailyRanking {
    durationMs: number;
}

// GET /daily
export interface DailyOverview {
    date: string;
    games: {
        code: string;
        size: number;
        emptyCells: number;
        // Réussite du joueur connecté aujourd'hui (null si pas encore ou invité)
        result: DailyResult | null;
    }[];
}

// POST /daily/:game/start
export type DailyStart<Grid> =
    | { date: string; alreadyDone: true; result: DailyResult }
    | { date: string; alreadyDone: false; gameId: string; grid: Grid; size: number; emptyCells: number };

// GET /daily/:game/leaderboard
export interface DailyLeaderboard {
    date: string;
    entries: { rank: number; username: string; durationMs: number }[];
    me: DailyResult | null;
}
