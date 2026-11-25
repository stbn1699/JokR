import type {CoachStep, GameLessons} from "./useLessonCoach.tsx";

// Leçons du Démineur (mines dans backend/src/utils/gridLessons.ts) : cases libérées, drapeaux du joueur
// et mines sautées (en leçon, une mine ne fait pas perdre : elle reste visible et compte comme un drapeau)
type State = { revealed: Map<number, number>; flags: Set<number>; blown: Set<number> };

const open = (s: State, cells: number[]) => cells.every(cell => s.revealed.has(cell));
// drapeau sur la mine que montre ce chiffre (ou la suite déjà faite : les drapeaux ne sont pas obligatoires pour gagner)
const flag = (number: number, mine: number, next: number[], text: string): CoachStep<State> =>
    ({text, lit: [number, mine], done: s => s.flags.has(mine) || s.blown.has(mine) || open(s, next)});
const safe = (numbers: number[], cells: number[], text: string): CoachStep<State> =>
    ({text, lit: [...numbers, ...cells], done: s => open(s, cells)});
const finish = (text: string): CoachStep<State> => ({text, done: () => false});

export const DEMINEUR_LESSONS: GameLessons<State> = {
    titles: ["Les drapeaux", "La chaîne", "Le motif 1-1"],
    steps: level => {
        if (level === 1) {
            return [
                {text: "Bienvenue dans le Démineur ! Libère toutes les cases sans mine. Chaque chiffre dit combien de mines touchent sa case, diagonales comprises."},
                flag(13, 9, [4], "Ce 1 n'a qu'une seule case cachée autour de lui : c'est forcément la mine. Pose un drapeau dessus (clic droit, ou appui long)."),
                flag(7, 3, [4], "Même chose pour ce 1 : sa seule case cachée est une mine."),
                safe([8], [4], "Ce 2 touche déjà ses deux mines, marquées par les drapeaux : sa dernière case cachée est sans danger. Clique dessus pour la libérer."),
            ];
        }
        if (level === 2) {
            return [
                {text: "Leçon 2 : la chaîne. Chaque drapeau permet de libérer des cases, et chaque case libérée donne un nouveau chiffre."},
                flag(25, 32, [33, 34], "Ce 1 n'a qu'une case cachée : drapeau !"),
                safe([27], [33, 34], "Ce 1 touche déjà sa mine : ses autres cases cachées sont sûres. Libère-les."),
                flag(28, 23, [17], "Un nouveau chiffre est apparu : ce 1 n'a plus qu'une case cachée."),
                safe([22], [17], "Ce chiffre a toutes ses mines : libère sa dernière case cachée."),
                flag(7, 0, [11], "Dans le coin, ce 1 n'a qu'une case cachée."),
                finish("À toi de finir : drapeau quand un chiffre a autant de cases cachées que de mines, case libre quand il a déjà toutes ses mines."),
            ];
        }
        return [
            {text: "Leçon 3 : le motif 1-1. Parfois aucun chiffre ne suffit seul : il faut en comparer deux."},
            flag(9, 4, [5], "Pour commencer, un drapeau facile : ce 1 n'a qu'une case cachée."),
            safe([10], [5], "Ce 1 touche déjà sa mine : libère son autre case cachée."),
            safe([28, 29], [33], "Regarde ces deux 1, en bas à droite. Celui du bord a sa mine dans l'une de ses deux cases cachées. Le 1 d'à côté touche aussi ces deux cases : sa mine y est déjà, donc sa troisième case cachée, à gauche, est sûre !"),
            safe([25, 26], [30], "Même raisonnement en bas à gauche : la mine du 1 de droite est dans ses deux cases cachées, que le 1 de gauche touche aussi. Sa case en plus est sûre."),
            finish("À toi de finir avec tout ce que tu as appris !"),
        ];
    },
};
