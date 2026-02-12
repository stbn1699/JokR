/*
 * Type représentant les statistiques d'un utilisateur pour un jeu donné
 * - user_id : identifiant de l'utilisateur
 * - game_code : code du jeu
 * - games_won : nombre de victoires
 * - game_level : niveau sur ce jeu
 * - game_xp : XP accumulé dans ce jeu
 */
export type GameStats = {
    user_id: string;
    game_code: string;
    games_won: number;
    game_level: number;
    game_xp: number;
}