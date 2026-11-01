import type {User} from "./User.model.js";

/*
 * Profil utilisateur renvoyé par l'API : jamais de mot de passe ni d'email.
 */
export type PublicUser = Omit<User, "password" | "email">;

export function toPublicUser(user: User): PublicUser {
    return {
        id: user.id,
        username: user.username,
        user_level: user.user_level,
        user_xp: user.user_xp,
    };
}
