import type {CoachStep, GameLessons} from "./useLessonCoach.tsx";

// Leçons de Liens (grilles dans backend/src/utils/gridLessons.ts) : la ligne de chaque paire dans la solution
type State = { paths: number[][]; size: number };

const SOLUTIONS: Record<number, number[][]> = {
    1: [[5, 1, 2, 3, 7], [11, 15, 14, 10, 6], [0, 4, 8, 12, 13, 9]],
    2: [[7, 2, 3, 4, 9, 14], [19, 24, 23, 18, 13, 8], [15, 20, 21, 22, 17, 12], [6, 1, 0, 5, 10, 11, 16]],
    3: [[9, 3, 4, 10, 16, 22, 21], [15, 14, 20, 26, 32, 33, 27, 28], [18, 12, 6, 0, 1, 2, 8], [34, 35, 29, 23, 17, 11, 5], [7, 13, 19, 25, 31, 30, 24]],
};

const sameLine = (path: readonly number[] | undefined, expected: readonly number[]) =>
    path !== undefined && path.length === expected.length && expected.every(cell => path.includes(cell));

const link = (level: number, pair: number, text: string): CoachStep<State> =>
    ({text, lit: SOLUTIONS[level]![pair]!, done: s => sameLine(s.paths[pair], SOLUTIONS[level]![pair]!)});
const finish = (level: number, text: string): CoachStep<State> =>
    ({text, done: s => SOLUTIONS[level]!.every((line, pair) => sameLine(s.paths[pair], line))});

export const LIENS_LESSONS: GameLessons<State> = {
    titles: ["Relier", "Les coins", "Toute la grille"],
    steps: level => {
        if (level === 1) {
            return [
                {text: "Bienvenue dans Liens ! Relie chaque lettre à sa jumelle par une ligne. Les lignes ne se croisent pas, et à la fin il ne reste aucune case vide."},
                link(1, 0, "Glisse depuis un A jusqu'à l'autre A, en passant par les cases qui brillent."),
                link(1, 2, "Le C descend le long du bord gauche puis remonte : c'est le seul passage qui lui reste. Trace-le."),
                link(1, 1, "Il ne reste que le B, et pile les cases qu'il lui faut. Relie-les !"),
            ];
        }
        if (level === 2) {
            return [
                {text: "Leçon 2 : les coins. Une case de coin n'a que deux voisines : la ligne qui la remplit y entre par l'une et ressort par l'autre."},
                link(2, 3, "Seule la ligne D passe assez près de ce coin pour le remplir : fais-la passer par le coin."),
                link(2, 0, "Même chose en haut à droite : c'est le A qui prend ce coin."),
                link(2, 1, "En bas à droite, le coin revient au B."),
                link(2, 2, "Et le dernier coin au C : la grille est pleine !"),
            ];
        }
        return [
            {text: "Leçon 3 : toute la grille. Le chemin le plus court n'est pas toujours le bon : il ne faut jamais laisser de cases que plus aucune ligne ne peut atteindre."},
            link(3, 2, "Le C pourrait aller presque tout droit, mais alors le coin en haut à gauche resterait vide : aucune autre ligne ne peut l'atteindre. Fais-le passer par le coin."),
            link(3, 3, "Même idée pour le D : il passe par le coin en bas à droite, puis longe le bord jusqu'à son autre lettre."),
            finish(3, "À toi de finir : vérifie à chaque ligne que tu n'enfermes pas de cases vides."),
        ];
    },
};
