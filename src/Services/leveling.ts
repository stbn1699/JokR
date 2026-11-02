// Même courbe que le backend (voir backend/src/utils/leveling.ts) : XP nécessaire pour passer au niveau suivant
const LEVEL_XP_CAP = 2050;
const LEVEL_XP_RAMP = 20;

export function xpToNextLevel(level: number): number {
    return Math.ceil(LEVEL_XP_CAP * (1 - Math.exp(-level / LEVEL_XP_RAMP)));
}

// Icônes disponibles : public/Icons/level_0.png à level_50.png.
// Au-delà, on réutilise la dernière en attendant les nouvelles icônes.
const MAX_LEVEL_ICON = 50;

export function levelIconSrc(level: number): string {
    const icon = Math.max(0, Math.min(level, MAX_LEVEL_ICON));
    return `/Icons/level_${icon}.png`;
}

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
