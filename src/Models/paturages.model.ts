// Partie de Pâturages : cases des vaches (case = ligne × taille + colonne) et carrés déjà posés
export type PaturagesSquare = { row: number; col: number; side: number };
export type PaturagesPuzzle = {
    size: number;
    cows: number[];
    given: PaturagesSquare[];
};
