/*
 * Catalogue de la boutique, côté site : rubriques, objets et dessin des fonds.
 * Les identifiants et les prix sont les mêmes que côté serveur (backend/src/utils/shop.ts), qui vérifie les achats.
 * Pour l'instant : les fonds dégradés. Les fonds à motifs (quadrillé, rayé…) viendront s'ajouter ici.
 */

export type Gradient = {
    id: string;
    name: string;
    // halos de couleur (en haut à gauche, en haut à droite, en bas à gauche, en bas à droite), puis le fond
    glows: [string, string, string, string];
    base: string;
};

export const GRADIENT_PRICE = 15;

const g = (slug: string, name: string, glows: Gradient["glows"], base: string): Gradient => ({id: `gradient-${slug}`, name, glows, base});

export const GRADIENTS: Gradient[] = [
    g("aurore", "Aurore boréale", ["rgba(16,185,129,.55)", "rgba(56,189,248,.45)", "rgba(139,92,246,.45)", "rgba(20,184,166,.5)"], "#02130f"),
    g("crepuscule", "Crépuscule", ["rgba(249,115,22,.55)", "rgba(236,72,153,.45)", "rgba(168,85,247,.45)", "rgba(239,68,68,.45)"], "#1a0610"),
    g("ocean", "Océan", ["rgba(14,116,144,.55)", "rgba(37,99,235,.5)", "rgba(6,182,212,.4)", "rgba(30,64,175,.5)"], "#020b1a"),
    g("foret", "Forêt", ["rgba(21,128,61,.55)", "rgba(101,163,13,.4)", "rgba(6,95,70,.5)", "rgba(63,98,18,.5)"], "#04140a"),
    g("lave", "Lave", ["rgba(220,38,38,.6)", "rgba(249,115,22,.5)", "rgba(153,27,27,.55)", "rgba(234,88,12,.45)"], "#1a0502"),
    g("amethyste", "Améthyste", ["rgba(147,51,234,.55)", "rgba(192,132,252,.4)", "rgba(88,28,135,.55)", "rgba(126,34,206,.45)"], "#0f0518"),
    g("glacier", "Glacier", ["rgba(186,230,253,.35)", "rgba(56,189,248,.4)", "rgba(148,163,184,.35)", "rgba(125,211,252,.35)"], "#06121c"),
    g("bonbon", "Bonbon", ["rgba(244,114,182,.55)", "rgba(251,113,133,.45)", "rgba(217,70,239,.4)", "rgba(249,168,212,.4)"], "#1a0614"),
    g("desert", "Désert", ["rgba(217,119,6,.5)", "rgba(234,179,8,.4)", "rgba(180,83,9,.5)", "rgba(202,138,4,.4)"], "#1a1005"),
    g("minuit", "Minuit", ["rgba(49,46,129,.6)", "rgba(30,58,138,.55)", "rgba(67,56,202,.45)", "rgba(15,23,42,.6)"], "#03031a"),
    g("neon", "Néon", ["rgba(236,72,153,.55)", "rgba(34,211,238,.5)", "rgba(168,85,247,.5)", "rgba(59,130,246,.45)"], "#07021a"),
    g("emeraude", "Émeraude", ["rgba(5,150,105,.6)", "rgba(16,185,129,.45)", "rgba(4,120,87,.55)", "rgba(52,211,153,.35)"], "#021a12"),
    g("bordeaux", "Bordeaux", ["rgba(159,18,57,.6)", "rgba(190,18,60,.45)", "rgba(127,29,29,.55)", "rgba(136,19,55,.5)"], "#160208"),
    g("lagon", "Lagon", ["rgba(13,148,136,.55)", "rgba(45,212,191,.4)", "rgba(8,145,178,.5)", "rgba(20,184,166,.45)"], "#021616"),
    g("cuivre", "Cuivre", ["rgba(194,65,12,.5)", "rgba(180,83,9,.45)", "rgba(124,45,18,.55)", "rgba(217,119,6,.35)"], "#140a04"),
    g("galaxie", "Galaxie", ["rgba(109,40,217,.55)", "rgba(219,39,119,.4)", "rgba(37,99,235,.45)", "rgba(126,34,206,.45)"], "#050314"),
    g("menthe", "Menthe", ["rgba(52,211,153,.45)", "rgba(110,231,183,.3)", "rgba(16,185,129,.4)", "rgba(45,212,191,.35)"], "#03140f"),
    g("ardoise", "Ardoise", ["rgba(71,85,105,.55)", "rgba(100,116,139,.45)", "rgba(51,65,85,.55)", "rgba(148,163,184,.3)"], "#0b0f14"),
    g("peche", "Pêche", ["rgba(251,146,60,.5)", "rgba(251,113,133,.45)", "rgba(253,186,116,.35)", "rgba(244,63,94,.35)"], "#1a0c08"),
    g("prisme", "Prisme", ["rgba(239,68,68,.45)", "rgba(234,179,8,.4)", "rgba(34,197,94,.4)", "rgba(59,130,246,.45)"], "#0a0a14"),
];

/*
 * Fonds des paliers de niveau (gratuits) : la couleur de chaque palier du contour de profil,
 * débloquée en atteignant son niveau (le serveur le vérifie aussi, backend/src/utils/shop.ts).
 */
export type TierGradient = Gradient & { minLevel: number };

const tier = (slug: string, name: string, minLevel: number, glows: Gradient["glows"], base: string): TierGradient =>
    ({id: `tier-${slug}`, name, glows, base, minLevel});

export const TIER_GRADIENTS: TierGradient[] = [
    tier("stone", "Pierre", 1, ["rgba(185,190,198,.35)", "rgba(120,126,136,.35)", "rgba(148,153,161,.3)", "rgba(87,92,102,.4)"], "#0c0e11"),
    tier("copper", "Cuivre", 5, ["rgba(227,164,109,.45)", "rgba(180,83,9,.4)", "rgba(154,52,18,.45)", "rgba(217,119,6,.35)"], "#140a05"),
    tier("silver", "Argent", 10, ["rgba(229,233,239,.3)", "rgba(148,163,184,.35)", "rgba(203,213,225,.25)", "rgba(100,116,139,.4)"], "#0b0e13"),
    tier("gold", "Or", 15, ["rgba(255,216,77,.45)", "rgba(234,179,8,.4)", "rgba(202,138,4,.45)", "rgba(253,224,71,.3)"], "#141004"),
    tier("emerald", "Émeraude", 20, ["rgba(74,222,128,.45)", "rgba(22,163,74,.45)", "rgba(5,150,105,.45)", "rgba(134,239,172,.25)"], "#03140a"),
    tier("ruby", "Rubis", 30, ["rgba(255,90,120,.5)", "rgba(190,18,60,.45)", "rgba(225,29,72,.4)", "rgba(159,18,57,.5)"], "#18040a"),
    tier("sapphire", "Saphir", 40, ["rgba(111,147,255,.5)", "rgba(37,99,235,.45)", "rgba(30,64,175,.5)", "rgba(147,197,253,.25)"], "#040a1c"),
    tier("amethyst", "Améthyste", 50, ["rgba(192,140,255,.45)", "rgba(147,51,234,.45)", "rgba(126,34,206,.45)", "rgba(216,180,254,.25)"], "#0f0619"),
    tier("obsidian", "Obsidienne", 60, ["rgba(183,166,232,.3)", "rgba(30,27,75,.6)", "rgba(76,29,149,.4)", "rgba(15,23,42,.6)"], "#05040c"),
    tier("diamond", "Diamant", 70, ["rgba(143,211,247,.45)", "rgba(224,242,254,.25)", "rgba(56,189,248,.35)", "rgba(186,230,253,.3)"], "#04101a"),
    tier("opal", "Opale", 80, ["rgba(255,201,230,.4)", "rgba(143,211,247,.35)", "rgba(192,140,255,.35)", "rgba(110,231,183,.3)"], "#120c14"),
    tier("nebula", "Nébuleuse", 90, ["rgba(224,122,224,.5)", "rgba(111,147,255,.4)", "rgba(255,90,120,.35)", "rgba(192,140,255,.4)"], "#0c0414"),
    tier("platinum", "Platine", 100, ["rgba(244,247,251,.35)", "rgba(210,225,255,.4)", "rgba(186,230,253,.3)", "rgba(229,233,239,.3)"], "#0c1018"),
];

// Fond du palier qui commence à ce niveau (popup « Nouvelle couleur »)
export const tierGradientAt = (minLevel: number) => TIER_GRADIENTS.find(t => t.minLevel === minLevel);

// Fond par défaut du site (gratuit), même construction que les dégradés
export const DEFAULT_BACKGROUND: Gradient = g("defaut", "Par défaut",
    ["rgba(124,45,18,.55)", "rgba(11,60,93,.45)", "rgba(6,78,59,.45)", "rgba(30,27,75,.50)"], "#020617");

// Calques du fond : quatre halos de couleur
export function gradientLayers({glows}: Gradient): string {
    const [a, b, c, d] = glows;
    return [
        `radial-gradient(circle at 20% 30%, ${a} 0%, transparent 60%)`,
        `radial-gradient(circle at 80% 25%, ${b} 0%, transparent 65%)`,
        `radial-gradient(circle at 30% 75%, ${c} 0%, transparent 70%)`,
        `radial-gradient(circle at 70% 80%, ${d} 0%, transparent 75%)`,
    ].join(", ");
}

// Fond complet (calques puis couleur de base), pour les aperçus
export const gradientCss = (gradient: Gradient) => `${gradientLayers(gradient)}, ${gradient.base}`;

export const findGradient = (id: string | null | undefined): Gradient | undefined =>
    GRADIENTS.find(gr => gr.id === id) ?? TIER_GRADIENTS.find(gr => gr.id === id);

// Fonds utilisables : achetés, ou de palier débloqués par le niveau (le fond par défaut en premier)
export function usableBackgrounds(owned: string[], level: number): Gradient[] {
    return [DEFAULT_BACKGROUND, ...TIER_GRADIENTS.filter(t => level >= t.minLevel), ...GRADIENTS.filter(gr => owned.includes(gr.id))];
}


/*
 * Fonds à motifs : on achète des motifs et des couleurs (mêmes identifiants et prix que backend/src/utils/shop.ts),
 * puis on porte un motif avec deux couleurs : la couleur 1 pour le fond, la couleur 2 pour le motif.
 * Le fond porté s'écrit « pat:<motif>/<couleur 1>/<couleur 2> ». Nuit et Ardoise sont offertes.
 */
export const PATTERN_PRICE = 25;
export const PATTERN_COLOR_PRICE = 5;

export type Pattern = { id: string; slug: string; name: string };
export type PatternColor = { id: string; slug: string; name: string; hex: string; free: boolean };

export const PATTERNS: Pattern[] = ([
    ["rayures", "Rayures"], ["quadrille", "Quadrillé"], ["damier", "Damier"], ["pois", "Pois"],
    ["chevrons", "Chevrons"], ["losanges", "Losanges"], ["ecossais", "Écossais"], ["briques", "Briques"],
    ["ecailles", "Écailles"], ["alveoles", "Alvéoles"], ["vagues", "Vagues"], ["etoiles", "Étoiles"],
    ["triangles", "Triangles"], ["cartes", "Cartes"], ["puzzle", "Puzzle"],
] as const).map(([slug, name]) => ({id: `pattern-${slug}`, slug, name}));

export const PATTERN_COLORS: PatternColor[] = ([
    ["nuit", "Nuit", "#0f172a"], ["ardoise", "Ardoise", "#475569"], ["noir", "Noir", "#0a0a0a"],
    ["sable", "Sable", "#a8a29e"], ["creme", "Crème", "#e7e0d0"], ["rubis", "Rubis", "#be123c"],
    ["corail", "Corail", "#f97316"], ["ambre", "Ambre", "#f59e0b"], ["citron", "Citron", "#eab308"],
    ["olive", "Olive", "#65a30d"], ["emeraude", "Émeraude", "#059669"], ["lagon", "Lagon", "#0d9488"],
    ["ciel", "Ciel", "#0ea5e9"], ["cobalt", "Cobalt", "#2563eb"], ["indigo", "Indigo", "#4f46e5"],
    ["violet", "Violet", "#7c3aed"], ["orchidee", "Orchidée", "#c026d3"], ["rose", "Rose", "#ec4899"],
] as const).map(([slug, name, hex]) => ({id: `color-${slug}`, slug, name, hex, free: slug === "nuit" || slug === "ardoise"}));

// Couleurs prises par défaut (offertes) : un motif se porte dès qu'on l'a acheté
export const DEFAULT_PATTERN_COLORS = ["nuit", "ardoise"] as const;

// Voile sombre sur le fond du site, comme sur les fonds en images : les textes restent lisibles
const PATTERN_VEIL = "linear-gradient(rgba(2, 6, 23, 0.4), rgba(2, 6, 23, 0.4))";

const colorHex = (slug: string) => PATTERN_COLORS.find(c => c.slug === slug)?.hex ?? "#0f172a";

// Motif dessiné en SVG (carreau de `w` × `h` unités, 100 unités = 1,5 × `s` px : un peu plus grand que les
// motifs en dégradés, ses traits sont plus fins), répété sur la couleur du fond `a`
function svgTile(body: string, w: number, h: number, s: number, a: string): string {
    const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='${w}' height='${h}' viewBox='0 0 ${w} ${h}'>${body}</svg>`;
    const unit = (s * 1.5) / 100;
    return `url("data:image/svg+xml,${encodeURIComponent(svg)}") 0 0 / ${w * unit}px ${h * unit}px, ${a}`;
}

// Étoile à cinq branches (motif « Étoiles »)
function star(cx: number, cy: number, r: number): string {
    const points = Array.from({length: 10}, (_, i) => {
        const radius = i % 2 === 0 ? r : r * 0.42;
        const angle = -Math.PI / 2 + (i * Math.PI) / 5;
        return `${(cx + radius * Math.cos(angle)).toFixed(1)} ${(cy + radius * Math.sin(angle)).toFixed(1)}`;
    });
    return `M${points.join("L")}Z`;
}

// Les quatre enseignes des cartes, centrées sur (x, y) (motif « Cartes »)
const heart = (x: number, y: number) => `M${x} ${y + 10}C${x - 16} ${y - 2} ${x - 10} ${y - 14} ${x} ${y - 5}C${x + 10} ${y - 14} ${x + 16} ${y - 2} ${x} ${y + 10}Z`;
const spade = (x: number, y: number) =>
    `M${x} ${y - 12}C${x - 16} ${y} ${x - 10} ${y + 12} ${x} ${y + 4}C${x + 10} ${y + 12} ${x + 16} ${y} ${x} ${y - 12}Z M${x} ${y + 2}L${x - 5} ${y + 13}H${x + 5}Z`;
const diamond = (x: number, y: number) => `M${x} ${y - 12}L${x + 9} ${y}L${x} ${y + 12}L${x - 9} ${y}Z`;
const club = (x: number, y: number) =>
    `M${x} ${y + 2}L${x - 5} ${y + 13}H${x + 5}Z` +
    [[0, -6], [-6, 2], [6, 2]].map(([dx, dy]) => `M${x + dx! - 5.5} ${y + dy!}a5.5 5.5 0 1 0 11 0a5.5 5.5 0 1 0 -11 0`).join("");

// Calques CSS d'un motif : `a` la couleur du fond, `b` celle du motif, `s` la taille d'un carreau (px)
function patternLayers(slug: string, a: string, b: string, s: number): string {
    const h = s / 2;
    const tile = `${s}px ${s}px`;
    switch (slug) {
        case "rayures":
            return `repeating-linear-gradient(45deg, ${b} 0 ${s / 4}px, ${a} ${s / 4}px ${h}px)`;
        case "quadrille":
            return `linear-gradient(${b} 2px, transparent 2px) 0 0 / ${tile}, linear-gradient(90deg, ${b} 2px, transparent 2px) 0 0 / ${tile}, ${a}`;
        case "damier":
            return `conic-gradient(${b} 25%, ${a} 0 50%, ${b} 0 75%, ${a} 0) 0 0 / ${tile}`;
        case "pois":
            return `radial-gradient(${b} 18%, transparent 19%) 0 0 / ${tile}, radial-gradient(${b} 18%, transparent 19%) ${h}px ${h}px / ${tile}, ${a}`;
        case "chevrons":
            return [
                `linear-gradient(135deg, ${b} 25%, transparent 25%) -${h}px 0 / ${tile}`,
                `linear-gradient(225deg, ${b} 25%, transparent 25%) -${h}px 0 / ${tile}`,
                `linear-gradient(315deg, ${b} 25%, transparent 25%) 0 0 / ${tile}`,
                `linear-gradient(45deg, ${b} 25%, transparent 25%) 0 0 / ${tile}`,
                a,
            ].join(", ");
        case "losanges":
            return `conic-gradient(from 45deg, ${b} 25%, ${a} 0 50%, ${b} 0 75%, ${a} 0) 0 0 / ${tile}`;
        case "ecossais": {
            const band = `color-mix(in srgb, ${b} 55%, transparent)`;
            return [
                `repeating-linear-gradient(0deg, ${band} 0 ${s / 4}px, transparent ${s / 4}px ${s}px)`,
                `repeating-linear-gradient(90deg, ${band} 0 ${s / 4}px, transparent ${s / 4}px ${s}px)`,
                a,
            ].join(", ");
        }
        // motifs dessinés en SVG
        case "briques":
            return svgTile(`<path d='M0 1H100M0 51H100M1 0V50M51 50V100' stroke='${b}' stroke-width='8'/>`, 100, 100, s, a);
        case "ecailles":
            return svgTile(`<path d='M0 50A50 50 0 0 1 100 50M-50 100A50 50 0 0 1 50 100M50 100A50 50 0 0 1 150 100' fill='none' stroke='${b}' stroke-width='8'/>`, 100, 100, s, a);
        case "alveoles":
            return svgTile(`<path d='M28 66L0 50L0 16L28 0L56 16L56 50L28 66L28 100M28 0L28 34L0 50L0 84L28 100L56 84L56 50L28 34' fill='none' stroke='${b}' stroke-width='5'/>`, 56, 100, s, a);
        case "vagues":
            return svgTile(`<path d='M0 25Q25 5 50 25T100 25' fill='none' stroke='${b}' stroke-width='8'/>`, 100, 50, s, a);
        case "etoiles":
            return svgTile(`<path d='${star(18, 19, 14)}${star(53, 54, 14)}' fill='${b}'/>`, 70, 70, s, a);
        case "triangles":
            return svgTile(`<path d='M0 100L50 0L100 100Z' fill='${b}'/>`, 100, 100, s, a);
        case "cartes":
            return svgTile(`<path d='${heart(18, 18)}${spade(52, 18)}${club(18, 52)}${diamond(52, 52)}' fill='${b}'/>`, 70, 70, s, a);
        case "puzzle":
            return svgTile(`<path d='M0 50H38A12 12 0 1 0 62 50H100M50 0V38A12 12 0 1 1 50 62V100' fill='none' stroke='${b}' stroke-width='7'/>`, 100, 100, s, a);
        default:
            return a;
    }
}

/*
 * Fond CSS d'un motif avec ses deux couleurs (slugs). `size` : taille d'un carreau, plus petite dans les vignettes
 * et les maquettes ; `veil` : avec le voile sombre du fond du site (aperçus fidèles).
 */
export function patternCss(slug: string, color1: string, color2: string, {size = 56, veil = true} = {}): string {
    const layers = patternLayers(slug, colorHex(color1), colorHex(color2), size);
    return veil ? `${PATTERN_VEIL}, ${layers}` : layers;
}

export const patternBackgroundId = (slug: string, color1: string, color2: string) => `pat:${slug}/${color1}/${color2}`;

// Fond à motif porté (« pat:pois/rubis/nuit ») ; undefined : pas un fond à motif connu
export function parsePatternBackground(id: string | null | undefined): { pattern: Pattern; color1: PatternColor; color2: PatternColor } | undefined {
    const match = /^pat:([a-z]+)\/([a-z]+)\/([a-z]+)$/.exec(id ?? "");
    const pattern = PATTERNS.find(p => p.slug === match?.[1]);
    const color1 = PATTERN_COLORS.find(c => c.slug === match?.[2]);
    const color2 = PATTERN_COLORS.find(c => c.slug === match?.[3]);
    return pattern && color1 && color2 ? {pattern, color1, color2} : undefined;
}

/*
 * Fonds animés : un fond de base (CSS) et une animation dessinée par AnimatedBackground (étoiles, pluie…).
 * Mêmes identifiants et prix que backend/src/utils/shop.ts ; ils se portent comme les dégradés.
 */
export const ANIMATED_PRICE = 50;

export type AnimatedBackgroundItem = { id: string; slug: string; name: string; description: string; base: string };

export const ANIMATED_BACKGROUNDS: AnimatedBackgroundItem[] = [
    {slug: "etoiles", name: "Nuit étoilée", description: "Des étoiles qui scintillent doucement.",
        base: "linear-gradient(#020617, #0f1d3d 70%, #1e1b4b)"},
    {slug: "respire", name: "Aurore lente", description: "Des halos de couleur qui respirent et glissent lentement.",
        base: "#050816"},
    {slug: "pluie", name: "Pluie fine", description: "Une pluie fine qui tombe en biais.",
        base: "linear-gradient(#0b1220, #1c2a3f)"},
    {slug: "flocons", name: "Flocons", description: "Des flocons qui descendent en se balançant.",
        base: "linear-gradient(#0b1a3a, #2c4a7a)"},
    {slug: "lucioles", name: "Lucioles", description: "Des lucioles qui flottent et s'allument dans la nuit.",
        base: "linear-gradient(#020a06, #0d2618 70%, #14301f)"},
].map(a => ({...a, id: `anim-${a.slug}`}));

export const findAnimatedBackground = (id: string | null | undefined) => ANIMATED_BACKGROUNDS.find(a => a.id === id);
