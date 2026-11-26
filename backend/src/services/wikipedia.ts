import {parseWikiUrl, summaryParagraphs} from "../utils/quizzThemes.js";

/*
 * Lecture d'un article de Wikipédia pour la fiche d'un thème du Quizz créé par un joueur : titre, courte description
 * et introduction (texte brut). Seules les adresses https://<langue>.wikipedia.org/wiki/… sont acceptées.
 * Le texte de Wikipédia est sous licence CC BY-SA : la fiche affiche toujours la source et la licence.
 */

export type WikiArticle = { url: string; title: string; description: string; summary: string[] };

type ApiPage = { title?: string; missing?: boolean; extract?: string; description?: string; fullurl?: string };

export async function readWikiArticle(url: string): Promise<WikiArticle | null> {
    const ref = parseWikiUrl(url);
    if (!ref) return null;
    const params = new URLSearchParams({
        action: "query", format: "json", formatversion: "2", redirects: "1", titles: ref.title,
        prop: "extracts|description|info", exintro: "1", explaintext: "1", inprop: "url",
    });
    let page: ApiPage | undefined;
    try {
        const res = await fetch(`https://${ref.lang}.wikipedia.org/w/api.php?${params}`, {
            headers: {"User-Agent": "JokR-quizz/1.0 (fiche de thème)", Accept: "application/json"},
            signal: AbortSignal.timeout(6000),
        });
        if (!res.ok) return null;
        const json = await res.json() as { query?: { pages?: ApiPage[] } };
        page = json.query?.pages?.[0];
    } catch {
        return null;
    }
    if (!page || page.missing || !page.title || !page.extract?.trim()) return null;
    return {
        url: page.fullurl ?? url,
        title: page.title,
        description: page.description ?? "",
        summary: summaryParagraphs(page.extract),
    };
}
