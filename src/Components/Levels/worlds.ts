/**
 * Les 20 mondes de la carte des niveaux (50 niveaux chacun), du plus doux au plus intense : nom, couleurs et
 * particules. Le décor détaillé de chacun est dessiné dans worldScenes.tsx (dans le même ordre).
 * - sky : dégradé du ciel (haut, bas) ; far / near : couleurs de base des plans du décor
 * - road : la route ; stone : la matière des ronds verrouillés ; accent : le rond à jouer, la bordure de l'encart, la
 *   barre de progression ; ink : texte posé sur l'accent
 * - particles : petites choses qui passent devant le décor (feuilles, pétales, éclats de lumière, flocons…)
 * Les mêmes mondes pour tous les jeux. Le niveau réussi reste en or partout.
 */

export type ParticleKind = "leaves" | "petals" | "sparkles" | "fireflies" | "snow" | "bubbles" | "embers" | "dust" | "rain";
export type Particles = { kind: ParticleKind; colors: string[] };

export type World = {
    name: string;
    sky: [string, string];
    far: string;
    near: string;
    road: string;
    stone: string;
    accent: string;
    ink: string;
    particles: Particles[];
};

const p = (kind: ParticleKind, ...colors: string[]): Particles => ({kind, colors});

export const WORLDS: World[] = [
    {name: "La Plaine", sky: ["#7cc4ee", "#d6f0fb"], far: "#8cc76b", near: "#4f9a3c", road: "#b98d55", stone: "#6f7d5c", accent: "#10b981", ink: "#022c22",
        particles: [p("leaves", "#65a30d", "#84cc16", "#facc15")]},
    {name: "La Forêt", sky: ["#163b33", "#3f7a5f"], far: "#2c6e49", near: "#173f2c", road: "#7a5a3a", stone: "#465a4b", accent: "#a3e635", ink: "#1a2e05",
        particles: [p("leaves", "#4d7c0f", "#a16207", "#c2410c"), p("fireflies", "#ecfccb")]},
    {name: "La Rivière", sky: ["#6fb8e0", "#cdeaf7"], far: "#5aa6cc", near: "#2f7ea8", road: "#9a7a52", stone: "#5f7b8a", accent: "#38bdf8", ink: "#082f49",
        particles: [p("leaves", "#65a30d", "#a3e635"), p("sparkles", "#ffffff")]},
    {name: "La Côte", sky: ["#f4a96b", "#ffe2b8"], far: "#2fb3bc", near: "#e8c88a", road: "#d9b679", stone: "#a38c64", accent: "#14b8a6", ink: "#042f2e",
        particles: [p("sparkles", "#ffffff", "#fef3c7")]},
    {name: "Les Marais", sky: ["#4a5a42", "#8a9a78"], far: "#4f6146", near: "#2d3c28", road: "#5f4d33", stone: "#4d5841", accent: "#bef264", ink: "#1a2e05",
        particles: [p("fireflies", "#d9f99d"), p("leaves", "#65733f", "#8a7a3a")]},
    {name: "La Savane", sky: ["#e8743b", "#fbc77e"], far: "#c97f35", near: "#7d4c1f", road: "#b97c42", stone: "#7d5f42", accent: "#fb923c", ink: "#431407",
        particles: [p("leaves", "#ca8a04", "#a16207"), p("dust", "#ffedd5")]},
    {name: "Le Désert", sky: ["#e9b660", "#fbe6b3"], far: "#e2ad58", near: "#c4873c", road: "#e8c27f", stone: "#a87d48", accent: "#06b6d4", ink: "#083344",
        particles: [p("dust", "#fde68a", "#fef3c7")]},
    {name: "Le Canyon", sky: ["#d9653a", "#f6b57e"], far: "#b44d33", near: "#7a3220", road: "#c97a50", stone: "#713a28", accent: "#22d3ee", ink: "#083344",
        particles: [p("dust", "#fed7aa", "#fdba74")]},
    {name: "La Montagne", sky: ["#5f84ab", "#c4d7ea"], far: "#71859c", near: "#45556a", road: "#8d97a3", stone: "#56616f", accent: "#60a5fa", ink: "#172554",
        particles: [p("snow", "#ffffff")]},
    {name: "La Banquise", sky: ["#8ccbe6", "#eef9fd"], far: "#b2dcee", near: "#eaf7fc", road: "#bcdbe8", stone: "#7fa4b6", accent: "#0ea5e9", ink: "#082f49",
        particles: [p("snow", "#ffffff"), p("sparkles", "#e0f2fe")]},
    {name: "Les Aurores", sky: ["#04101f", "#123247"], far: "#1d8a7c", near: "#0b2433", road: "#33506a", stone: "#283f51", accent: "#2dd4bf", ink: "#042f2e",
        particles: [p("snow", "#e0f2fe"), p("sparkles", "#5eead4", "#c4b5fd")]},
    {name: "Les Cerisiers", sky: ["#f5b8cb", "#fde9ef"], far: "#ef9ab6", near: "#c9608a", road: "#d9c0aa", stone: "#a87f8f", accent: "#db2777", ink: "#fdf2f8",
        particles: [p("petals", "#fbcfe8", "#f9a8d4", "#fdf2f8")]},
    {name: "La Jungle", sky: ["#0f4a2c", "#2f8a55"], far: "#15803d", near: "#053b2c", road: "#6e4f33", stone: "#3a5745", accent: "#f97316", ink: "#431407",
        particles: [p("leaves", "#16a34a", "#22c55e", "#4d7c0f"), p("fireflies", "#fef08a")]},
    {name: "Les Abysses", sky: ["#020f1f", "#0b4a6a"], far: "#0e5578", near: "#082c40", road: "#14546a", stone: "#1b3747", accent: "#22d3ee", ink: "#083344",
        particles: [p("bubbles", "#a5f3fc"), p("sparkles", "#67e8f9")]},
    {name: "Les Cristaux", sky: ["#1a0838", "#43188a"], far: "#5b21b6", near: "#8b5cf6", road: "#4c1d95", stone: "#463664", accent: "#e879f9", ink: "#4a044e",
        particles: [p("sparkles", "#f5d0fe", "#ffffff", "#c4b5fd", "#a5f3fc")]},
    {name: "Le Volcan", sky: ["#120d0b", "#4a1d12"], far: "#3d3733", near: "#1c1816", road: "#4f4945", stone: "#3a3431", accent: "#f97316", ink: "#431407",
        particles: [p("embers", "#fb923c", "#fbbf24")]},
    {name: "La Cité perdue", sky: ["#c9b48a", "#efe5cf"], far: "#bba67f", near: "#8e7653", road: "#cdbb98", stone: "#8f7d5f", accent: "#8b5cf6", ink: "#f5f3ff",
        particles: [p("dust", "#fef3c7"), p("leaves", "#65a30d", "#a16207")]},
    {name: "Les Îles célestes", sky: ["#8f9ff0", "#dfe5ff"], far: "#f5f7ff", near: "#8c9be6", road: "#d6dcfb", stone: "#929cc9", accent: "#6366f1", ink: "#eef2ff",
        particles: [p("petals", "#ffffff", "#e0e7ff"), p("sparkles", "#ffffff")]},
    {name: "L'Orage", sky: ["#0b1220", "#2b3a52"], far: "#2e3b50", near: "#0f1726", road: "#46546a", stone: "#364255", accent: "#a5f3fc", ink: "#083344",
        particles: [p("rain", "#bae6fd"), p("leaves", "#3f6212", "#365314")]},
    {name: "Le Cosmos", sky: ["#05030f", "#1f1147"], far: "#4c1d95", near: "#1e1b4b", road: "#a78bfa", stone: "#2e2a72", accent: "#f0abfc", ink: "#4a044e",
        particles: [p("sparkles", "#ffffff", "#f0abfc", "#a5b4fc")]},
];

// monde n (à partir de 0) ; au-delà de 20 mondes, on recommence
export const worldAt = (index: number): World => WORLDS[((index % WORLDS.length) + WORLDS.length) % WORLDS.length]!;

// niveaux par monde
export const WORLD_SIZE = 50;

/**
 * Numérotation affichée : de 1 à 50 dans chaque monde (le niveau 56 du jeu est le niveau 6 du monde 2).
 * Les adresses et le serveur gardent le numéro dans le jeu (1 à 1000).
 */
export const levelInWorld = (level: number) => ({
    world: Math.floor((level - 1) / WORLD_SIZE) + 1,
    number: ((level - 1) % WORLD_SIZE) + 1,
});

/**
 * Niveau que le joueur doit faire : celui qui suit ses niveaux réussis (ils se font dans l'ordre), même s'il n'a pas
 * encore ouvert son monde. Après le niveau 50, c'est le niveau 1 du monde 2. Tout fini : le dernier niveau du jeu.
 */
export const currentLevel = (done: number, count: number) => Math.max(1, Math.min(done + 1, count));

// « Monde 2 - Niveau 6 »
export function levelName(level: number): string {
    const {world, number} = levelInWorld(level);
    return `Monde ${world} - Niveau ${number}`;
}

/**
 * Niveau qui termine un monde (50, 100…) et qui n'est pas le dernier du jeu : à sa réussite, pas de « Niveau suivant »
 * mais l'arrivée dans le monde suivant (fête sur la carte, voir WorldUnlockPopup). Renvoie le monde ouvert (à partir
 * de 0), ou null.
 */
export function worldOpenedBy(level: number, count: number | null | undefined): number | null {
    if (level % WORLD_SIZE !== 0 || count === null || count === undefined || level >= count) return null;
    return level / WORLD_SIZE;
}
