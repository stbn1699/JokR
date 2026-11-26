import {THEME_CATEGORIES, type ThemeCategory} from "./quizzThemes.js";

/*
 * Mélanges de thèmes du Quizz : des « thèmes » qui piochent leurs questions dans plusieurs autres.
 * Partagé avec le site (src/Components/Quizz/quizzMixes.ts) ; leurs identifiants ne peuvent pas servir d'adresse
 * à un thème créé par un joueur.
 * - « tout » : tous les thèmes ;
 * - « categorie-<catégorie> » : tous les thèmes d'une catégorie (categorie-cinema…) ;
 * - « mix-<empreinte> » : partie custom, les thèmes choisis par le joueur (dans l'adresse : ?themes=a,b,c ;
 *   l'empreinte, tirée de la liste, sert à se retrouver entre joueurs du même mélange pour un duel au hasard).
 * Les questions d'une partie mélangée gardent leur thème d'origine (topic). Les pages de réglage /quizz/categorie
 * et /quizz/custom réservent aussi leur adresse.
 */

export const ALL_TOPICS_ID = "tout";
export const CATEGORY_MIX_PREFIX = "categorie-";
export const CUSTOM_MIX_PREFIX = "mix-";

// Noms des catégories (les mêmes que QUIZZ_CATEGORIES sur le site : un test du site le vérifie)
export const CATEGORY_LABELS: Record<ThemeCategory, string> = {
    "cinema": "Cinéma",
    "series": "Séries",
    "jeux-video": "Jeux vidéo",
    "livres": "Livres",
    "anime": "Animés et mangas",
    "musique": "Musique",
    "sport": "Sport",
    "internet": "Internet",
    "culture": "Culture générale",
};

export type MixKind = { kind: "all" } | { kind: "category"; category: ThemeCategory } | { kind: "custom" };

const CUSTOM_ID = /^mix-[a-z0-9]{1,13}$/;

// Sorte de mélange d'un identifiant, ou null si ce n'est pas un mélange
export function mixKind(id: string): MixKind | null {
    if (id === ALL_TOPICS_ID) return {kind: "all"};
    if (id.startsWith(CATEGORY_MIX_PREFIX)) {
        const category = id.slice(CATEGORY_MIX_PREFIX.length);
        return (THEME_CATEGORIES as readonly string[]).includes(category) ? {kind: "category", category: category as ThemeCategory} : null;
    }
    return CUSTOM_ID.test(id) ? {kind: "custom"} : null;
}

export function mixName(mix: MixKind): string {
    if (mix.kind === "all") return "Tous les thèmes";
    return mix.kind === "category" ? `${CATEGORY_LABELS[mix.category]} : tous les thèmes` : "Partie custom";
}

// Adresse d'une partie custom : la même pour la même liste de thèmes, dans n'importe quel ordre (empreinte FNV-1a)
export function customMixId(themeIds: string[]): string {
    const key = [...new Set(themeIds)].sort().join(",");
    let hash = 0x811c9dc5;
    for (let i = 0; i < key.length; i++) {
        hash ^= key.charCodeAt(i);
        hash = Math.imul(hash, 0x01000193) >>> 0;
    }
    return `${CUSTOM_MIX_PREFIX}${hash.toString(36)}`;
}

// Adresse réservée aux mélanges : interdite aux thèmes créés par les joueurs
export const isMixSlug = (slug: string) =>
    slug === ALL_TOPICS_ID || slug === "mix" || slug === "categorie" || slug === "custom" || slug.startsWith(CATEGORY_MIX_PREFIX) || slug.startsWith(CUSTOM_MIX_PREFIX);
