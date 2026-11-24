/*
 * Pronoms proposés dans les paramètres du profil, par groupes.
 * Le joueur en choisit jusqu'à MAX_PRONOUNS, ou écrit les siens (texte libre, PRONOUNS_MAX caractères au plus).
 * Ce qui est enregistré est le texte affiché : « elle/iel », « she/her, they/them », « tous les pronoms »…
 */

export const PRONOUNS_MAX = 50;
export const MAX_PRONOUNS = 3;

export type PronounGroup = { id: string; label: string; items: string[] };

export const PRONOUN_GROUPS: PronounGroup[] = [
    {
        id: "fr",
        label: "Français",
        items: ["il", "elle", "iel", "ielle", "ille", "yel", "ul", "al", "ol", "æl", "ael", "el", "im", "ellui"],
    },
    {
        id: "en",
        label: "English",
        items: ["he/him", "she/her", "they/them", "it/its", "xe/xem", "ze/zir", "ze/hir", "fae/faer", "ey/em", "e/em", "ve/ver", "per/per", "co/cos", "thon/thon"],
    },
    {
        id: "other",
        label: "Autres",
        items: [
            "tous les pronoms", "pronoms variables", "pas de pronom (mon pseudo)", "demandez-moi", "en questionnement",
            "any pronouns", "no pronouns (use my name)", "ask me",
        ],
    },
];

// Pronoms d'un seul mot (français) : combinés avec « / » (elle/iel) ; sinon avec « , » (she/her, they/them)
const SINGLE_WORD = new Set(PRONOUN_GROUPS[0].items);
const ALL = new Set(PRONOUN_GROUPS.flatMap(g => g.items));

export function joinPronouns(items: string[]): string {
    return items.join(items.every(p => SINGLE_WORD.has(p)) ? "/" : ", ");
}

// Pronoms de la liste qui forment ce texte, ou null s'il a été écrit à la main
export function splitPronouns(text: string): string[] | null {
    if (!text) return [];
    for (const sep of [", ", "/"]) {
        const parts = text.split(sep);
        if (parts.length <= MAX_PRONOUNS && parts.every(p => ALL.has(p)) && joinPronouns(parts) === text) return parts;
    }
    return null;
}
