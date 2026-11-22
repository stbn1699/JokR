// Partie de Tuyaux : chaque pièce est un masque de ses sorties (1 haut, 2 droite, 4 bas, 8 gauche)
export type TuyauxPuzzle = {
    size: number;
    tiles: number[];
    // cases données : déjà bien orientées, elles ne tournent pas
    locked: number[];
};
