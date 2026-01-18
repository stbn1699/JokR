import { generateSudoku } from '../sudokuGenerator';
import { countSolutions, logicalSolve } from '../sudokuSolver';

// Petites déclarations pour ce script d'exécution
declare const process: { exit?: (code?: number) => void; exitCode?: number };

function isCompleteAndValid(grid: number[][]): boolean {
    // vérifie taille
    if (!grid || grid.length !== 9) return false;
    for (const row of grid) if (!row || row.length !== 9) return false;

    const isValidGroup = (arr: number[]) => {
        const seen = new Set<number>();
        for (const n of arr) {
            if (n < 1 || n > 9) return false;
            if (seen.has(n)) return false;
            seen.add(n);
        }
        return seen.size === 9;
    };

    // lignes
    for (let r = 0; r < 9; r++) if (!isValidGroup(grid[r])) return false;
    // colonnes
    for (let c = 0; c < 9; c++) {
        const col: number[] = [];
        for (let r = 0; r < 9; r++) col.push(grid[r][c]);
        if (!isValidGroup(col)) return false;
    }
    // blocs
    for (let br = 0; br < 3; br++) {
        for (let bc = 0; bc < 3; bc++) {
            const block: number[] = [];
            for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) block.push(grid[br*3 + r][bc*3 + c]);
            if (!isValidGroup(block)) return false;
        }
    }
    return true;
}

function isRot180Symmetric(grid: number[][]): boolean {
    for (let r = 0; r < 9; r++) {
        for (let c = 0; c < 9; c++) {
            const idx = r * 9 + c;
            const idx2 = 80 - idx;
            const r2 = Math.floor(idx2 / 9);
            const c2 = idx2 % 9;
            if ((grid[r][c] === 0) !== (grid[r2][c2] === 0)) return false; // positions de givens doivent correspondre
            if (grid[r][c] !== 0 && grid[r2][c2] !== 0 && grid[r][c] !== grid[r2][c2]) return false; // facultatif: valeurs peuvent être différentes, mais on exige symétrie miroir de valeurs aussi
        }
    }
    return true;
}

async function run() {
    console.log('Tests de génération Sudoku (contrôles: validité, unicité, symétrie rot180, solvabilité logique)');

    // Test 1: générer 50 grilles complètes et vérifier validité
    console.log('Test 1: générer 50 grilles complètes');
    for (let i = 0; i < 50; i++) {
        const full = generateSudoku(81);
        if (!isCompleteAndValid(full)) {
            console.error('Grille complète invalide détectée à l\'itération', i);
            console.log(full.map(r => r.join(' ')).join('\n'));
            if (process.exitCode !== undefined) process.exitCode = 2; else if (process.exit) process.exit(2);
            return;
        }
    }
    console.log('Test 1 OK');

    // Test 2: pour différents niveaux de givens, générer 50 puzzles et vérifier unicité + symétrie + logique
    const levels = [30, 35, 40, 45];
    for (const level of levels) {
        console.log(`Test 2: niveau ${level} -> générer 50 puzzles et vérifier unicité + symétrie + logique`);
        let okUnique = 0;
        let okLogical = 0;
        let okSym = 0;
        for (let i = 0; i < 50; i++) {
            const puzzle = generateSudoku(level);
            const sols = countSolutions(puzzle, 2);
            const logical = logicalSolve(puzzle);
            const sym = isRot180Symmetric(puzzle);
            if (sols === 1) okUnique++;
            if (logical.solved) okLogical++;
            if (sym) okSym++;
        }
        console.log(`niveau ${level}: ${okUnique}/50 uniques, ${okLogical}/50 résolus par logique, ${okSym}/50 symétriques`);
    }

    console.log('Tests terminés');
}

run().catch((err: unknown) => { console.error(err); if (process.exit) process.exit(1); });
