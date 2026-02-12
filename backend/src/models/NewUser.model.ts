/*
 * Type utilisé lors de la création d'un nouvel utilisateur (payload d'inscription)
 */
export type NewUser = {
    username: string;
    email: string;
    password: string;
};