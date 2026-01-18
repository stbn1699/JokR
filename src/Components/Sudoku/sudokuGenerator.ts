// Génère une grille de Sudoku 9x9 complète puis retire des chiffres pour n'en laisser que `numPlaced`.
// Retourne une matrice 9x9 d'entiers (0 = case vide, 1-9 = chiffres placés).

import { countSolutions, logicalSolve } from './sudokuSolver.ts';

// helper pour index symétrique rotation 180°
function symIndex(idx: number): number {
    return 80 - idx; // since indices 0..80
}

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

    // On supprime par paires symétriques (rotation 180°) pour garantir la symétrie.
    // Pour l'indice central (40) la paire est lui-même.
    for (const idx of indices) {
        if (placed <= numPlaced) break;
        const idx2 = symIndex(idx);
        // éviter de traiter la même paire deux fois
        if (idx > idx2) continue;

        const r1 = Math.floor(idx / 9);
        const c1 = idx % 9;
        const r2 = Math.floor(idx2 / 9);
        const c2 = idx2 % 9;

        // si déjà vide, rien à faire
        if (result[r1][c1] === 0 && result[r2][c2] === 0) continue;

        // sauvegarde
        const b1 = result[r1][c1];
        const b2 = result[r2][c2];

        // enlever la paire (ou case centrale une seule fois)
        result[r1][c1] = 0;
        if (idx2 !== idx) result[r2][c2] = 0;

        // vérifier unicité (countSolutions) et solvabilité par logique (logicalSolve)
        const sols = countSolutions(result, 2);
        const logical = logicalSolve(result);
        if (sols === 1 && logical.solved) {
            // suppression acceptée
            placed -= (idx2 === idx) ? (b1 === 0 ? 0 : 1) : ((b1 === 0 ? 0 : 1) + (b2 === 0 ? 0 : 1));
        } else {
            // restaurer
            result[r1][c1] = b1;
            result[r2][c2] = b2;
        }
    }

    // Note: si on ne parvient pas à atteindre numPlaced (p.ex. demande trop peu de clues),
    // la fonction retourne la grille telle quelle (avec plus de givens). C'est intentionnel :
    // on fait un effort maximal sans heuristiques complexes.
    return result;
}
