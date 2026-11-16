import type {RikudoPuzzle} from "./rikudo.js";

/*
 * Niveaux du Rikudo (mode Niveaux) : grilles fixes, les mêmes pour tout le monde, de plus en plus difficiles.
 * Pour l'instant, les leçons du tutoriel guidé pas à pas (src/Components/Levels/RikudoTutorial.tsx), sur un petit
 * plateau de 2 anneaux (18 cases). Leurs grilles sont choisies pour obliger à utiliser la leçon du niveau
 * (voir src/Components/Levels/rikudoGuide.ts) :
 * 1. le chaînon manquant : entre le 5 et le 7, le 6 touche les deux
 * 2. la bonne distance : un nombre reste à portée des nombres posés avant et après lui
 * 3. les points : une case reliée par un point à un nombre posé prend le nombre juste avant ou juste après
 * Ne pas modifier une grille publiée : la progression des joueurs est enregistrée par numéro de niveau.
 */

export const RIKUDO_TUTORIAL = 3;

const _ = null;

export const RIKUDO_LEVELS: RikudoPuzzle[] = [
    // 1 · le chaînon manquant
    {radius: 2, links: [], cells: [_, 3, _, _, 5, 1, 18, 7, 8, _, 16, _, 11, 14, 15, 10, _, 13]},
    // 2 · la bonne distance
    {radius: 2, links: [], cells: [4, _, _, _, 5, _, 1, _, 18, _, _, 15, 14, 11, 9, 13, 12, _]},
    // 3 · les points
    {radius: 2, links: [[1, 2], [15, 16], [13, 17]], cells: [18, 1, _, 17, _, _, 4, _, 15, _, 5, 13, _, 9, _, _, 10, _]},
];
