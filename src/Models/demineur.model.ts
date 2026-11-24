// Partie de Démineur : case = ligne × taille + colonne ; revealed = [case, mines voisines]
export type DemineurPuzzle = {
    size: number;
    mines: number;
    revealed: [number, number][];
};

export type DemineurReveal =
    | { kind: "revealed"; cells: [number, number][] }
    | { kind: "exploded"; cell: number; mines: number[] };
