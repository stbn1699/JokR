/*
 * Type utilisé lors de la création d'un nouvel utilisateur (payload d'inscription)
 */
export type NewUser = {
    username: string;
    email: string;
    password: string;
    // graine de l'icône choisie à l'inscription (sinon : au hasard, par la base)
    avatar?: string | undefined;
};