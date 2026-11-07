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
    // Seulement dans GET /users/me : ce que les autres joueurs voient sur sa page
    privacy?: Privacy;
    // Seulement dans GET /users/me : dernière version du site vue (null pour un compte tout neuf)
    lastVersion?: string | null;
    // Seulement dans GET /users/me : fond du site choisi dans la boutique (null : fond par défaut)
    background?: string | null;
}

// Visibilité de sa page pour les autres joueurs (le pseudo, l'icône et le niveau restent visibles)
export interface Privacy {
    // chiffres clés, stats par jeu, XP et date d'inscription
    showStats: boolean;
    // dernières victoires
    showHistory: boolean;
}
