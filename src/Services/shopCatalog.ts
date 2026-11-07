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

// Calques du fond : quatre halos de couleur (fixés à l'écran, voir html dans index.css)
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

// Applique le fond au site entier (null : fond par défaut)
export function applySiteBackground(id: string | null) {
    const style = document.documentElement.style;
    const gradient = findGradient(id);
    if (!gradient) {
        style.removeProperty("background-image");
        style.removeProperty("background-color");
        return;
    }
    style.backgroundImage = gradientLayers(gradient);
    style.backgroundColor = gradient.base;
}
