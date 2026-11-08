import {readdirSync, statSync} from "node:fs";
import {join, resolve} from "node:path";
import {fileURLToPath} from "node:url";

/*
 * Jeux de jetons de la boutique, lus dans les dossiers d'images : public/chips/<jeu>/<valeur>.svg (ou .png),
 * une image par valeur (10, 20, 50, 100, 200, 500), la valeur écrite dessus. Un jeu s'achète en entier.
 * Un dossier déposé apparaît dans la boutique sans toucher au code (relu au plus toutes les minutes),
 * à condition d'avoir les six valeurs. Le jeu « default » est offert à tout le monde.
 */

export const CHIP_VALUES = [10, 20, 50, 100, 200, 500] as const;
export const DEFAULT_CHIP_SET = "chips:default";

// Nom et prix de chaque jeu (un jeu inconnu prend son nom de dossier et le prix par défaut)
const SETS: Record<string, { name: string; price: number; order: number }> = {
    default: {name: "Classiques", price: 0, order: 1},
    premium: {name: "Premium", price: 100, order: 2},
};
const DEFAULT_PRICE = 100;

export type ChipSet = { id: string; set: string; name: string; price: number; chips: Record<string, string> };

// Dossier des jetons : à côté du site compilé (image Docker, STATIC_DIR), sinon le dossier public du projet
const chipsDir = () => process.env.STATIC_DIR
    ? join(process.env.STATIC_DIR, "chips")
    : resolve(fileURLToPath(new URL("../../../public/chips", import.meta.url)));

const RELOAD_MS = 60_000;
let cache: { at: number; sets: ChipSet[] } | null = null;

export function chipSets(): ChipSet[] {
    if (cache && Date.now() - cache.at < RELOAD_MS) return cache.sets;
    const dir = chipsDir();
    let sets: ChipSet[] = [];
    try {
        sets = readdirSync(dir)
            .filter(set => statSync(join(dir, set)).isDirectory())
            .map(set => {
                const files = readdirSync(join(dir, set));
                const chips: Record<string, string> = {};
                for (const value of CHIP_VALUES) {
                    const file = files.find(f => f === `${value}.svg` || f === `${value}.png`);
                    if (file) chips[value] = `/chips/${set}/${file}`;
                }
                const info = SETS[set] ?? {name: set.replace(/_/g, " ").replace(/^./, c => c.toUpperCase()), price: DEFAULT_PRICE, order: 99};
                return {id: `chips:${set}`, set, name: info.name, price: info.price, chips};
            })
            // un jeu incomplet n'est pas proposé
            .filter(s => Object.keys(s.chips).length === CHIP_VALUES.length)
            .sort((a, b) => (SETS[a.set]?.order ?? 99) - (SETS[b.set]?.order ?? 99) || a.set.localeCompare(b.set));
    } catch {
        // dossier absent : seulement les jetons classiques
    }
    cache = {at: Date.now(), sets};
    return sets;
}

export const chipSet = (id: unknown): ChipSet | undefined =>
    typeof id === "string" ? chipSets().find(s => s.id === id) : undefined;
