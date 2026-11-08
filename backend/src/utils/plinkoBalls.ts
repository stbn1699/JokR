import {readdirSync, statSync} from "node:fs";
import {join, resolve} from "node:path";
import {fileURLToPath} from "node:url";

/*
 * Billes de Plinko de la boutique, lues dans les dossiers d'images : public/plinko_ball/<série>/<n>_<couleur>.svg
 * (ex. rainbow/3_default.svg). Une image déposée dans un dossier apparaît dans la boutique sans toucher au code
 * (relu au plus toutes les minutes). Chaque série est un objet de la boutique, chaque couleur s'achète à part.
 * La bille par défaut (rainbow/3_default) est offerte à tout le monde.
 */

export const DEFAULT_BALL = "ball:rainbow/3_default";

// Nom et prix de chaque série (une série inconnue prend son nom de dossier et le prix par défaut)
const SETS: Record<string, { name: string; price: number; order: number }> = {
    rainbow: {name: "Arc-en-ciel", price: 10, order: 1},
    rainbow_pastel: {name: "Pastel", price: 10, order: 2},
    LGBT: {name: "des fiertés", price: 1, order: 3},
};
const DEFAULT_PRICE = 10;

// Noms des couleurs (d'après le nom du fichier, sans son numéro)
const COLORS: Record<string, string> = {
    red: "Rouge", orange: "Orange", default: "Classique", yellow: "Jaune", lime: "Citron vert", green: "Vert",
    light_blue: "Bleu clair", blue: "Bleu", deep_blue: "Bleu profond", dark_blue: "Bleu nuit", purple: "Violet",
    pink: "Rose", white: "Blanc", black: "Noir", brown: "Marron", grey: "Gris", gray: "Gris", gold: "Or", silver: "Argent",
    // drapeaux des fiertés (série LGBT)
    agender: "Agenre", androgyne: "Androgyne", aromantic: "Aromantique", asexual: "Asexuel·le", bisexual: "Bisexuel·le",
    demiboy: "Demiboy", demigirl: "Demigirl", genderfluid: "Genderfluid", intersex: "Intersexe", lesbian: "Lesbienne",
    omnisexual: "Omnisexuel·le", pansexual: "Pansexuel·le", pocketgender: "Pocketgender", polysexual: "Polysexuel·le",
    queergender: "Queergender", trans: "Trans", gay: "Gay", nonbinary: "Non-binaire", non_binary: "Non-binaire",
    pride: "Fierté", progress: "Progress", queer: "Queer",
};

export type PlinkoBall = { id: string; set: string; file: string; name: string; price: number };
export type PlinkoBallSet = { set: string; name: string; price: number; balls: PlinkoBall[] };

// Dossier des billes : à côté du site compilé (image Docker, STATIC_DIR), sinon le dossier public du projet
// (développement). Lu directement dans l'environnement : ce fichier ne dépend pas de la configuration du serveur.
const ballsDir = () => process.env.STATIC_DIR
    ? join(process.env.STATIC_DIR, "plinko_ball")
    : resolve(fileURLToPath(new URL("../../../public/plinko_ball", import.meta.url)));

const colorName = (stem: string) => {
    const key = stem.replace(/^\d+_/, "");
    return COLORS[key] ?? key.replace(/_/g, " ").replace(/^./, c => c.toUpperCase());
};

const RELOAD_MS = 60_000;
let cache: { at: number; sets: PlinkoBallSet[] } | null = null;

export function plinkoBallSets(): PlinkoBallSet[] {
    if (cache && Date.now() - cache.at < RELOAD_MS) return cache.sets;
    const dir = ballsDir();
    let sets: PlinkoBallSet[] = [];
    try {
        sets = readdirSync(dir)
            .filter(set => statSync(join(dir, set)).isDirectory())
            .map(set => {
                const info = SETS[set] ?? {name: set.replace(/_/g, " "), price: DEFAULT_PRICE, order: 99};
                const balls = readdirSync(join(dir, set))
                    .filter(f => f.endsWith(".svg") || f.endsWith(".png"))
                    // dans l'ordre des numéros (1_red, 2_orange… 10_purple)
                    .sort((a, b) => (parseInt(a, 10) || 0) - (parseInt(b, 10) || 0) || a.localeCompare(b))
                    .map(file => {
                        const stem = file.replace(/\.(svg|png)$/, "");
                        const id = `ball:${set}/${stem}`;
                        return {id, set, file: `/plinko_ball/${set}/${file}`, name: colorName(stem), price: id === DEFAULT_BALL ? 0 : info.price};
                    });
                return {set, name: info.name, price: info.price, balls};
            })
            .filter(s => s.balls.length > 0)
            .sort((a, b) => (SETS[a.set]?.order ?? 99) - (SETS[b.set]?.order ?? 99) || a.set.localeCompare(b.set));
    } catch {
        // dossier absent : pas de billes à vendre (la bille par défaut reste utilisable)
    }
    cache = {at: Date.now(), sets};
    return sets;
}

export const plinkoBall = (id: unknown): PlinkoBall | undefined =>
    typeof id === "string" ? plinkoBallSets().flatMap(s => s.balls).find(b => b.id === id) : undefined;
