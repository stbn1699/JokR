// Page Statistiques (GET /stats, administrateur uniquement)

export type StatsCounts = { mobile: number; tablet: number; desktop: number; unknown: number };

export interface GameStatsRow {
    code: string;
    name: string;
    started: number;
    started30: number;
    finished: number;
    abandoned: number;
    guests: number;
    players: number;
    avgMs: number | null;
    medianMs: number | null;
    bestMs: number | null;
    failedAttempts: number;
    modes: { free: number; daily: number; replay: number };
    devices: StatsCounts;
}

export interface StatsData {
    generatedAt: string;
    overview: {
        users: {
            total: number; new1: number; new7: number; new30: number;
            active1: number; active7: number; active30: number;
            creditsHeld: number; avgLevel: number; maxLevel: number;
        };
        sessions: {
            started: number; finished: number; abandoned: number; inProgress: number; guests: number;
            started1: number; started7: number; started30: number; failedAttempts: number;
            players7: number; players30: number; firstStarted: string | null;
        };
        rewards: { xp: number; credits: number; wins: number };
        daily: { challenges: number; completions: number; players: number; completions30: number };
    };
    games: GameStatsRow[];
    configs: { gameCode: string; gridSize: number; emptyCells: number; started: number; finished: number; medianMs: number | null }[];
    timeline: {
        day: string; started: number; finished: number; players: number; newUsers: number; dailyCompletions: number;
        byGame: Record<string, number>;
    }[];
    rhythm: { byHour: number[]; byWeekday: number[] };
    daily: { day: string; gameCode: string; started: number; completions: number; medianMs: number | null }[];
    levels: { from: number; to: number; players: number }[];
    topPlayers: {
        username: string; level: number; credits: number; createdAt: string | null; lastSeenAt: string | null;
        lastGame: string | null; started: number; finished: number; dailyCompletions: number;
    }[];
}

// Données brutes (GET /stats/export)
export interface StatsExport {
    exportedAt: string;
    sessions: Record<string, unknown>[];
    users: Record<string, unknown>[];
    results: Record<string, unknown>[];
    dailyResults: Record<string, unknown>[];
    dailyChallenges: Record<string, unknown>[];
}
