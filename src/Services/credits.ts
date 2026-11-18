// Crédits « illimités » du mode admin : un nombre très grand (les vérifications « assez de crédits ? » passent),
// affiché « ∞ » (le mode admin ne dépense rien : le solde reste exactement celui-ci)
export const UNLIMITED_CREDITS = 1_000_000_000;

// Paliers d'écriture courte : à partir de 10 000, puis du million et du milliard
const UNITS = [
    {from: 1_000_000_000, size: 1_000_000_000, unit: "Md"},
    {from: 1_000_000, size: 1_000_000, unit: "M"},
    {from: 10_000, size: 1_000, unit: "k"},
];

/*
 * Solde affiché : en entier jusqu'à 9 999, puis court avec une décimale (12,3k ; 1,5M ; 2Md). Arrondi en dessous :
 * on n'affiche jamais plus que ce qu'on a (999 999 donne 999,9k, pas 1M).
 */
export function formatCredits(credits: number): string {
    if (credits === UNLIMITED_CREDITS) return "∞";
    const scale = UNITS.find(u => Math.abs(credits) >= u.from);
    if (!scale) return String(credits);
    const tenths = Math.floor(credits / scale.size * 10) / 10;
    return `${tenths.toLocaleString("fr-FR", {maximumFractionDigits: 1})}${scale.unit}`;
}

// Solde en entier, avec les espaces des milliers (bulle d'aide à côté de l'écriture courte)
export const fullCredits = (credits: number) => (credits === UNLIMITED_CREDITS ? "illimités" : credits.toLocaleString("fr-FR"));
