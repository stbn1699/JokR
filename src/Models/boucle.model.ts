// Partie de Boucle : les murs séparent deux cases voisines (case = ligne × taille + colonne)
export type BouclePuzzle = {
    size: number;
    walls: [number, number][];
};
