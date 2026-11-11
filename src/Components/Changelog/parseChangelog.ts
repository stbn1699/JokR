/*
 * Lecture de CHANGELOG.md pour la page « Nouveautés ».
 * Format attendu (volontairement simple) :
 *   ## 1.0.0 — 1er novembre 2026     → une version (numéro, puis date ou titre après le tiret)
 *   texte                            → paragraphe d'introduction de la version
 *   ### Jeux                         → une rubrique
 *   - Sudoku…                        → un élément de la rubrique
 *   @pseudo                          → dans un texte : lien vers le profil du joueur (idée ou bug remonté)
 * Tout ce qui précède la première version (titre, consignes) est ignoré.
 */

export type ChangelogSection = { title: string; items: string[] };

export type ChangelogVersion = {
    version: string;
    date: string;
    intro: string[];
    sections: ChangelogSection[];
};

// Morceau de texte : texte simple, ou pseudo d'un joueur cité avec @
export type ChangelogPart = { text: string } | { user: string };

// Même caractères qu'un pseudo (lettres de toutes les langues, chiffres, _ . -), sans le point d'une fin de phrase
const MENTION = /@([\p{L}\p{N}\p{M}_.-]*[\p{L}\p{N}\p{M}_])/gu;

// Découpe un texte autour des @pseudo
export function splitMentions(text: string): ChangelogPart[] {
    const parts: ChangelogPart[] = [];
    let last = 0;
    for (const match of text.matchAll(MENTION)) {
        if (match.index > last) parts.push({text: text.slice(last, match.index)});
        parts.push({user: match[1]});
        last = match.index + match[0].length;
    }
    if (last < text.length) parts.push({text: text.slice(last)});
    return parts;
}

export function parseChangelog(markdown: string): ChangelogVersion[] {
    const versions: ChangelogVersion[] = [];
    let current: ChangelogVersion | null = null;
    let section: ChangelogSection | null = null;

    for (const raw of markdown.split(/\r?\n/)) {
        const line = raw.trim();
        if (line.startsWith("## ")) {
            const [version = "", ...rest] = line.slice(3).split(/\s+[—–-]\s+/);
            current = {version: version.trim(), date: rest.join(" — ").trim(), intro: [], sections: []};
            section = null;
            versions.push(current);
        } else if (!current || !line) {
            continue;
        } else if (line.startsWith("### ")) {
            section = {title: line.slice(4).trim(), items: []};
            current.sections.push(section);
        } else if (line.startsWith("- ") || line.startsWith("* ")) {
            if (!section) {
                section = {title: "", items: []};
                current.sections.push(section);
            }
            section.items.push(line.slice(2).trim());
        } else if (section && section.items.length > 0) {
            // Ligne qui continue l'élément précédent
            section.items[section.items.length - 1] += ` ${line}`;
        } else {
            current.intro.push(line);
        }
    }
    return versions;
}
