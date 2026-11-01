/**
 * Convertit les 81 valeurs saisies (ligne par ligne) en grille 9×9.
 * Retourne null si une case est vide ou ne contient pas un chiffre de 1 à 9.
 */
export function parseGridValues(values: string[]): number[][] | null {
    if (values.length !== 81) return null;

    const grid: number[][] = [];
    for (let r = 0; r < 9; r++) {
        const row: number[] = [];
        for (let c = 0; c < 9; c++) {
            const n = Number(values[r * 9 + c]);
            if (!Number.isInteger(n) || n < 1 || n > 9) return null;
            row.push(n);
        }
        grid.push(row);
    }
    return grid;
}
