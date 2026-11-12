import type { ColumnType, Generated } from "kysely";

/*
 * Déclarations de type représentant le schéma de la base de données pour Kysely.
 * Chaque Table type décrit les colonnes et leurs types.
 */
export type GamesTable = {
	code: string;
	designation: string;
    base_xp: number;
    // Version du site à laquelle le jeu est apparu (pastille « Nouveau »)
    added_in: Generated<string>;
};

export type UsersTable = {
	id: Generated<string>;
	username: string;
	// null : inscrit avec Google / Discord sans email vérifié
	email: string | null;
	// null : inscrit avec Google / Discord, sans mot de passe
	password: string | null;
    user_level: number;
    user_xp: number;
    // Crédits à miser sur les jeux de hasard (gagnés en finissant des puzzles)
    credits: Generated<number>;
    created_at: Generated<Date>;
    // Dernière activité (requête authentifiée), null si jamais vu depuis l'ajout de la colonne
    last_seen_at: Date | null;
    // Administrateur (page Statistiques) : modifié directement en base, sans redémarrage
    is_admin: Generated<boolean>;
    // Icône de profil : graine texte (a-z0-9), dessinée par le site
    avatar: Generated<string>;
    // Visibilité de sa page pour les autres joueurs (stats, dernières victoires)
    show_stats: Generated<boolean>;
    show_history: Generated<boolean>;
    // Dernière version du site vue (popup des nouveautés), null pour un compte tout neuf
    last_version: string | null;
    // Fond du site choisi dans la boutique (null : fond par défaut)
    background: string | null;
    // bille de Plinko choisie dans la boutique (null : bille par défaut)
    plinko_ball: string | null;
    // jeu de jetons choisi dans la boutique (null : jetons classiques)
    chip_set: string | null;
    // mode admin (« mode fantôme ») actif : voir services/adminMode.ts
    admin_mode: Generated<boolean>;
};

// Boutique : objets achetés
export type UserItemsTable = {
    user_id: string;
    item_id: string;
    price: number;
    purchased_at: Generated<Date>;
};

// Comptes Google / Discord liés à un joueur
export type UserIdentitiesTable = {
    provider: string;
    provider_user_id: string;
    user_id: string;
    email: string | null;
    display_name: string | null;
    created_at: Generated<Date>;
};

export type GameStatsTable = {
    user_id: string;
    game_code: string;
    games_won: number;
    game_level: number;
    game_xp: number;
}

// Une ligne par partie gagnée (historique, temps, records)
export type GameResultsTable = {
    id: Generated<string>;
    user_id: string;
    game_code: string;
    grid_size: number;
    empty_cells: number;
    duration_ms: number;
    xp: number;
    credits: number;
    finished_at: Generated<Date>;
};

// Défi du jour : une grille par jeu et par jour (puzzle stocké en JSON)
export type DailyChallengesTable = {
    challenge_date: string;
    game_code: string;
    // lu tel quel (JSON déjà décodé), écrit sous forme de texte JSON
    puzzle: ColumnType<unknown, string, string>;
    grid_size: number;
    empty_cells: number;
    created_at: Generated<Date>;
};

// Une réussite du défi par joueur, jeu et jour
export type DailyResultsTable = {
    challenge_date: string;
    game_code: string;
    user_id: string;
    duration_ms: number;
    finished_at: Generated<Date>;
};

// Statistiques : une ligne par partie lancée (invités compris)
export type GameSessionsTable = {
    id: Generated<string>;
    game_id: string | null;
    game_code: string;
    mode: GameMode;
    user_id: string | null;
    logged_in: boolean;
    grid_size: number;
    empty_cells: number;
    device: Device | null;
    started_at: Generated<Date>;
    finished_at: Date | null;
    duration_ms: number | null;
    failed_attempts: Generated<number>;
};

// Notifications des joueurs (cloche du header)
export type NotificationsTable = {
    id: Generated<string>;
    user_id: string;
    // sorte : daily_results (places aux défis d'un jour)
    kind: string;
    // ce qu'elle concerne (ex. date du défi) : une seule par joueur, sorte et ref
    ref: string;
    // lu tel quel (JSON déjà décodé), écrit sous forme de texte JSON
    data: ColumnType<unknown, string, string>;
    created_at: Generated<Date>;
    // null tant que le joueur ne l'a pas vue
    read_at: Date | null;
};

// Amis : demande (pending) puis amitié acceptée (accepted)
export type FriendshipsTable = {
    requester_id: string;
    addressee_id: string;
    status: Generated<"pending" | "accepted">;
    created_at: Generated<Date>;
    accepted_at: Date | null;
};

// Défis entre amis : grille envoyée, et amis défiés (partie lancée, temps)
export type FriendChallengesTable = {
    id: Generated<string>;
    sender_id: string;
    game_code: string;
    // lu tel quel (JSON déjà décodé), écrit sous forme de texte JSON
    puzzle: ColumnType<unknown, string, string>;
    grid_size: number;
    empty_cells: number;
    sender_ms: number;
    created_at: Generated<Date>;
};

export type FriendChallengePlayersTable = {
    challenge_id: string;
    user_id: string;
    game_id: string | null;
    duration_ms: number | null;
    finished_at: Date | null;
};

export type GameMode = "free" | "daily" | "replay";
export type Device = "mobile" | "tablet" | "desktop";

export type FeedbackTable = {
    id: Generated<string>;
    user_id: string;
    // bug (problème signalé) ou idea (amélioration suggérée)
    kind: string;
    message: string;
    // page d'où le joueur a écrit, navigateur et appareil
    page: string | null;
    user_agent: string | null;
    created_at: Generated<Date>;
    // null tant que l'administrateur ne l'a pas traité
    done_at: Date | null;
};

export type CasinoPlaysTable = {
    id: Generated<string>;
    user_id: string;
    // plinko ou roulette
    game: string;
    bet: number;
    payout: number;
    // graine du tirage (bigint en base : lue comme texte, écrite comme nombre)
    seed: ColumnType<string, number, number>;
    // résultat (Plinko : numéro de la case)
    outcome: number;
    created_at: Generated<Date>;
};

// Roulette en direct : numéro tiré à chaque tour (bigint en base, lu comme texte : à convertir avec Number)
export type RouletteRoundsTable = {
    id: number;
    number: number;
    drawn_at: Generated<Date>;
};

// Tirages des loteries du Hasard (jour, semaine, mois) ; winner_id null : personne n'avait de ticket
export type LotteryDrawsTable = {
    id: Generated<number>;
    kind: string;
    draw_date: string;
    period_start: Date;
    period_end: Date;
    total_bet: number;
    total_tickets: number;
    prize: number;
    winner_id: string | null;
    winner_tickets: number | null;
    drawn_at: Generated<Date>;
};

// Jetons de la roulette en direct ; payout reste null tant que le tour n'est pas payé
export type RouletteBetsTable = {
    id: Generated<string>;
    round_id: number;
    user_id: string;
    key: string;
    amount: number;
    payout: number | null;
    // posé en mode admin : invisible des autres, sans crédits, absent des statistiques
    ghost: Generated<boolean>;
    created_at: Generated<Date>;
};

export type DB = {
	games: GamesTable;
	users: UsersTable;
    user_identities: UserIdentitiesTable;
    game_stats: GameStatsTable;
    game_results: GameResultsTable;
    daily_challenges: DailyChallengesTable;
    daily_results: DailyResultsTable;
    game_sessions: GameSessionsTable;
    notifications: NotificationsTable;
    friendships: FriendshipsTable;
    friend_challenges: FriendChallengesTable;
    friend_challenge_players: FriendChallengePlayersTable;
    user_items: UserItemsTable;
    feedback: FeedbackTable;
    casino_plays: CasinoPlaysTable;
    roulette_rounds: RouletteRoundsTable;
    roulette_bets: RouletteBetsTable;
    lottery_draws: LotteryDrawsTable;
};

