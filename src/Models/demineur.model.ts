// Partie de Démineur : case = ligne × taille + colonne ; revealed = [case, mines voisines]
export type DemineurPuzzle = {
    size: number;
    mines: number;
    revealed: [number, number][];
    // défi du jour : mines déjà sautées (la partie continue, avec du temps en plus)
    blown?: number[];
};

export type DemineurReveal =
    | { kind: "revealed"; cells: [number, number][] }
    | { kind: "exploded"; cell: number; mines: number[] }
    // défi du jour : la mine reste visible et le chrono prend du temps en plus
    | { kind: "penalty"; cell: number; penaltyMs: number };
