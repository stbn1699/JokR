import type {ColoriaPuzzle} from "../../Models/coloria.model.ts";
import type {CoachStep, GameLessons} from "./useLessonCoach.tsx";

// Leçons du Coloria (grilles dans backend/src/utils/gridLessons.ts) ; `lit` désigne des zones, pas des cases
type State = { puzzle: ColoriaPuzzle; colors: number[] };

// zone qui doit prendre une couleur (0 = couleur 1)
const paint = (zone: number, color: number, text: string): CoachStep<State> => ({text, lit: [zone], done: s => s.colors[zone] === color});
const full: CoachStep<State> = {text: "À toi de finir : chaque zone qui touche déjà deux couleurs n'a plus le choix.", done: s => s.colors.every(c => c >= 0)};

export const COLORIA_LESSONS: GameLessons<State> = {
    titles: ["La règle", "La chaîne", "Le duo"],
    steps: level => {
        if (level === 1) {
            return [
                {text: "Bienvenue dans Coloria ! Le but : colorier toutes les zones, sans que deux zones qui se touchent aient la même couleur."},
                {text: "Les zones marquées d'un point sont données : ici la couleur 1 et la couleur 2. Elles ne changent pas.", lit: [0, 1]},
                paint(2, 2, "La zone du milieu touche la 1 et la 2 : avec 3 couleurs, il ne lui reste que la 3. Choisis la couleur 3 dans la palette (ou touche 3), puis clique sur la zone."),
                paint(3, 1, "Celle-ci touche la 1 et la 3 : elle prend la 2."),
                paint(4, 0, "Et la dernière ? Regarde ses voisines : il ne lui reste qu'une couleur."),
            ];
        }
        if (level === 2) {
            return [
                {text: "Leçon 2 : la chaîne. Chaque zone coloriée en bloque une autre : on avance de proche en proche."},
                paint(2, 2, "Comme à la leçon 1 : cette zone touche la 1 et la 2, c'est la 3."),
                paint(3, 0, "Maintenant que la 3 est posée, cette zone touche la 2 et la 3 : c'est la 1."),
                paint(4, 1, "À côté, celle-ci touche la 1 et la 3."),
                full,
            ];
        }
        return [
            {text: "Leçon 3 : le duo. Parfois, aucune zone ne touche deux couleurs différentes : il faut regarder deux zones ensemble."},
            {text: "Ces deux zones se touchent, et touchent toutes les deux la couleur 1. Elles se partagent donc la 2 et la 3, sans qu'on sache encore laquelle prend quoi.", lit: [0, 1, 2], button: "Je vois"},
            paint(4, 0, "Cette zone touche les deux : la 2 et la 3 sont prises, elle ne peut être que la 1 !"),
            paint(3, 2, "Celle-ci touche maintenant la 1 et la 2 : c'est la 3."),
            paint(1, 1, "Le duo se départage : cette zone touche la 3 qu'on vient de poser, elle prend la 2…"),
            paint(2, 2, "…et sa voisine la 3."),
            full,
        ];
    },
};
