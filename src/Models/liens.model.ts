// Partie de Liens : les deux cases de chaque paire, ligne par ligne (case = ligne × taille + colonne)
export type LiensPuzzle = {
    size: number;
    pairs: [number, number][];
};
