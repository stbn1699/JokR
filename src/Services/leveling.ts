// Même formule que le backend (backend/src/utils/leveling.ts) : XP nécessaire pour passer au niveau suivant
export function xpToNextLevel(level: number): number {
    return Math.ceil(120 * Math.pow(level, 1.4));
}

// Icônes disponibles : public/Icons/level_0.png à level_49.png.
// Au-delà, on réutilise la dernière en attendant les nouvelles icônes.
const MAX_LEVEL_ICON = 49;

export function levelIconSrc(level: number): string {
    const icon = Math.max(0, Math.min(level, MAX_LEVEL_ICON));
    return `/Icons/level_${icon}.png`;
}
