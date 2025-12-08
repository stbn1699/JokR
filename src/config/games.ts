export type GameId = "morpion" | "yatzee" | "trio" | "uno" | "canasta" | "poker";

export interface GameDefinition {
    id: GameId;
    name: string;
    description: string;
    playerNumbers: number[];
}

export const GAMES: GameDefinition[] = [
    {id: "morpion", name: "Morpion", description: "Tic-Tac-Toe classique à deux joueurs.", playerNumbers: [2]},
];
