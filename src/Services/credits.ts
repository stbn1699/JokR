// Crédits « illimités » du mode admin : un nombre très grand (les vérifications « assez de crédits ? » passent),
// affiché « ∞ »
export const UNLIMITED_CREDITS = 1_000_000_000;

export const formatCredits = (credits: number) => (credits >= UNLIMITED_CREDITS ? "∞" : String(credits));
