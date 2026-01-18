export type ValidationResult = 'pas fini' | 'pas bon' | 'bien joué';

// Valide un tableau d'inputs HTML (taille attendue 81) et retourne l'un des trois résultats
export default function validateSudoku(inputs: (HTMLInputElement | undefined)[]): ValidationResult {
    const values: number[] = [];
    let filledCount = 0;

    for (let i = 0; i < 81; i++) {
        const el = inputs[i];
        const v = el?.value ?? "";
        const n = v === "" ? NaN : parseInt(v, 10);
        values.push(Number.isNaN(n) ? NaN : n);
        if (!Number.isNaN(n)) filledCount++;
    }

    if (filledCount < 81) {
        return 'pas fini';
    }

    // Construire la grille 9x9
    const grid: number[][] = [];
    for (let r = 0; r < 9; r++) {
        grid[r] = values.slice(r * 9, r * 9 + 9) as number[];
    }

    // Helper pour vérifier qu'un groupe contient exactement 1..9
    function isValidGroup(arr: number[]) {
        const seen = new Set<number>();
        for (const n of arr) {
            if (n < 1 || n > 9) return false;
            if (seen.has(n)) return false;
            seen.add(n);
        }
        return seen.size === 9;
    }

    // Vérifier les lignes
    for (let r = 0; r < 9; r++) {
        if (!isValidGroup(grid[r])) return 'pas bon';
    }

    // Vérifier les colonnes
    for (let c = 0; c < 9; c++) {
        const col: number[] = [];
        for (let r = 0; r < 9; r++) col.push(grid[r][c]);
        if (!isValidGroup(col)) return 'pas bon';
    }

    // Vérifier les blocs 3x3
    for (let br = 0; br < 3; br++) {
        for (let bc = 0; bc < 3; bc++) {
            const block: number[] = [];
            for (let r = 0; r < 3; r++) {
                for (let c = 0; c < 3; c++) {
                    block.push(grid[br * 3 + r][bc * 3 + c]);
                }
            }
            if (!isValidGroup(block)) return 'pas bon';
        }
    }

    return 'bien joué';
}

