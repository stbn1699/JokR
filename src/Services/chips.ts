/*
 * Jetons des jeux de hasard : valeurs, image d'un jeton classique (public/chips/default/<valeur>.svg)
 * et décomposition d'une mise en vrais jetons pour les dessiner en pile.
 * Les autres jeux de jetons (boutique) et le jeu choisi par le joueur : voir chipSets.ts.
 */

export const CHIP_VALUES = [10, 20, 50, 100, 200, 500] as const;

export const DEFAULT_CHIP_SET = "default";

export const chipImage = (value: number, set = DEFAULT_CHIP_SET) => `/chips/${set}/${value}.svg`;

// (jeton classique ; pour le jeu choisi par le joueur, voir useChipImage dans chipSets.ts)

// Jetons d'une mise, du plus gros au plus petit (ex. 70 → 50 + 20) ; montants en multiples de 10
export function chipStack(amount: number): number[] {
    const chips: number[] = [];
    let rest = amount;
    for (const value of [...CHIP_VALUES].reverse()) {
        while (rest >= value) {
            chips.push(value);
            rest -= value;
        }
    }
    return chips;
}
