// Génère une grille de Sudoku 9x9 complète puis retire des chiffres pour n'en laisser que `numPlaced`.
// Retourne une matrice 9x9 d'entiers (0 = case vide, 1-9 = chiffres placés).

function shuffle<T>(arr: T[]): T[] {
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}

function isSafe(grid: number[][], row: number, col: number, num: number): boolean {
    // vérifie la ligne et la colonne
    for (let x = 0; x < 9; x++) {
        if (grid[row][x] === num) return false;
        if (grid[x][col] === num) return false;
    }
    // vérifie le bloc 3x3
    const startRow = row - (row % 3);
    const startCol = col - (col % 3);
    for (let r = 0; r < 3; r++) {
        for (let c = 0; c < 3; c++) {
            if (grid[startRow + r][startCol + c] === num) return false;
        }
    }
    return true;
}

function fillGrid(grid: number[][], cell = 0): boolean {
    if (cell >= 81) return true; // rempli
    const row = Math.floor(cell / 9);
    const col = cell % 9;
    if (grid[row][col] !== 0) return fillGrid(grid, cell + 1);

    const numbers = shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9]);
    for (const num of numbers) {
        if (isSafe(grid, row, col, num)) {
            grid[row][col] = num;
            if (fillGrid(grid, cell + 1)) return true;
            grid[row][col] = 0;
        }
    }
    return false;
}

export function generateSudoku(numPlaced: number): number[][] {
    // clamp
    if (numPlaced < 0) numPlaced = 0;
    if (numPlaced > 81) numPlaced = 81;

    // init grid vide
    const grid: number[][] = Array.from({length: 9}, () => Array.from({length: 9}, () => 0));
    // remplir complètement
    const ok = fillGrid(grid);
    if (!ok) throw new Error('Impossible de générer une grille');

    // copie et retire des chiffres aléatoirement jusqu'à avoir numPlaced cases non nulles
    const result = grid.map(row => row.slice());
    const indices = shuffle(Array.from({length: 81}, (_, i) => i));

    // nombre actuellement placé
    let placed = 81;
    let i = 0;
    while (placed > numPlaced && i < indices.length) {
        const idx = indices[i++];
        const r = Math.floor(idx / 9);
        const c = idx % 9;
        // enlever la valeur
        if (result[r][c] !== 0) {
            result[r][c] = 0;
            placed--;
        }
    }

    return result;
}

