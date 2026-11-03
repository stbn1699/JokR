// Profil public renvoyé par GET /users/:userId (pas d'email ni de mot de passe)
export interface User {
    id: string;
    username: string;
    user_level: number;
    user_xp: number;
    // Crédits à miser sur les jeux de hasard
    credits: number;
    // Graine de l'icône de profil (voir Services/avatar.ts)
    avatar: string;
    // Seulement dans GET /users/me : accès à la page Statistiques
    isAdmin?: boolean;
    // Seulement dans GET /users/me : false pour un compte créé avec Google / Discord sans mot de passe
    hasPassword?: boolean;
    // Seulement dans GET /users/me : comptes Google / Discord liés
    linkedAccounts?: { provider: string; displayName: string | null }[];
}
