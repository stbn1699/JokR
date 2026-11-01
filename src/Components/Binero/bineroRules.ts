import type {BineroCell} from "../../Models/bineroSettings.model.ts";

/**
 * Cases qui contredisent déjà les règles du Binero (grille à plat, index = ligne * size + colonne) :
 * - trois chiffres identiques côte à côte
 * - plus de size/2 fois le même chiffre dans une ligne ou une colonne
 * - deux lignes (ou deux colonnes) complètes identiques
 * Ne dit rien de la solution : seulement ce qui est déjà faux.
 */
export function bineroConflicts(values: BineroCell[], size: number): Set<number> {
    const conflicts = new Set<number>();
    const half = size / 2;
    const rows = Array.from({length: size}, (_, r) => Array.from({length: size}, (_, c) => r * size + c));
    const cols = Array.from({length: size}, (_, c) => Array.from({length: size}, (_, r) => r * size + c));

    for (const lines of [rows, cols]) {
        const complete = new Map<string, number[][]>();

        for (const line of lines) {
            const v = line.map(i => values[i] ?? null);

            for (let k = 0; k + 2 < size; k++) {
                if (v[k] !== null && v[k] === v[k + 1] && v[k] === v[k + 2]) {
                    [line[k]!, line[k + 1]!, line[k + 2]!].forEach(i => conflicts.add(i));
                }
            }

            for (const digit of [0, 1]) {
                const cells = line.filter((_, k) => v[k] === digit);
                if (cells.length > half) cells.forEach(i => conflicts.add(i));
            }

            if (!v.includes(null)) {
                const key = v.join("");
                complete.set(key, [...(complete.get(key) ?? []), line]);
            }
        }

        for (const same of complete.values()) {
            if (same.length > 1) same.flat().forEach(i => conflicts.add(i));
        }
    }
    return conflicts;
}
