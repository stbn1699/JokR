// Statistiques des jeux de hasard (GET /stats/casino, administrateur) ; montants en crédits

export type CasinoGameStats = {
    game: string;
    plays: number;
    plays7: number;
    players: number;
    wagered: number;
    paid: number;
    avgBet: number;
    // plus gros gain net en une mise
    bestNet: number;
    // mises qui ont rapporté plus que la mise
    won: number;
};

export type CasinoDayStats = {
    day: string;
    plays: number;
    wagered: number;
    paid: number;
    byGame: Record<string, { plays: number; wagered: number; paid: number }>;
};

export type CasinoPlayerStats = {
    username: string;
    plays: number;
    wagered: number;
    paid: number;
    // gain net (rendu - misé) : négatif pour un joueur qui a perdu
    net: number;
    credits: number;
    biggest: number;
    last: string;
    games: string[];
};

export type CasinoStatsData = {
    generatedAt: string;
    overview: {
        plays: number; wagered: number; paid: number; players: number; players7: number;
        plays1: number; wagered1: number; paid1: number; won: number; even: number; first: string | null;
    };
    games: CasinoGameStats[];
    timeline: CasinoDayStats[];
    hours: { hour: number; plays: number; wagered: number }[];
    plinkoSlots: { slot: number; drops: number; paid: number }[];
    plinkoBets: { bet: number; drops: number; players: number }[];
    // nombre de fois où chaque numéro (0 à 36) est sorti
    rouletteNumbers: number[];
    rouletteRounds: {
        drawn: number; firstDrawn: string | null; withBets: number; seats: number; chips: number;
        wagered: number; biggestPot: number; maxPlayers: number;
    };
    betKinds: { kind: string; chips: number; players: number; wagered: number; paid: number }[];
    favoriteNumbers: { number: number; chips: number; wagered: number; players: number }[];
    players: CasinoPlayerStats[];
    biggestWins: { username: string; game: string; bet: number; payout: number; outcome: number; at: string }[];
    // machines à sous, keno, blackjack, poker : résultat de chaque partie (lignes gagnantes, numéros trouvés, mains,
    // rang de la combinaison) et mises choisies
    outcomes: { game: string; outcome: number; plays: number; wagered: number; paid: number }[];
    betSizes: { game: string; bet: number; plays: number; players: number }[];
    // machines à sous : par machine (rang dans SLOT_MACHINES) et nombre de lignes jouées
    slotMachines: { machine: number; lines: number; plays: number; players: number; wagered: number; paid: number; won: number }[];
    // blackjack, main par main
    blackjackHands: { outcome: string; hands: number; doubled: number; split: number; wagered: number; paid: number }[];
};
