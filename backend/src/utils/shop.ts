import {plinkoBall, plinkoBallSets} from "./plinkoBalls.js";
import {chipSet, chipSets} from "./chipSets.js";
import {imageBackground, imageBackgroundSets} from "./backgroundSets.js";
import {upgradeItemId, UPGRADES} from "./upgrades.js";

/*
 * Catalogue de la boutique (prix et sortes d'objets). Les couleurs des fonds sont côté site
 * (src/Services/shopCatalog.ts), avec les mêmes identifiants : le serveur vérifie seulement
 * qu'un objet existe et ce qu'il coûte.
 */

// Fonds dégradés : 15 crédits chacun
export const GRADIENT_PRICE = 15;
export const GRADIENT_IDS = [
    "aurore", "crepuscule", "ocean", "foret", "lave", "amethyste", "glacier", "bonbon", "desert", "minuit",
    "neon", "emeraude", "bordeaux", "lagon", "cuivre", "galaxie", "menthe", "ardoise", "peche", "prisme",
] as const;

/*
 * Fonds à motifs : on achète un motif (rayures, pois…) et des couleurs, puis on porte le motif avec deux de ses
 * couleurs (couleur 1 : le fond, couleur 2 : le motif). Le fond porté s'écrit « pat:<motif>/<couleur 1>/<couleur 2> ».
 * Deux couleurs sont offertes, pour porter un motif dès qu'on l'a.
 */
export const PATTERN_PRICE = 25;
export const PATTERN_IDS = [
    "rayures", "quadrille", "damier", "pois", "chevrons", "losanges", "ecossais",
    "briques", "ecailles", "alveoles", "vagues", "etoiles", "triangles", "cartes", "puzzle",
] as const;
export const PATTERN_COLOR_PRICE = 5;
export const PATTERN_COLOR_IDS = [
    "nuit", "ardoise", "noir", "sable", "creme", "rubis", "corail", "ambre", "citron", "olive",
    "emeraude", "lagon", "ciel", "cobalt", "indigo", "violet", "orchidee", "rose",
] as const;
export const FREE_PATTERN_COLORS: readonly string[] = ["nuit", "ardoise"];

/*
 * Fonds animés (étoiles qui scintillent, pluie…) : dessinés et animés par le site (src/Components/Shop/AnimatedBackground.tsx),
 * vendus et portés comme les dégradés (identifiant « anim-<nom> »).
 */
export const ANIMATED_PRICE = 50;
export const ANIMATED_IDS = ["etoiles", "respire", "pluie", "flocons", "lucioles"] as const;

/*
 * Effets de victoire : joués par le site en fin de grille (src/Components/Confetti/victoryEffects.ts).
 * Les confettis sont offerts (effet par défaut, rien à acheter) ; les autres s'achètent.
 */
export const VICTORY_PRICE = 30;
export const VICTORY_IDS = ["artifice", "jetons", "etoiles", "cartes", "bulles"] as const;

export type ShopItem = {
    id: string;
    kind: "background" | "pattern" | "pattern-color" | "victory-effect" | "plinko-ball" | "chip-set" | "upgrade";
    price: number;
    // amélioration : le niveau d'avant, à avoir pour acheter celui-ci
    requires?: string;
};

export const SHOP_ITEMS: Record<string, ShopItem> = Object.fromEntries([
    ...GRADIENT_IDS.map(slug => ({id: `gradient-${slug}`, kind: "background", price: GRADIENT_PRICE} as const)),
    ...ANIMATED_IDS.map(slug => ({id: `anim-${slug}`, kind: "background", price: ANIMATED_PRICE} as const)),
    ...VICTORY_IDS.map(slug => ({id: `victory-${slug}`, kind: "victory-effect", price: VICTORY_PRICE} as const)),
    ...PATTERN_IDS.map(slug => ({id: `pattern-${slug}`, kind: "pattern", price: PATTERN_PRICE} as const)),
    // améliorations : chaque niveau s'achète, après celui d'avant (voir upgrades.ts)
    ...UPGRADES.flatMap(u => u.levels.map((l, i) => ({
        id: upgradeItemId(u.id, i + 1), kind: "upgrade", price: l.price,
        ...(i > 0 ? {requires: upgradeItemId(u.id, i)} : {}),
    } as const))),
    // les couleurs offertes ne s'achètent pas
    ...PATTERN_COLOR_IDS.filter(slug => !FREE_PATTERN_COLORS.includes(slug))
        .map(slug => ({id: `color-${slug}`, kind: "pattern-color", price: PATTERN_COLOR_PRICE} as const)),
].map(item => [item.id, item]));

/*
 * Fond à motif porté (« pat:rayures/rubis/nuit ») : le motif à posséder, et les couleurs à posséder
 * (sans les couleurs offertes). undefined : pas un fond à motif valide.
 */
export function patternBackground(id: unknown): { pattern: string; colors: string[]; needs: string[] } | undefined {
    if (typeof id !== "string") return undefined;
    const match = /^pat:([a-z]+)\/([a-z]+)\/([a-z]+)$/.exec(id);
    if (!match) return undefined;
    const [, pattern = "", c1 = "", c2 = ""] = match;
    const colors = [c1, c2];
    if (!(PATTERN_IDS as readonly string[]).includes(pattern)) return undefined;
    if (!colors.every(c => (PATTERN_COLOR_IDS as readonly string[]).includes(c))) return undefined;
    return {
        pattern,
        colors,
        needs: [`pattern-${pattern}`, ...new Set(colors.filter(c => !FREE_PATTERN_COLORS.includes(c)).map(c => `color-${c}`))],
    };
}

// Objet de la boutique : fond dégradé, motif, couleur de motif, jeu de jetons ou bille de Plinko (lus dans les dossiers d'images,
// voir chipSets.ts et plinkoBalls.ts)
export function shopItem(id: unknown): ShopItem | undefined {
    if (typeof id !== "string") return undefined;
    if (SHOP_ITEMS[id]) return SHOP_ITEMS[id];
    const image = imageBackground(id);
    if (image) return {id: image.id, kind: "background", price: image.price};
    const chips = chipSet(id);
    // les jetons classiques sont offerts : ils ne s'achètent pas
    if (chips) return chips.price > 0 ? {id: chips.id, kind: "chip-set", price: chips.price} : undefined;
    const ball = plinkoBall(id);
    // la bille par défaut est offerte : elle ne s'achète pas
    return ball && ball.price > 0 ? {id: ball.id, kind: "plinko-ball", price: ball.price} : undefined;
}

/*
 * Fonds des paliers de niveau (gratuits) : un dégradé à la couleur de chaque palier du contour de profil,
 * débloqué en atteignant son niveau (mêmes paliers que LEVEL_TIERS dans src/Services/leveling.ts).
 */
export const TIER_BACKGROUNDS: Record<string, number> = {
    "tier-stone": 1, "tier-copper": 5, "tier-silver": 10, "tier-gold": 15, "tier-emerald": 20, "tier-ruby": 30,
    "tier-sapphire": 40, "tier-amethyst": 50, "tier-obsidian": 60, "tier-diamond": 70, "tier-opal": 80,
    "tier-nebula": 90, "tier-platinum": 100,
};

// Niveau qui débloque un fond de palier (undefined : pas un fond de palier)
export const tierBackgroundLevel = (id: unknown): number | undefined => (typeof id === "string" ? TIER_BACKGROUNDS[id] : undefined);

/*
 * Tout ce que la boutique vend, rangé par catégorie (succès « Tous les … » et « Toute la boutique », voir
 * utils/achievements.ts) : seulement ce qui s'achète (prix > 0), sans les cadeaux ni les fonds des paliers.
 */
export function shopCategoryItems(): Record<string, string[]> {
    const ids = (kind: ShopItem["kind"], prefix?: string) => Object.values(SHOP_ITEMS)
        .filter(i => i.kind === kind && (!prefix || i.id.startsWith(prefix))).map(i => i.id);
    return {
        gradients: ids("background", "gradient-"),
        animated: ids("background", "anim-"),
        patterns: ids("pattern"),
        colors: ids("pattern-color"),
        victory: ids("victory-effect"),
        images: imageBackgroundSets().flatMap(s => s.backgrounds).filter(b => b.price > 0).map(b => b.id),
        chips: chipSets().filter(c => c.price > 0).map(c => c.id),
        balls: plinkoBallSets().flatMap(s => s.balls).filter(b => b.price > 0).map(b => b.id),
        upgrades: ids("upgrade"),
    };
}
