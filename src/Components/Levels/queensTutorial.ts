/*
 * Textes du tutoriel du Queens (mode Niveaux) : un par niveau du tutoriel (voir backend/src/utils/queensLevels.ts).
 * Chaque niveau apprend une seule chose, sur une grille qui ne demande que ça.
 */

export type TutorialStep = {
    title: string;
    // ce qu'on apprend
    lines: string[];
    // ce qu'il faut faire sur cette grille
    goal: string;
};

export const QUEENS_TUTORIAL_STEPS: TutorialStep[] = [
    {
        title: "Une dame par ligne et par colonne",
        lines: [
            "Le but : poser une dame sur chaque ligne et sur chaque colonne, ni plus ni moins.",
            "Touche une case une fois pour y mettre une croix (✕ : pas de dame ici), deux fois pour poser une dame.",
        ],
        goal: "Deux dames sont déjà là. Trouve les deux lignes et les deux colonnes encore libres, et pose les dames qui manquent.",
    },
    {
        title: "Une dame par zone de couleur",
        lines: [
            "La grille est découpée en zones de couleur : chaque zone reçoit, elle aussi, exactement une dame.",
            "Une petite zone n'a souvent qu'une ou deux cases possibles : commence par elle.",
        ],
        goal: "Repère la zone la plus petite et place sa dame, puis complète le reste.",
    },
    {
        title: "Les dames ne se touchent jamais",
        lines: [
            "Deux dames ne peuvent pas être côte à côte, même en diagonale : les 8 cases autour d'une dame sont interdites.",
            "Avec les trois règles réunies, il ne reste souvent qu'une case possible dans une ligne, une colonne ou une zone.",
        ],
        goal: "Mets des croix autour de la dame déjà posée, puis cherche la ligne, la colonne ou la zone où il ne reste qu'une case.",
    },
    {
        title: "Les croix, tes meilleures alliées",
        lines: [
            "Sur les grilles plus grandes, on avance surtout en barrant : chaque croix réduit les possibilités.",
            "Astuce : si toutes les cases libres d'une zone sont sur une même ligne, la dame de cette zone sera sur cette ligne. Le reste de la ligne prend des croix (pareil pour une colonne).",
            "Une case dont la dame viderait une autre zone (ou ligne, ou colonne) prend aussi une croix.",
        ],
        goal: "Aucune dame n'est donnée cette fois : barre, déduis, et trouve les cinq dames toute seule ou tout seul.",
    },
];
