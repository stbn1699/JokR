/*
 * Type représentant un jeu dans la base de données
 * - code : identifiant unique (string)
 * - designation : nom affichable
 * - base_xp : XP de base attribué pour ce jeu
 * - added_in : version du site à laquelle le jeu est apparu
 */
export type Game = {
	code: string;
	designation: string;
    base_xp: number;
    added_in: string;
};
