// Petit solveur backtracking utile pour compter les solutions d'une grille de Sudoku.
// Exporte countSolutions(grid, max=2) qui parcourt les solutions et s'arrête dès que max est atteint.

export function cloneGrid(grid: number[][]): number[][] {
    return grid.map(row => row.slice());
}

function findEmpty(grid: number[][]): [number, number] | null {
    for (let r = 0; r < 9; r++) {
        for (let c = 0; c < 9; c++) {
            if (grid[r]![c] === 0) return [r, c];
        }
    }
    return null;
}

function isSafe(grid: number[][], row: number, col: number, num: number): boolean {
    for (let x = 0; x < 9; x++) {
        if (grid[row]![x] === num) return false;
        if (grid[x]![col] === num) return false;
    }
    const startRow = row - (row % 3);
    const startCol = col - (col % 3);
    for (let r = 0; r < 3; r++) {
        for (let c = 0; c < 3; c++) {
            if (grid[startRow + r]![startCol + c] === num) return false;
        }
    }
    return true;
}

export function countSolutions(grid: number[][], maxSolutions = 2): number {
    const working = cloneGrid(grid);
    let count = 0;

    function backtrack(): boolean {
        if (count >= maxSolutions) return true; // stop early
        const empty = findEmpty(working);
        if (!empty) {
            count++;
            return false; // found one, continue only to increment until max
        }
        const [r, c] = empty;
        for (let n = 1; n <= 9; n++) {
            if (isSafe(working, r, c, n)) {
                working[r]![c] = n;
                backtrack();
                working[r]![c] = 0;
                if (count >= maxSolutions) return true;
            }
        }
        return false;
    }

    backtrack();
    return count;
}

// -------------------- Solveur logique --------------------
// Implémente des techniques déterministes : naked singles, hidden singles, naked pairs (basique).
// Retourne { solved: boolean, grid: number[][] } où solved indique si la grille a été entièrement résolue
// via ces techniques sans recours au backtracking.

type LogicalResult = { solved: boolean; grid: number[][] };

function getCandidates(grid: number[][]): Set<number>[][] {
    const candidates: Set<number>[][] = Array.from({ length: 9 }, () => Array.from({ length: 9 }, () => new Set<number>()));
    for (let r = 0; r < 9; r++) {
        for (let c = 0; c < 9; c++) {
            if (grid[r]![c] !== 0) continue;
            const seen = new Set<number>();
            for (let x = 0; x < 9; x++) {
                if (grid[r]![x] !== 0) seen.add(grid[r]![x]!);
                if (grid[x]![c] !== 0) seen.add(grid[x]![c]!);
            }
            const startRow = r - (r % 3);
            const startCol = c - (c % 3);
            for (let rr = 0; rr < 3; rr++) for (let cc = 0; cc < 3; cc++) if (grid[startRow + rr]![startCol + cc] !== 0) seen.add(grid[startRow + rr]![startCol + cc]!);
            for (let n = 1; n <= 9; n++) if (!seen.has(n)) candidates[r]![c]!.add(n);
        }
    }
    return candidates as Set<number>[][];
}

function applyNakedSingles(grid: number[][], candidates: Set<number>[][]): boolean {
    let changed = false;
    for (let r = 0; r < 9; r++) {
        for (let c = 0; c < 9; c++) {
            if (grid[r]![c] === 0 && candidates[r]![c]!.size === 1) {
                grid[r]![c] = Array.from(candidates[r]![c]!)[0]!;
                // after placing, we need to clear candidates
                candidates[r]![c]!.clear();
                changed = true;
            }
        }
    }
    return changed;
}

// Place UN chiffre qui n'a qu'une case possible dans sa ligne, colonne ou bloc.
// Un seul à la fois : après un placement, les candidats calculés ne sont plus à jour.
function applyHiddenSingles(grid: number[][], candidates: Set<number>[][]): boolean {
    // rows
    for (let r = 0; r < 9; r++) {
        const counts: Map<number, number[]> = new Map();
        for (let c = 0; c < 9; c++) if (grid[r]![c] === 0) {
            for (const n of candidates[r]![c]!) {
                const arr = counts.get(n) ?? [];
                arr.push(c);
                counts.set(n, arr);
            }
        }
        for (const [n, arr] of counts) {
            if (arr.length === 1) {
                const c = arr[0]!;
                grid[r]![c] = n;
                return true;
            }
        }
    }
    // columns
    for (let c = 0; c < 9; c++) {
        const counts: Map<number, number[]> = new Map();
        for (let r = 0; r < 9; r++) if (grid[r]![c] === 0) {
            for (const n of candidates[r]![c]!) {
                const arr = counts.get(n) ?? [];
                arr.push(r);
                counts.set(n, arr);
            }
        }
        for (const [n, arr] of counts) {
            if (arr.length === 1) {
                const r = arr[0]!;
                grid[r]![c] = n;
                return true;
            }
        }
    }
    // blocks
    for (let br = 0; br < 3; br++) {
        for (let bc = 0; bc < 3; bc++) {
            const counts: Map<number, [number, number][]> = new Map();
            for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) {
                const rr = br * 3 + r;
                const cc = bc * 3 + c;
                if (grid[rr]![cc] === 0) {
                    for (const n of candidates[rr]![cc]!) {
                        const arr = counts.get(n) ?? [];
                        arr.push([rr, cc]);
                        counts.set(n, arr);
                    }
                }
            }
            for (const [n, arr] of counts) {
                if (arr.length === 1) {
                    const [rr, cc] = arr[0]!;
                    grid[rr]![cc] = n;
                    return true;
                }
            }
        }
    }
    return false;
}

function applyNakedPairs(grid: number[][], candidates: Set<number>[][]): boolean {
    let changed = false;
    // rows
    for (let r = 0; r < 9; r++) {
        const pairMap = new Map<string, number[]>();
        for (let c = 0; c < 9; c++) if (grid[r]![c] === 0) {
            if (candidates[r]![c]!.size === 2) {
                const key = Array.from(candidates[r]![c]!).sort().join(',');
                const arr = pairMap.get(key) ?? [];
                arr.push(c);
                pairMap.set(key, arr);
            }
        }
        for (const [key, arr] of pairMap) {
            if (arr.length === 2) {
                const nums = key.split(',').map(s => parseInt(s, 10));
                for (let c = 0; c < 9; c++) if (!arr.includes(c) && grid[r]![c] === 0) {
                    for (const n of nums) {
                        if (candidates[r]![c]!.has(n)) {
                            candidates[r]![c]!.delete(n);
                            changed = true;
                        }
                    }
                }
            }
        }
    }
    // columns
    for (let c = 0; c < 9; c++) {
        const pairMap = new Map<string, number[]>();
        for (let r = 0; r < 9; r++) if (grid[r]![c] === 0) {
            if (candidates[r]![c]!.size === 2) {
                const key = Array.from(candidates[r]![c]!).sort().join(',');
                const arr = pairMap.get(key) ?? [];
                arr.push(r);
                pairMap.set(key, arr);
            }
        }
        for (const [key, arr] of pairMap) {
            if (arr.length === 2) {
                const nums = key.split(',').map(s => parseInt(s, 10));
                for (let r = 0; r < 9; r++) if (!arr.includes(r) && grid[r]![c] === 0) {
                    for (const n of nums) {
                        if (candidates[r]![c]!.has(n)) {
                            candidates[r]![c]!.delete(n);
                            changed = true;
                        }
                    }
                }
            }
        }
    }
    // blocks
    for (let br = 0; br < 3; br++) {
        for (let bc = 0; bc < 3; bc++) {
            const pairMap = new Map<string, [number, number][]>();
            for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) {
                const rr = br * 3 + r;
                const cc = bc * 3 + c;
                if (grid[rr]![cc] === 0 && candidates[rr]![cc]!.size === 2) {
                    const key = Array.from(candidates[rr]![cc]!).sort().join(',');
                    const arr = pairMap.get(key) ?? [];
                    arr.push([rr, cc]);
                    pairMap.set(key, arr);
                }
            }
            for (const [key, arr] of pairMap) {
                if (arr.length === 2) {
                    const nums = key.split(',').map(s => parseInt(s, 10));
                    for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) {
                        const rr = br * 3 + r;
                        const cc = bc * 3 + c;
                        if (!arr.some(a => a[0] === rr && a[1] === cc) && grid[rr]![cc] === 0) {
                            for (const n of nums) {
                                if (candidates[rr]![cc]!.has(n)) {
                                    candidates[rr]![cc]!.delete(n);
                                    changed = true;
                                }
                            }
                        }
                    }
                }
            }
        }
    }
    return changed;
}

export function logicalSolve(inputGrid: number[][]): LogicalResult {
    const grid = cloneGrid(inputGrid);
    let candidates: Set<number>[][] = [];
    const stuck = () => {
        for (let r = 0; r < 9; r++) for (let c = 0; c < 9; c++) {
            if (grid[r]![c] === 0 && candidates[r]![c]!.size === 0) return true;
        }
        return false;
    };

    // À chaque tour : candidats recalculés depuis la grille, éliminations par paires,
    // puis placement de chiffres. On s'arrête quand plus aucun chiffre ne peut être placé.
    // (Avant, les paires signalaient un changement sans rien placer : boucle infinie.)
    while (true) {
        candidates = getCandidates(grid);
        if (stuck()) return {solved: false, grid};

        // Élimine des candidats tant que possible (termine : chaque passage en retire au moins un)
        while (applyNakedPairs(grid, candidates)) { /* continue */ }
        if (stuck()) return {solved: false, grid};

        // Tous les "naked singles" d'un même état sont des déductions valides en même temps
        if (applyNakedSingles(grid, candidates)) continue;
        if (applyHiddenSingles(grid, candidates)) continue;
        break;
    }

    const empty = findEmpty(grid);
    return {solved: !empty, grid};
}
