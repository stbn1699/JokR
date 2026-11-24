import type {CoachStep, GameLessons} from "./useLessonCoach.tsx";

// Leçons de Tuyaux (grilles dans backend/src/utils/gridLessons.ts) : orientation de chaque pièce dans la solution
type State = { size: number; masks: number[] };

const SOLUTIONS: Record<number, number[]> = {
    1: [6, 14, 8, 1, 7, 12, 2, 9, 1],
    2: [6, 10, 10, 12, 7, 14, 12, 5, 5, 1, 5, 5, 3, 8, 1, 1],
    3: [4, 6, 8, 4, 4, 7, 11, 12, 5, 5, 1, 2, 11, 13, 5, 6, 10, 12, 7, 13, 1, 2, 11, 9, 1],
};

// Tuyaux reliés qui forment une boucle (deux pièces dont les sorties se font face = un lien)
function hasLoop({size, masks}: State): boolean {
    const parent = masks.map((_, i) => i);
    const find = (i: number): number => (parent[i] === i ? i : (parent[i] = find(parent[i]!)));
    for (let cell = 0; cell < masks.length; cell++) {
        const links: number[] = [];
        if (cell % size < size - 1 && masks[cell]! & 2 && masks[cell + 1]! & 8) links.push(cell + 1);
        if (cell + size < masks.length && masks[cell]! & 4 && masks[cell + size]! & 1) links.push(cell + size);
        for (const other of links) {
            const [a, b] = [find(cell), find(other)];
            if (a === b) return true;
            parent[a] = b;
        }
    }
    return false;
}

const turn = (level: number, cell: number, text: string): CoachStep<State> =>
    ({text, lit: [cell], done: s => s.masks[cell] === SOLUTIONS[level]![cell]});
const finish = (level: number, text: string): CoachStep<State> => ({
    text: s => (hasLoop(s) ? "Attention : tu as fermé une boucle ! Il manquera forcément un tuyau ailleurs : défais-la." : text),
    done: s => s.masks.every((mask, cell) => mask === SOLUTIONS[level]![cell]),
});

export const TUYAUX_LESSONS: GameLessons<State> = {
    titles: ["Le bord", "Les bouts", "Pas de boucle"],
    steps: level => {
        if (level === 1) {
            return [
                {text: "Bienvenue dans Tuyaux ! Tourne les pièces pour que tous les tuyaux forment un seul réseau : aucune sortie dans le vide, aucune boucle."},
                {text: "L'eau part de la case du centre : les tuyaux reliés à la source se remplissent en bleu.", lit: [4]},
                turn(1, 0, "Une pièce du bord n'a jamais de sortie vers l'extérieur. Ce coude, dans le coin, n'a donc qu'une position : tourné vers l'intérieur. Clique dessus pour le tourner (clic droit : l'autre sens)."),
                turn(1, 1, "Même idée pour ce T sur le bord du haut : sa barre doit suivre le bord."),
                turn(1, 3, "Le coude du coin envoie un tuyau vers le bas : cette pièce doit le recevoir."),
                finish(1, "À toi de finir : plus aucune sortie ne doit donner dans le vide."),
            ];
        }
        if (level === 2) {
            return [
                {text: "Leçon 2 : les bouts. Une pièce à une seule sortie (avec un réservoir rond) est un bout de réseau."},
                {text: "Deux bouts ne se font jamais face : reliés, ils formeraient un petit réseau fermé, coupé de tout le reste.", lit: [13, 14, 15], button: "Je vois"},
                turn(2, 15, "Ce bout, dans le coin, peut regarder en haut ou à gauche. Mais à gauche, c'est un autre bout : il regarde donc en haut."),
                turn(2, 14, "Pareil ici : à gauche comme à droite, il n'y a que des bouts. Il ne reste que le haut."),
                turn(2, 13, "Et celui-ci : en haut et à droite, encore des bouts. Il regarde à gauche."),
                finish(2, "À toi de finir : pense aux bords et aux bouts."),
            ];
        }
        return [
            {text: "Leçon 3 : pas de boucle. Un réseau qui relie toutes les cases sans boucle utilise chaque tuyau : une boucle quelque part laisse forcément une sortie dans le vide ailleurs."},
            {text: "Commence par ce qui est sûr : les pièces du bord, puis les bouts qui se feraient face."},
            finish(3, "Si tu hésites entre deux positions, demande-toi laquelle fermerait une boucle : c'est l'autre."),
        ];
    },
};
