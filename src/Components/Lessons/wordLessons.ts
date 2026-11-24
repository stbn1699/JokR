import type {DevimotGuess, FoundWord} from "../../Models/wordGames.model.ts";
import type {CoachStep, GameLessons} from "./useLessonCoach.tsx";

// Leçons des jeux de mots (grilles et mots dans backend/src/utils/gridLessons.ts)

const finish = <S, >(text: string | ((s: S) => string)): CoachStep<S> => ({text, done: () => false});

// ---------- Devimot : les essais du joueur
type DevimotState = { guesses: DevimotGuess[] };
const tried = (count: number) => (s: DevimotState) => s.guesses.length >= count;
const firstWas = (s: DevimotState, word: string) => s.guesses[0]?.word === word;

export const DEVIMOT_LESSONS: GameLessons<DevimotState> = {
    titles: ["Les couleurs", "Garder les indices", "Les lettres en double"],
    steps: level => {
        if (level === 1) {
            return [
                {text: "Bienvenue dans Devimot ! Trouve le mot caché de 4 lettres. Après chaque essai, les lettres te disent si tu chauffes."},
                {text: "Pour commencer, tape LION au clavier puis valide avec Entrée.", done: tried(1)},
                {text: "Une case verte : la lettre est dans le mot, à cette place. Un rond jaune : elle est dans le mot, mais ailleurs. Sinon : elle n'y est pas.", button: "Compris"},
                finish(s => (firstWas(s, "LION")
                    ? "Le L est bien placé, le O est ailleurs, et ni I ni N. À toi : quel animal commence par L, avec un O ailleurs qu'en troisième place ?"
                    : "À toi : utilise ces indices pour ton prochain essai.")),
            ];
        }
        if (level === 2) {
            return [
                {text: "Leçon 2 : garder les indices. Un bon essai réutilise tout ce qu'on sait déjà."},
                {text: "Tape TRAIN pour commencer.", done: tried(1)},
                {
                    text: s => (firstWas(s, "TRAIN")
                        ? "Le T reste à sa place. Le R et le I sont dans le mot, mais pas là : ils changent de place. Le A et le N ne reviendront plus (ils sont grisés sur le clavier)."
                        : "Les lettres vertes restent à leur place, les jaunes changent de place, les autres ne reviennent plus (elles sont grisées sur le clavier)."),
                    button: "Je vois",
                },
                finish("À toi ! Un indice : c'est un animal."),
            ];
        }
        return [
            {text: "Leçon 3 : les lettres en double. Une même lettre peut revenir plusieurs fois dans le mot."},
            {text: "Tape PORTE pour commencer.", done: tried(1)},
            {
                text: s => (firstWas(s, "PORTE")
                    ? "P, O et E sont bien placés ; R et T n'y sont pas. Il reste deux cases… et aucune autre lettre n'est jaune : pense aux doubles !"
                    : "Si une lettre est trouvée et qu'il reste des cases sans indice, pense aux lettres en double."),
                button: "Je vois",
            },
            finish("À toi ! Un indice : c'est un fruit."),
        ];
    },
};

// ---------- Échelle : les mots déjà posés, du départ jusqu'au dernier
type EchelleState = { path: string[] };
const steps = (count: number) => (s: EchelleState) => s.path.length > count;

export const ECHELLE_LESSONS: GameLessons<EchelleState> = {
    titles: ["Une lettre à la fois", "Plusieurs chemins", "Le détour"],
    steps: level => {
        if (level === 1) {
            return [
                {text: "Bienvenue dans Échelle ! Passe du mot du haut au mot du bas en changeant une seule lettre à chaque étape. Chaque étape doit être un vrai mot."},
                {text: "Change le P de PAIN en S : tape SAIN puis Entrée.", done: steps(1)},
                finish("Les lettres déjà comme l'arrivée sont en rose. Plus qu'une lettre à changer pour arriver à SOIN !"),
            ];
        }
        if (level === 2) {
            return [
                {text: "Leçon 2 : plusieurs chemins. On ne peut pas toujours changer directement la bonne lettre : JOUP n'est pas un mot."},
                {text: "Change d'abord une autre lettre : par exemple LOUP → COUP, ou LOUP → LOUE.", done: steps(1)},
                finish("Continue : chaque étape doit rester un mot. Le plus court chemin fait 3 étapes, mais tous les chemins sont bons."),
            ];
        }
        return [
            {text: "Leçon 3 : le détour. Ici, trois lettres diffèrent, mais le plus court chemin fait 4 étapes : une lettre va changer deux fois."},
            {text: "Commence par TIGRE → TITRE : le G devient un T… qui changera encore plus tard.", done: steps(1)},
            {text: "Puis change la première lettre : TITRE → LITRE.", done: steps(2)},
            {text: "Le T change à nouveau : LITRE → LIVRE.", done: steps(3)},
            finish("Plus qu'une lettre pour arriver !"),
        ];
    },
};

// ---------- Mots mêlés : les mots trouvés ; `lit` montre les lettres d'un mot
type MotsMelesState = { found: FoundWord[] };
const has = (word: string) => (s: MotsMelesState) => s.found.some(f => f.word === word);

export const MOTS_MELES_LESSONS: GameLessons<MotsMelesState> = {
    titles: ["Droit devant", "En diagonale", "À l'envers"],
    steps: level => {
        if (level === 1) {
            return [
                {text: "Bienvenue dans les Mots mêlés ! Les mots de la liste sont cachés dans la grille : à toi de les entourer."},
                {text: "Voici CHAT. Glisse de la première lettre à la dernière pour l'entourer.", lit: [9, 10, 11, 12], done: has("CHAT")},
                {text: "Les mots peuvent aussi se lire de haut en bas, comme LOUP.", lit: [30, 38, 46, 54], done: has("LOUP")},
                finish("À toi de trouver les autres mots de la liste !"),
            ];
        }
        if (level === 2) {
            return [
                {text: "Leçon 2 : en diagonale. Dans une grille de 10×10, les mots se cachent aussi en biais."},
                {text: "Voici LAPIN, en diagonale. Glisse en biais, de son L à son N.", lit: [22, 33, 44, 55, 66], done: has("LAPIN")},
                {text: "Une diagonale peut aussi monter : RENARD part d'en bas à gauche.", lit: [90, 81, 72, 63, 54, 45], done: has("RENARD")},
                finish("À toi de trouver les autres !"),
            ];
        }
        return [
            {text: "Leçon 3 : à l'envers. Dans une grille de 12×12, les mots peuvent se lire dans tous les sens, même à l'envers."},
            {text: "Voici FLEUR, écrit de droite à gauche. Glisse de son F jusqu'à son R.", lit: [22, 21, 20, 19, 18], done: has("FLEUR")},
            {text: "Celui-ci se lit de bas en haut : PLUIE.", lit: [135, 123, 111, 99, 87], done: has("PLUIE")},
            finish("Sept mots en tout : à toi de trouver les autres, dans tous les sens !"),
        ];
    },
};

// ---------- Mots à caser : lettres de la grille (« » si vide) ; `lit` montre les cases d'un emplacement
type MotsACaserState = { letters: string[] };
const placed = (cells: number[], word: string) => (s: MotsACaserState) => cells.every((cell, i) => s.letters[cell] === word[i]);

export const MOTS_A_CASER_LESSONS: GameLessons<MotsACaserState> = {
    titles: ["Les longueurs", "Les croisements", "Tous pareils"],
    steps: level => {
        if (level === 1) {
            return [
                {text: "Bienvenue dans Mots à caser ! Place chaque mot de la liste dans la grille, une lettre par case, de gauche à droite ou de haut en bas."},
                {text: "Commence par compter : cet emplacement a 5 cases, et un seul mot de la liste a 5 lettres, PLAGE. Clique sur sa première case et tape-le.", lit: [5, 6, 7, 8, 9], done: placed([5, 6, 7, 8, 9], "PLAGE")},
                {text: "Ici, 4 cases : c'est MAIN. Sa deuxième lettre, le A, est déjà en place grâce à PLAGE.", lit: [2, 7, 12, 17], done: placed([2, 7, 12, 17], "MAIN")},
                finish("Il ne reste qu'un mot et qu'un emplacement : à toi !"),
            ];
        }
        if (level === 2) {
            return [
                {text: "Leçon 2 : les croisements. Ici, les quatre mots ont 4 lettres : compter ne suffit plus. Ce sont les lettres partagées qui décident."},
                {text: "La colonne de gauche commence par la deuxième lettre de la ligne du haut. CHAT donne H, et un seul mot commence par H : HERO. Essaie CHAT en haut, puis HERO en colonne.", lit: [0, 1, 2, 3, 5, 9, 13], done: s => placed([0, 1, 2, 3], "CHAT")(s) && placed([1, 5, 9, 13], "HERO")(s)},
                finish("Le T de CHAT commence la colonne de droite, et le O de HERO est la deuxième lettre du mot du bas : à toi de finir !"),
            ];
        }
        return [
            {text: "Leçon 3 : tous pareils. Cinq mots de 5 lettres : pars d'un coin, là où deux mots se croisent par leur première lettre."},
            {text: "En haut à gauche, deux mots commencent par la même lettre : SALON et SAPIN sont les seuls à commencer pareil. SALON en haut, SAPIN à gauche !", lit: [0, 1, 2, 3, 4, 5, 10, 15, 20], done: s => placed([0, 1, 2, 3, 4], "SALON")(s) && placed([0, 5, 10, 15, 20], "SAPIN")(s)},
            finish("SALON finit par N, SAPIN aussi : les deux mots qui restent dans les coins commencent par N. À toi de finir !"),
        ];
    },
};
