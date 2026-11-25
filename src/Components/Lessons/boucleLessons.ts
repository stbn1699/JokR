import type {BouclePuzzle} from "../../Models/boucle.model.ts";
import {type BoucleRule, type BoucleStep, loopLinks} from "./boucleGuide.ts";
import type {CoachStep, GameLessons} from "./useLessonCoach.tsx";

/*
 * Leçons de Boucle (grilles dans backend/src/utils/gridLessons.ts) : quelques explications, puis le guide
 * (boucleGuide.ts) qui donne à chaque coup la déduction la plus simple : les traits à tracer sont en pointillés,
 * la case dont on parle et ses voisines en lumière, une croix sur la voisine interdite (et, pour une impasse, en rouge
 * les traits qui deviendraient forcés et la case qui se retrouverait coincée).
 */

// La boucle de chaque leçon, case par case, puis ses traits
const LOOPS: Record<number, { size: number; loop: number[] }> = {
    1: {size: 4, loop: [0, 1, 2, 3, 7, 6, 5, 9, 10, 11, 15, 14, 13, 12, 8, 4]},
    2: {size: 6, loop: [0, 1, 2, 3, 9, 8, 7, 13, 19, 25, 26, 20, 14, 15, 16, 10, 4, 5, 11, 17, 23, 22, 21, 27, 28, 29, 35, 34, 33, 32, 31, 30, 24, 18, 12, 6]},
    3: {size: 6, loop: [0, 1, 2, 3, 4, 5, 11, 10, 9, 15, 16, 17, 23, 22, 21, 20, 14, 8, 7, 13, 19, 25, 26, 27, 28, 29, 35, 34, 33, 32, 31, 30, 24, 18, 12, 6]},
};
export const BOUCLE_SOLUTIONS: Record<number, number[]> = Object.fromEntries(
    Object.entries(LOOPS).map(([level, {size, loop}]) => [level, loopLinks(loop, size)]));

// step : déduction du guide (null quand la boucle est finie) ; seen : techniques déjà faites dans cette leçon
type State = { puzzle: BouclePuzzle; step: BoucleStep | null; seen: ReadonlySet<BoucleRule> };

// Explication d'une déduction (la première fois, avec le pourquoi)
const TEXTS: Record<BoucleRule, [string, string]> = {
    corner: [
        "Un coin n'a que deux voisines : la boucle y entre par l'une et ressort par l'autre. Glisse le long des pointillés pour tracer ses deux traits.",
        "Encore un coin : trace ses deux traits.",
    ],
    wall: [
        "À cause du mur, cette case n'a plus que deux sorties : la boucle passe forcément par les deux. Trace les pointillés.",
        "Cette case n'a que deux sorties : trace les pointillés.",
    ],
    full: [
        "La case marquée d'une croix a déjà ses deux traits : la boucle ne peut plus y entrer. Il ne reste à cette case que les pointillés.",
        "Une voisine a déjà ses deux traits (croix) : il ne reste que les pointillés.",
    ],
    loop: [
        "Attention : la case marquée d'une croix est l'autre bout de ce morceau. Les relier fermerait une petite boucle qui ne passe pas partout ! Il ne reste donc que les pointillés.",
        "La croix fermerait une petite boucle : prends les pointillés.",
    ],
    trap: [
        "Imagine que la boucle aille vers la croix : les traits rouges deviendraient forcés l'un après l'autre, et la case entourée de rouge se retrouverait coincée. La boucle ne va donc pas par là : trace les pointillés.",
        "Vers la croix, les traits rouges mèneraient à une case coincée (cercle rouge) : trace les pointillés.",
    ],
    wrong: ["Ce trait ne fait pas partie de la boucle : glisse dessus pour l'effacer.", "Ce trait ne fait pas partie de la boucle : glisse dessus pour l'effacer."],
    next: ["Continue la boucle le long des pointillés.", "Continue la boucle le long des pointillés."],
};

// impasse par une petite boucle (au lieu d'une case coincée)
const CLOSING: [string, string] = [
    "Imagine que la boucle aille vers la croix : les traits rouges deviendraient forcés l'un après l'autre, et fermeraient une petite boucle qui ne passe pas partout. La boucle ne va donc pas par là : trace les pointillés.",
    "Vers la croix, les traits rouges fermeraient une petite boucle : trace les pointillés.",
];

const guide: CoachStep<State> = {
    text: s => (s.step ? (s.step.closes ? CLOSING : TEXTS[s.step.rule])[s.seen.has(s.step.rule) ? 1 : 0] : "Bravo !"),
    lit: s => s.step?.spotlight ?? [],
    done: () => false,
};

// cases de part et d'autre des murs
const wallCells = (s: State) => [...new Set(s.puzzle.walls.flat())];

export const BOUCLE_LESSONS: GameLessons<State> = {
    titles: ["Les coins", "Les murs", "Pas de petite boucle"],
    steps: level => {
        if (level === 1) {
            return [
                {text: "Bienvenue dans Boucle ! Trace une seule boucle fermée qui passe par toutes les cases, une seule fois chacune."},
                {text: "Les traits noirs épais sont des murs : la boucle ne les traverse jamais.", lit: wallCells},
                {text: "La boucle entre dans chaque case par un côté et ressort par un autre : à la fin, chaque case a exactement deux traits. Pour tracer, glisse de case en case."},
                guide,
            ];
        }
        if (level === 2) {
            return [
                {text: "Leçon 2 : les murs. Plus il y a de murs, moins les cases ont de sorties. Une case qui n'en a plus que deux n'a pas le choix : la boucle passe par les deux.", lit: wallCells},
                guide,
            ];
        }
        return [
            {text: "Leçon 3 : pas de petite boucle. La boucle doit passer partout : relier trop tôt les deux bouts d'un même morceau ferme une petite boucle, et c'est perdu."},
            guide,
        ];
    },
};
