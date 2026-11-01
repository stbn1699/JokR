// Profil public renvoyé par GET /users/:userId (pas d'email ni de mot de passe)
export interface User {
    id: string;
    username: string;
    user_level: number;
    user_xp: number;
}
