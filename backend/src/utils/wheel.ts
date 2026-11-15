/*
 * Roue du jour (page Hasard) : un lancer gratuit par jour (le jour change à minuit, heure de Paris),
 * qui rapporte des crédits ou de l'XP. Commun au serveur (tirage) et au site (dessin de la roue).
 *
 * Les cases ont toutes la même taille sur la roue, mais pas la même chance de tomber : `weight` sur 1000.
 * En moyenne un lancer rapporte ~47 crédits et ~26 XP. L'ordre est celui de la roue, dans le sens des
 * aiguilles d'une montre en partant du haut ; le numéro d'une case est enregistré avec chaque lancer :
 * ajouter des cases à la fin, ne pas réordonner.
 */

export type WheelReward = "credits" | "xp";

export type WheelSegment = {
    reward: WheelReward;
    amount: number;
    // chances sur 1000
    weight: number;
    jackpot?: boolean;
};

export const WHEEL_SEGMENTS: readonly WheelSegment[] = [
    {reward: "credits", amount: 25, weight: 300},
    {reward: "xp", amount: 50, weight: 180},
    {reward: "credits", amount: 100, weight: 120},
    {reward: "xp", amount: 100, weight: 100},
    {reward: "credits", amount: 1000, weight: 5, jackpot: true},
    {reward: "xp", amount: 200, weight: 30},
    {reward: "credits", amount: 50, weight: 220},
    {reward: "credits", amount: 250, weight: 45},
];

export const WHEEL_TOTAL_WEIGHT = WHEEL_SEGMENTS.reduce((n, s) => n + s.weight, 0);

// Case tirée pour un nombre tiré au hasard entre 0 (compris) et WHEEL_TOTAL_WEIGHT (exclu)
export function wheelSegmentFor(roll: number): number {
    let left = roll;
    for (let i = 0; i < WHEEL_SEGMENTS.length; i++) {
        left -= WHEEL_SEGMENTS[i]!.weight;
        if (left < 0) return i;
    }
    return WHEEL_SEGMENTS.length - 1;
}

// Chance d'une case, en pourcentage (0,5 ; 30…)
export function wheelChance(segment: WheelSegment): number {
    return segment.weight / WHEEL_TOTAL_WEIGHT * 100;
}
