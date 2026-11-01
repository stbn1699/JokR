/*
 * Règles de progression (niveau / XP), communes au niveau joueur et au niveau par jeu.
 * Le front utilise la même formule pour afficher les barres d'XP (src/Services/leveling.ts).
 */

// XP nécessaire pour passer du niveau `level` au suivant
export function xpToNextLevel(level: number): number {
    return Math.ceil(120 * Math.pow(level, 1.4));
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
