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
    // Temps avant le prochain changement de jour (minuit à Paris), en ms
    nextInMs: number;
    // Défis du jour déjà générés
    ready: boolean;
    // XP et crédits multipliés par ce nombre au défi du jour
    rewardMultiplier: number;
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
    nextInMs: number;
    entries: { rank: number; username: string; durationMs: number }[];
    me: DailyResult | null;
}

// Un jour de la page des défis (GET /daily/history)
export interface DailyHistoryDay {
    date: string;
    games: {
        code: string;
        size: number;
        emptyCells: number;
        // Nombre de joueurs classés ce jour-là
        players: number;
        // Réussite du joueur connecté ce jour-là (null si pas joué ou invité)
        result: DailyResult | null;
    }[];
}

// GET /daily/history?month=AAAA-MM : défis d'un mois, du plus récent au plus ancien (aujourd'hui compris)
export interface DailyMonth {
    month: string;
    today: string;
    // Premier mois qui a des défis, et mois courant (bornes du sélecteur)
    firstMonth: string;
    currentMonth: string;
    days: DailyHistoryDay[];
}
