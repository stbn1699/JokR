export type Game = {
    id: string;
    label: string;
    description: string;
};

export const MORPION_GAME: Game = {
    id: "morpion",
    label: "Morpion",
    description: "Affrontez vos amis sur la grille 3×3 classique.",
};

export const GAMES: Game[] = [MORPION_GAME];
