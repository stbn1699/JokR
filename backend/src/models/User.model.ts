/*
 * Type représentant un utilisateur dans l'application
 * - id : identifiant unique (UUID)
 * - username : nom d'affichage / identifiant public
 * - email : adresse email unique (null si inscrit avec Google / Discord sans email vérifié)
 * - password : mot de passe hashé, null si inscrit avec Google / Discord (ne jamais exposer côté client)
 * - user_level : niveau de l'utilisateur dans le système de progression
 * - user_xp : XP courante de l'utilisateur
 * - credits : crédits à miser sur les jeux de hasard
 * - is_admin : accès à la page Statistiques (jamais renvoyé dans un profil public)
 */
export type User = {
	id: string;
	username: string;
	email: string | null;
	password: string | null;
    user_level: number;
    user_xp: number;
    credits: number;
    is_admin: boolean;
};
