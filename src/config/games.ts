export type GameId = "morpion" | "yatzee" | "trio" | "uno" | "canasta" | "poker";

export interface GameDefinition {
    id: GameId;
    name: string;
    description?: string;
}

export const GAMES: GameDefinition[] = [
    {id: "morpion", name: "Morpion", description: "Tic-Tac-Toe classique à deux joueurs."},
    {id: "yatzee", name: "Yatzee", description: "Jeu de dés avec combinaisons."},
    {id: "trio", name: "Trio", description: "Jeu de cartes à trois symboles."},
    {id: "uno", name: "Uno", description: "Jeu de cartes rapide et chaotique."},
    {id: "canasta", name: "Canasta", description: "Jeu de cartes par équipes."},
    {id: "poker", name: "Poker", description: "Classique des jeux de cartes."},
];
