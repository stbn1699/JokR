import {readdirSync, statSync} from "node:fs";
import {join, relative, resolve} from "node:path";
import {fileURLToPath} from "node:url";
import {colorName} from "./plinkoBalls.js";

/*
 * Fonds en images de la boutique (drapeaux des fiertés…), lus dans public/backgrounds/<série>/ : une image par fond,
 * rangée directement dans le dossier de la série ou dans un sous-dossier. Relu au plus toutes les minutes :
 * une image déposée apparaît dans la boutique sans toucher au code.
 */

// Nom et prix de chaque série (une série inconnue prend son nom de dossier et le prix par défaut)
const SETS: Record<string, { name: string; price: number; order: number }> = {
    lgbt: {name: "Drapeaux des fiertés", price: 1, order: 1},
};
const DEFAULT_PRICE = 15;

export type ImageBackground = { id: string; set: string; name: string; price: number; file: string };
export type ImageBackgroundSet = { set: string; name: string; price: number; backgrounds: ImageBackground[] };

// Dossier des fonds : à côté du site compilé (image Docker, STATIC_DIR), sinon le dossier public du projet
const publicDir = () => process.env.STATIC_DIR ?? resolve(fileURLToPath(new URL("../../../public", import.meta.url)));

// Images d'un dossier et de ses sous-dossiers : nom (sans extension) → chemin web
function imagesIn(dir: string, root: string): Map<string, string> {
    const found = new Map<string, string>();
    let entries: string[] = [];
    try {
        entries = readdirSync(dir);
    } catch {
        return found;
    }
    for (const entry of entries.sort()) {
        const path = join(dir, entry);
        if (statSync(path).isDirectory()) {
            for (const [name, file] of imagesIn(path, root)) if (!found.has(name)) found.set(name, file);
        } else if (/\.(svg|png|jpe?g|webp)$/i.test(entry)) {
            const name = entry.replace(/\.[^.]+$/, "");
            if (!found.has(name)) found.set(name, "/" + relative(root, path).split(/[\\/]/).join("/"));
        }
    }
    return found;
}

const RELOAD_MS = 60_000;
let cache: { at: number; sets: ImageBackgroundSet[] } | null = null;

export function imageBackgroundSets(): ImageBackgroundSet[] {
    if (cache && Date.now() - cache.at < RELOAD_MS) return cache.sets;
    const root = publicDir();
    const dir = join(root, "backgrounds");
    let sets: ImageBackgroundSet[] = [];
    try {
        sets = readdirSync(dir)
            .filter(set => statSync(join(dir, set)).isDirectory())
            .map(set => {
                const info = SETS[set] ?? {name: set.replace(/_/g, " ").replace(/^./, c => c.toUpperCase()), price: DEFAULT_PRICE, order: 99};
                const images = imagesIn(join(dir, set), root);
                const backgrounds = [...images].sort(([a], [b]) => a.localeCompare(b)).map(([name, file]) => ({
                    id: `bg:${set}/${name}`, set, name: colorName(name), price: info.price, file,
                }));
                return {set, name: info.name, price: info.price, backgrounds};
            })
            .filter(s => s.backgrounds.length > 0)
            .sort((a, b) => (SETS[a.set]?.order ?? 99) - (SETS[b.set]?.order ?? 99) || a.set.localeCompare(b.set));
    } catch {
        // dossier absent : pas de fonds en images
    }
    cache = {at: Date.now(), sets};
    return sets;
}

export const imageBackground = (id: unknown): ImageBackground | undefined =>
    typeof id === "string" ? imageBackgroundSets().flatMap(s => s.backgrounds).find(b => b.id === id) : undefined;
