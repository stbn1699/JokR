// Même courbe que le backend (voir backend/src/utils/leveling.ts) : XP nécessaire pour passer au niveau suivant
const LEVEL_XP_CAP = 2050;
const LEVEL_XP_RAMP = 20;

export function xpToNextLevel(level: number): number {
    return Math.ceil(LEVEL_XP_CAP * (1 - Math.exp(-level / LEVEL_XP_RAMP)));
}

/**
 * Progression avant un gain d'XP déjà reçu (l'inverse d'un gain) : redescend de niveau si besoin.
 * Sert à rejouer l'animation du header pour un gain donné pendant l'absence du joueur.
 */
export function xpBefore(level: number, xp: number, gained: number): { level: number; xp: number } {
    let [l, x] = [level, xp - gained];
    while (x < 0 && l > 1) {
        l--;
        x += xpToNextLevel(l);
    }
    return {level: l, xp: Math.max(0, x)};
}

/*
 * Paliers de niveau : couleur du contour de l'icône de profil.
 * Rapprochés au début (pierre au niveau 1, puis cuivre 5, argent 10, or 15), puis une pierre précieuse
 * tous les 10 niveaux jusqu'au platine, au niveau 100.
 */
export const LEVEL_TIERS = [
    {id: "stone", min: 1, name: "Pierre"},
    {id: "copper", min: 5, name: "Cuivre"},
    {id: "silver", min: 10, name: "Argent"},
    {id: "gold", min: 15, name: "Or"},
    {id: "emerald", min: 20, name: "Émeraude"},
    {id: "ruby", min: 30, name: "Rubis"},
    {id: "sapphire", min: 40, name: "Saphir"},
    {id: "amethyst", min: 50, name: "Améthyste"},
    {id: "obsidian", min: 60, name: "Obsidienne"},
    {id: "diamond", min: 70, name: "Diamant"},
    {id: "opal", min: 80, name: "Opale"},
    {id: "nebula", min: 90, name: "Nébuleuse"},
    {id: "platinum", min: 100, name: "Platine"},
] as const;
export type LevelTier = typeof LEVEL_TIERS[number]["id"];

// Rang du palier d'un niveau (0 = pierre)
export function levelTierIndex(level: number): number {
    let index = 0;
    LEVEL_TIERS.forEach((t, i) => {
        if (level >= t.min) index = i;
    });
    return index;
}

export function levelTier(level: number): LevelTier {
    return LEVEL_TIERS[levelTierIndex(level)]!.id;
}

export const LEVEL_TIER_NAMES = Object.fromEntries(LEVEL_TIERS.map(t => [t.id, t.name])) as Record<LevelTier, string>;

/**
 * Une étape de remplissage de la barre d'XP, sur un niveau donné :
 * la barre va de `from` à `to` (sur `max`). `levelUp` : la barre est pleine, on passe au niveau suivant.
 */
export type XpStep = { level: number; from: number; to: number; max: number; levelUp: boolean };

/**
 * Découpe un gain d'XP en étapes, une par niveau traversé (même règle que le serveur :
 * le surplus d'XP passe au niveau suivant). Sert à animer la barre de la popup de victoire.
 */
export function xpSteps(level: number, xp: number, gained: number): XpStep[] {
    const steps: XpStep[] = [];
    let currentLevel = level;
    let current = xp;
    let remaining = Math.max(0, gained);

    do {
        const max = xpToNextLevel(currentLevel);
        const needed = max - current;
        if (remaining >= needed) {
            steps.push({level: currentLevel, from: current, to: max, max, levelUp: true});
            remaining -= needed;
            currentLevel++;
            current = 0;
        } else {
            steps.push({level: currentLevel, from: current, to: current + remaining, max, levelUp: false});
            remaining = 0;
        }
        // Après une montée de niveau, on termine toujours sur le nouveau niveau (même à 0 XP)
    } while (remaining > 0 || steps[steps.length - 1]!.levelUp);

    return steps;
}
