// Partie de Bouchon : le véhicule 0 est le taxi, à amener à droite de la ligne de sortie
export type BouchonVehicle = { row: number; col: number; length: number; horizontal: boolean };
export type BouchonPuzzle = {
    size: number;
    exitRow: number;
    vehicles: BouchonVehicle[];
    minMoves: number;
};
// Un coup : [véhicule, nouvelle position sur son axe]
export type BouchonMove = [number, number];
