/*
 * Règles de progression (niveau / XP), communes au niveau joueur et au niveau par jeu.
 * Le front utilise la même formule pour afficher les barres d'XP (src/Services/leveling.ts).
 */

/*
 * Courbe de progression : l'XP demandée par niveau monte vite au début puis se stabilise vers ~2050.
 *   XP pour passer du niveau n au suivant = ceil(2050 × (1 − e^(−n / 20)))
 *   niveau 1 → 2 : 100 XP, niveau 10 : 807, niveau 50 : 1882, niveau 100 : 2037
 * Calibrée pour un joueur régulier (~600 XP par jour : les 3 défis du jour et quelques parties) :
 * niveau 10 en ~1 semaine, niveau 50 en ~3,5 mois, niveau 100 en ~9 mois.
 * Pour changer le rythme : LEVEL_XP_CAP (palier final) et LEVEL_XP_RAMP (vitesse de montée),
 * en les gardant identiques côté serveur et côté navigateur, et avec une migration pour recalculer les niveaux.
 */
export const LEVEL_XP_CAP = 2050;
export const LEVEL_XP_RAMP = 20;

// XP nécessaire pour passer du niveau `level` au suivant
export function xpToNextLevel(level: number): number {
    return Math.ceil(LEVEL_XP_CAP * (1 - Math.exp(-level / LEVEL_XP_RAMP)));
}

// Ajoute de l'XP et enchaîne autant de montées de niveau que nécessaire
export function addXp(level: number, xp: number, gained: number): { level: number; xp: number } {
    let newLevel = level;
    let newXp = xp + Math.max(0, gained);

    while (newXp >= xpToNextLevel(newLevel)) {
        newXp -= xpToNextLevel(newLevel);
        newLevel++;
    }

    return {level: newLevel, xp: newXp};
}
