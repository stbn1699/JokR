// Jeu tel que renvoyé par GET /games/list
export interface Game {
    code: string;
    designation: string;
    base_xp: number;
    // Version du site à laquelle le jeu est apparu (pastille « Nouveau »)
    added_in?: string;
}
