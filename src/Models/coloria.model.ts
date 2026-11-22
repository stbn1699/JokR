// Partie de Coloria : `regions` = zone de chaque case, `given` = couleur donnée de chaque zone (-1 : à trouver)
export type ColoriaPuzzle = {
    width: number;
    zones: number;
    colors: number;
    regions: number[];
    given: number[];
};
