import type {BouchonPuzzle} from "../../Models/bouchon.model.ts";
import type {CoachStep, GameLessons} from "./useLessonCoach.tsx";

// Leçons du Bouchon (parkings dans backend/src/utils/gridLessons.ts) ; le véhicule 0 est le taxi
type State = { puzzle: BouchonPuzzle; positions: number[] };

// Cases occupées par des véhicules, à leur position actuelle
const cellsOf = ({puzzle, positions}: State, ...indexes: number[]) => indexes.flatMap(index => {
    const v = puzzle.vehicles[index]!;
    return Array.from({length: v.length}, (_, offset) =>
        (v.horizontal ? v.row * puzzle.size + positions[index]! + offset : (positions[index]! + offset) * puzzle.size + v.col));
});
// le véhicule (vertical) ne touche plus la ligne de sortie
const offExit = (s: State, index: number) => {
    const v = s.puzzle.vehicles[index]!, at = s.positions[index]!;
    return at + v.length - 1 < s.puzzle.exitRow || at > s.puzzle.exitRow;
};
const lit = (...indexes: number[]) => (s: State) => cellsOf(s, ...indexes);
const move = (index: number, done: (s: State) => boolean, text: string): CoachStep<State> => ({text, lit: lit(index), done});
const taxiOut = (text: string): CoachStep<State> =>
    ({text, lit: lit(0), done: s => s.positions[0] === s.puzzle.size - 2});

export const BOUCHON_LESSONS: GameLessons<State> = {
    titles: ["La voie libre", "Faire de la place", "La chaîne"],
    steps: level => {
        if (level === 1) {
            return [
                {text: "Bienvenue dans Bouchon ! Fais sortir le taxi jaune par la sortie, à droite. Chaque véhicule glisse seulement dans son sens : les horizontaux à gauche ou à droite, les verticaux en haut ou en bas."},
                move(1, s => offExit(s, 1), "Ce véhicule bloque la route du taxi. Glisse-le vers le haut ou vers le bas pour libérer la ligne."),
                taxiOut("La voie est libre : glisse le taxi jusqu'à la sortie."),
            ];
        }
        if (level === 2) {
            return [
                {text: "Leçon 2 : faire de la place. Parfois, le véhicule qui bloque le taxi est lui-même bloqué."},
                {text: "Ce camion bloque le taxi. Même tout en haut, il couvrirait encore sa ligne : il doit descendre… mais la voiture du bas l'en empêche.", lit: lit(1, 2), button: "Je vois"},
                move(2, s => s.positions[2]! <= 1, "Pousse d'abord cette voiture vers la gauche, pour dégager la colonne du camion."),
                move(1, s => offExit(s, 1), "Le camion peut maintenant descendre tout en bas."),
                taxiOut("Et le taxi sort !"),
            ];
        }
        return [
            {text: "Leçon 3 : la chaîne. Pour trouver le premier coup, pars de la fin : qu'est-ce qui bloque le taxi ? Et qu'est-ce qui bloque ce qui le bloque ?"},
            {text: "Deux véhicules barrent la route du taxi : le grand camion, et la voiture tout à droite.", lit: lit(1, 6)},
            {text: "Le camion doit descendre tout en bas, mais deux véhicules occupent sa colonne en dessous de lui.", lit: lit(1, 2, 5)},
            move(5, s => s.positions[5] === 0, "Commence tout en bas : pousse ce camion à gauche, jusqu'au bout."),
            move(4, s => s.positions[4] === 4, "Cette voiture peut maintenant descendre…"),
            move(2, s => s.positions[2] === 4, "…ce qui laisse la place de pousser celle-ci tout à droite."),
            move(1, s => offExit(s, 1), "La colonne est libre : le grand camion descend."),
            move(6, s => offExit(s, 6), "Dernier obstacle : dégage cette voiture de la ligne du taxi."),
            taxiOut("Le taxi peut sortir !"),
        ];
    },
};
