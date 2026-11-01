/*
 * Moteur du Binero (aussi appelé Takuzu) : grille carrée de taille paire, remplie de 0 et de 1.
 *
 * Règles :
 * 1. jamais trois chiffres identiques côte à côte (en ligne ou en colonne)
 * 2. autant de 0 que de 1 dans chaque ligne et chaque colonne
 * 3. deux lignes (ou deux colonnes) ne peuvent pas être identiques
 *
 * Représentation interne : number[][] avec EMPTY (-1) pour une case vide.
 */

export const EMPTY = -1;
export type BineroGrid = number[][];

const cloneGrid = (g: BineroGrid): BineroGrid => g.map(row => row.slice());

function shuffle<T>(arr: T[]): T[] {
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j]!, arr[i]!];
    }
    return arr;
}

// Toutes les lignes puis toutes les colonnes, sous forme de listes de coordonnées
function linesOf(size: number): [number, number][][] {
    const lines: [number, number][][] = [];
    for (let r = 0; r < size; r++) lines.push(Array.from({length: size}, (_, c) => [r, c] as [number, number]));
    for (let c = 0; c < size; c++) lines.push(Array.from({length: size}, (_, r) => [r, c] as [number, number]));
    return lines;
}

const linesCache = new Map<number, [number, number][][]>();
function lines(size: number) {
    let l = linesCache.get(size);
    if (!l) {
        l = linesOf(size);
        linesCache.set(size, l);
    }
    return l;
}

/**
 * true si la grille (même partielle) ne viole encore aucune règle :
 * pas de triplet, pas plus de size/2 chiffres identiques par ligne/colonne,
 * pas deux lignes (ou colonnes) complètes identiques.
 */
export function isConsistent(grid: BineroGrid): boolean {
    const size = grid.length;
    const half = size / 2;

    // lignes (0..size-1) puis colonnes (size..2*size-1)
    for (const [from, to] of [[0, size], [size, 2 * size]]) {
        const complete = new Set<string>();
        for (const line of lines(size).slice(from, to)) {
            const values = line.map(([r, c]) => grid[r]![c]!);
            let zeros = 0, ones = 0;
            for (let i = 0; i < size; i++) {
                const v = values[i]!;
                if (v === 0) zeros++;
                else if (v === 1) ones++;
                if (i >= 2 && v !== EMPTY && v === values[i - 1] && v === values[i - 2]) return false;
            }
            if (zeros > half || ones > half) return false;
            if (zeros + ones === size) {
                const key = values.join("");
                if (complete.has(key)) return false;
                complete.add(key);
            }
        }
    }
    return true;
}

// true si la grille est complète et respecte les trois règles
export function isValidSolution(grid: BineroGrid): boolean {
    return grid.every(row => row.every(v => v === 0 || v === 1)) && isConsistent(grid);
}

/**
 * Déductions directes, répétées tant qu'elles placent des chiffres :
 * - deux identiques côte à côte → les voisines sont l'opposé
 * - deux identiques séparés par une case vide → le milieu est l'opposé
 * - une ligne a déjà size/2 zéros (ou uns) → le reste est l'autre chiffre
 * - une ligne à qui il manque un 0 et un 1 ressemble à une ligne complète → on évite le doublon
 * Retourne false si une contradiction apparaît.
 */
function propagate(grid: BineroGrid): boolean {
    const size = grid.length;
    const half = size / 2;
    const allLines = lines(size);

    let changed = true;
    while (changed) {
        changed = false;
        const set = (r: number, c: number, v: number) => {
            if (grid[r]![c] === EMPTY) {
                grid[r]![c] = v;
                changed = true;
            }
        };

        for (const line of allLines) {
            const get = (i: number) => grid[line[i]![0]]![line[i]![1]]!;
            const put = (i: number, v: number) => set(line[i]![0], line[i]![1], v);

            for (let i = 0; i < size - 1; i++) {
                const a = get(i);
                if (a === EMPTY) continue;
                // triplet déjà posé : contradiction
                if (i + 2 < size && get(i + 1) === a && get(i + 2) === a) return false;
                // paire : X X → les deux voisines valent 1 - X
                if (get(i + 1) === a) {
                    if (i > 0) put(i - 1, 1 - a);
                    if (i + 2 < size) put(i + 2, 1 - a);
                }
                // sandwich : X _ X → le milieu vaut 1 - X
                if (i + 2 < size && get(i + 2) === a) put(i + 1, 1 - a);
            }

            let zeros = 0, ones = 0;
            for (let i = 0; i < size; i++) {
                if (get(i) === 0) zeros++;
                else if (get(i) === 1) ones++;
            }
            if (zeros > half || ones > half) return false;
            if (zeros === half && ones < half) for (let i = 0; i < size; i++) put(i, 1);
            else if (ones === half && zeros < half) for (let i = 0; i < size; i++) put(i, 0);
        }

        // Règle 3 : une ligne à qui il manque exactement un 0 et un 1, et dont les chiffres
        // déjà posés correspondent à une ligne complète, doit prendre l'arrangement inverse
        for (const [from, to] of [[0, size], [size, 2 * size]]) {
            const group = allLines.slice(from, to);
            const values = group.map(line => line.map(([r, c]) => grid[r]![c]!));
            const complete = values.filter(v => !v.includes(EMPTY));
            // deux lignes (ou colonnes) complètes identiques : contradiction
            if (new Set(complete.map(v => v.join(""))).size !== complete.length) return false;
            for (let li = 0; li < group.length; li++) {
                const v = values[li]!;
                const empties = v.flatMap((x, i) => (x === EMPTY ? [i] : []));
                if (empties.length !== 2) continue;
                for (const full of complete) {
                    if (v.every((x, i) => x === EMPTY || x === full[i])) {
                        for (const i of empties) set(group[li]![i]![0], group[li]![i]![1], 1 - full[i]!);
                        break;
                    }
                }
            }
        }

    }
    // Vérification finale (les placements du dernier tour peuvent créer une contradiction)
    return isConsistent(grid);
}

/**
 * Résolution par déductions (jamais de hasard) :
 * déductions directes, puis "essai-erreur" à un niveau quand elles bloquent
 * (si poser 0 dans une case mène à une contradiction, c'est forcément 1).
 * Toutes les déductions sont sûres : si la grille est entièrement résolue,
 * sa solution est unique.
 *
 * Avec `target`, on s'arrête dès que cette case est déduite (solved = true) :
 * les déductions ne font qu'ajouter des chiffres sûrs, donc si la case retirée
 * se retrouve, tout le reste de la grille se retrouve aussi.
 */
export function logicalSolve(puzzle: BineroGrid, target?: [number, number]): { solved: boolean; grid: BineroGrid } {
    const grid = cloneGrid(puzzle);
    const size = grid.length;
    const done = () => (target
        ? grid[target[0]]![target[1]] !== EMPTY
        : grid.every(row => !row.includes(EMPTY)));

    if (!propagate(grid)) return {solved: false, grid};
    if (done()) return {solved: true, grid};

    let progress = true;
    while (progress) {
        progress = false;
        for (let r = 0; r < size; r++) {
            for (let c = 0; c < size; c++) {
                if (grid[r]![c] !== EMPTY) continue;
                for (const v of [0, 1]) {
                    const attempt = cloneGrid(grid);
                    attempt[r]![c] = v;
                    if (!propagate(attempt)) {
                        grid[r]![c] = 1 - v;
                        if (!propagate(grid)) return {solved: false, grid};
                        if (done()) return {solved: true, grid};
                        progress = true;
                        break;
                    }
                }
            }
        }
    }

    return {solved: done(), grid};
}

// Grille complète valide tirée au hasard.
// Retour arrière guidé par les déductions : après chaque choix, propagate() remplit tout
// ce qui est forcé et détecte tout de suite les impasses.
export function generateSolution(size: number): BineroGrid {
    if (size < 2 || size % 2 !== 0) throw new Error("La taille doit être paire");

    const fill = (grid: BineroGrid): BineroGrid | null => {
        if (!propagate(grid)) return null;
        for (let r = 0; r < size; r++) {
            for (let c = 0; c < size; c++) {
                if (grid[r]![c] !== EMPTY) continue;
                for (const v of shuffle([0, 1])) {
                    const attempt = cloneGrid(grid);
                    attempt[r]![c] = v;
                    const result = fill(attempt);
                    if (result) return result;
                }
                return null;
            }
        }
        return grid;
    };

    const result = fill(Array.from({length: size}, () => Array<number>(size).fill(EMPTY)));
    if (!result || !isValidSolution(result)) throw new Error("Impossible de générer une grille");
    return result;
}

/**
 * Grille à résoudre avec au moins `cluesCount` chiffres donnés (exactement si possible).
 * Les cases sont retirées au hasard tant que la grille reste résolvable par déduction,
 * donc à solution unique.
 */
export function generateBinero(size: number, cluesCount: number): BineroGrid {
    const solution = generateSolution(size);
    const puzzle = cloneGrid(solution);
    let placed = size * size;

    for (const idx of shuffle(Array.from({length: size * size}, (_, i) => i))) {
        if (placed <= cluesCount) break;
        const r = Math.floor(idx / size);
        const c = idx % size;
        const value = puzzle[r]![c]!;
        puzzle[r]![c] = EMPTY;
        // La grille reste à solution unique si la case retirée se déduit du reste
        if (logicalSolve(puzzle, [r, c]).solved) placed--;
        else puzzle[r]![c] = value;
    }

    return puzzle;
}

export function countBineroClues(grid: BineroGrid): number {
    return grid.flat().filter(v => v !== EMPTY).length;
}
