/*
 * Niveaux du Sudoku (mode Niveaux) : grilles fixes, les mêmes pour tout le monde, de plus en plus difficiles.
 * Pour l'instant, les leçons du tutoriel guidé pas à pas (src/Components/Levels/SudokuTutorial.tsx).
 * Leurs grilles sont choisies pour obliger à utiliser la leçon du niveau (voir src/Components/Levels/sudokuGuide.ts) :
 * 1. le dernier chiffre : une ligne, une colonne ou un carré n'a plus qu'une case vide
 * 2. la seule place : dans un carré (ou une ligne, une colonne), un chiffre n'a plus qu'une case possible
 * 3. le seul chiffre : une case voit déjà les huit autres chiffres
 * Ne pas modifier une grille publiée : la progression des joueurs est enregistrée par numéro de niveau.
 */

export const SUDOKU_TUTORIAL = 3;

// une ligne par rangée, "." : case à remplir
const grid = (rows: string): number[][] => rows.trim().split(/\s+/).map(row => [...row].map(x => (x === "." ? 0 : Number(x))));

export const SUDOKU_LEVELS: number[][][] = [
    // 1 · le dernier chiffre
    grid(`
        3.6714259
        9.73621.8
        214598376
        .4593.862
        7628419.5
        .93625714
        62947358.
        53128.49.
        478159623
    `),
    // 2 · la seule place
    grid(`
        672189453
        ..9645278
        5.8273691
        46.8..915
        72.93.846
        98.45.732
        21.5.4387
        ..4768129
        8973..564
    `),
    // 3 · le seul chiffre
    grid(`
        964128375
        312657984
        758394621
        1.32..549
        246...738
        5.9.43216
        427...193
        691432857
        835...462
    `),
];
