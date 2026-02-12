/*
 * Type représentant un jeu dans la base de données
 * - code : identifiant unique (string)
 * - designation : nom affichable
 * - base_xp : XP de base attribué pour ce jeu
 */
export type Game = {
	code: string;
	designation: string;
    base_xp: number;
};
