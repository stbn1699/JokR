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

export type ShopItem = { id: string; kind: "background"; price: number };

export const SHOP_ITEMS: Record<string, ShopItem> = Object.fromEntries(
    GRADIENT_IDS.map(slug => {
        const id = `gradient-${slug}`;
        return [id, {id, kind: "background", price: GRADIENT_PRICE}];
    }),
);

export const shopItem = (id: unknown): ShopItem | undefined => (typeof id === "string" ? SHOP_ITEMS[id] : undefined);

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
