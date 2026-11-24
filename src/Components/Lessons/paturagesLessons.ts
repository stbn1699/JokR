import type {PaturagesSquare} from "../../Models/paturages.model.ts";
import type {CoachStep, GameLessons} from "./useLessonCoach.tsx";

// Leçons de Pâturages (prés dans backend/src/utils/gridLessons.ts)
type State = { size: number; squares: PaturagesSquare[] };

const sq = (row: number, col: number, side: number): PaturagesSquare => ({row, col, side});
const SOLUTIONS: Record<number, PaturagesSquare[]> = {
    1: [sq(0, 0, 2), sq(0, 2, 2), sq(2, 0, 2), sq(2, 2, 2)],
    2: [sq(0, 0, 3), sq(0, 3, 2), sq(2, 3, 2), sq(3, 0, 2), sq(3, 2, 1), sq(4, 2, 1), sq(4, 3, 1), sq(4, 4, 1)],
    3: [sq(0, 0, 4), sq(0, 4, 2), sq(2, 4, 2), sq(4, 0, 1), sq(4, 1, 1), sq(4, 2, 2), sq(4, 4, 2), sq(5, 0, 1), sq(5, 1, 1)],
};

const placed = (s: State, square: PaturagesSquare) =>
    s.squares.some(p => p.row === square.row && p.col === square.col && p.side === square.side);
const cellsOf = (size: number, ...squares: PaturagesSquare[]) => squares.flatMap(({row, col, side}) =>
    Array.from({length: side * side}, (_, i) => (row + Math.floor(i / side)) * size + col + i % side));
const draw = (level: number, size: number, indexes: number[], text: string): CoachStep<State> => {
    const squares = indexes.map(i => SOLUTIONS[level]![i]!);
    return {text, lit: cellsOf(size, ...squares), done: s => squares.every(square => placed(s, square))};
};
const finish = (level: number, text: string): CoachStep<State> => ({text, done: s => SOLUTIONS[level]!.every(square => placed(s, square))});

export const PATURAGES_LESSONS: GameLessons<State> = {
    titles: ["Une vache, un carré", "Les vaches serrées", "Le grand carré"],
    steps: level => {
        if (level === 1) {
            return [
                {text: "Bienvenue dans Pâturages ! Découpe tout le pré en carrés, avec exactement une vache dans chaque carré."},
                draw(1, 4, [0], "Glisse d'un coin à l'autre pour tracer le carré qui brille, autour de cette vache."),
                {text: "Le pré a 16 cases pour 4 vaches : ici, chaque vache prend un carré de 2×2. Un carré se retire d'un clic.", lit: cellsOf(4, ...SOLUTIONS[1]!.slice(1))},
                finish(1, "À toi : trace les trois autres carrés, sans laisser de case vide."),
            ];
        }
        if (level === 2) {
            return [
                {text: "Leçon 2 : les vaches serrées. Deux vaches côte à côte ne sont jamais dans le même carré."},
                draw(2, 5, [7], "Cette vache est dans le coin, collée à une autre : tout carré plus grand que 1×1 les prendrait toutes les deux. Clique sur sa case pour lui poser un carré d'une case."),
                draw(2, 5, [6], "Même chose pour sa voisine, coincée entre deux vaches."),
                draw(2, 5, [5], "Et pour la suivante : tout carré plus grand toucherait une autre vache."),
                finish(2, "À toi de finir : cherche pour chaque vache le seul carré qui ne déborde ni sur une autre vache ni sur un carré déjà posé."),
            ];
        }
        return [
            {text: "Leçon 3 : le grand carré. Une case vide doit toujours finir dans le carré d'une vache : regarde quelle vache peut l'atteindre."},
            draw(3, 6, [3, 4, 7, 8], "D'abord, ces quatre vaches serrées : chacune a son carré d'une case."),
            draw(3, 6, [0], "Il reste tout ce coin, et une seule vache pour le couvrir : son carré va de la case du coin jusqu'à elle, c'est un grand carré de 4×4."),
            finish(3, "À toi de finir le pré !"),
        ];
    },
};
