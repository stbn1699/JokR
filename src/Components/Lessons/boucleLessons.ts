import type {BouclePuzzle} from "../../Models/boucle.model.ts";
import {linkKey, wallKeys} from "../Boucle/boucleRules.ts";
import type {CoachStep, GameLessons} from "./useLessonCoach.tsx";

// Leçons de Boucle (grilles dans backend/src/utils/gridLessons.ts)
type State = { puzzle: BouclePuzzle; links: number[]; loops: number };

// Voisines d'une case qui ne sont ni hors du plateau ni derrière un mur
function exits(puzzle: BouclePuzzle, cell: number): number[] {
    const {size} = puzzle, walls = wallKeys(puzzle);
    const row = Math.floor(cell / size), col = cell % size;
    return [row > 0 ? cell - size : -1, col < size - 1 ? cell + 1 : -1, row < size - 1 ? cell + size : -1, col > 0 ? cell - 1 : -1]
        .filter(other => other >= 0 && !walls.has(linkKey(cell, other, size)));
}

// Cases qui n'ont que deux sorties : la boucle passe forcément par les deux
const forcedCells = (puzzle: BouclePuzzle, corners: boolean) => {
    const last = puzzle.size * puzzle.size - 1;
    const isCorner = (cell: number) => [0, puzzle.size - 1, last - puzzle.size + 1, last].includes(cell);
    return Array.from({length: last + 1}, (_, cell) => cell).filter(cell => exits(puzzle, cell).length === 2 && isCorner(cell) === corners);
};
const throughExits = (s: State, cells: number[]) =>
    cells.every(cell => exits(s.puzzle, cell).every(other => s.links.includes(linkKey(cell, other, s.puzzle.size))));
const withExits = (s: State, cells: number[]) => [...new Set(cells.flatMap(cell => [cell, ...exits(s.puzzle, cell)]))];

const forced = (corners: boolean, text: string): CoachStep<State> => ({
    text,
    lit: s => withExits(s, forcedCells(s.puzzle, corners)),
    done: s => throughExits(s, forcedCells(s.puzzle, corners)),
});
const finish = (text: string): CoachStep<State> => ({
    text: s => (s.loops > 0 ? "Attention : cette boucle est fermée mais ne passe pas partout ! Il faudrait une seconde boucle : ouvre-la et raccorde-la au reste." : text),
    done: () => false,
});

export const BOUCLE_LESSONS: GameLessons<State> = {
    titles: ["Les coins", "Les murs", "Pas de petite boucle"],
    steps: level => {
        if (level === 1) {
            return [
                {text: "Bienvenue dans Boucle ! Trace une seule boucle fermée qui passe par toutes les cases, sans traverser les murs."},
                {
                    text: "Une case de coin n'a que deux voisines : la boucle y entre par l'une et ressort par l'autre. Glisse de case en case pour relier ce coin à ses deux voisines.",
                    lit: s => withExits(s, [0]), done: s => throughExits(s, [0]),
                },
                forced(true, "Fais de même pour les trois autres coins."),
                forced(false, "Ici, un mur ne laisse que deux sorties à cette case : la boucle passe forcément par les deux."),
                finish("À toi de fermer la boucle : chaque case a exactement deux traits."),
            ];
        }
        if (level === 2) {
            return [
                {text: "Leçon 2 : les murs. Une case entourée de murs (ou du bord) sur deux côtés n'a plus le choix : la boucle passe par ses deux sorties."},
                forced(true, "Commence par les coins."),
                forced(false, "Puis toutes ces cases à deux sorties : relie chacune à ses deux voisines."),
                finish("Il ne reste plus qu'à raccorder les morceaux en une seule boucle."),
            ];
        }
        return [
            {text: "Leçon 3 : pas de petite boucle. Fermer une boucle qui ne passe pas par toutes les cases, c'est perdu d'avance : il en faudrait une seconde."},
            forced(true, "Les coins d'abord…"),
            forced(false, "…puis les cases qui n'ont que deux sorties."),
            finish("Pour raccorder les morceaux, évite de relier les deux bouts d'un même morceau tant qu'il reste des cases à visiter."),
        ];
    },
};
