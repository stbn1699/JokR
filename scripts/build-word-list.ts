import {readFileSync, writeFileSync} from "node:fs";
import {fileURLToPath} from "node:url";
import {normalizeWord} from "../backend/src/utils/normalizeWord.js";

/*
 * Génère backend/src/utils/wordData.ts à partir de Lexique 4.10 (https://www.lexique.org, CC BY-SA 4.0).
 *
 *   tsx scripts/build-word-list.ts <chemin vers Lexique4.1.tsv>
 *
 * - mots acceptés : toutes les formes (pluriels, conjugaisons) de 4 à 6 lettres assez connues
 * - solutions : mots de base courants (pas de conjugaison, de pluriel ni de mot grossier), du plus au moins fréquent
 *
 * wordData.ts est une œuvre dérivée de Lexique : il reste sous CC BY-SA 4.0, avec le crédit en tête de fichier.
 */

const LENGTHS = [4, 5, 6] as const;

// Fréquence minimale (occurrences par million) et part de gens qui connaissent le mot, quand Lexique la mesure
const ACCEPTED_MIN_FREQ = 0.02;
// Mots assez courants pour servir d'étapes au chemin de référence de l'Échelle
const LADDER_MIN_FREQ = 1;
const SOLUTION_MIN_FREQ = 2;
const SOLUTION_MIN_PREVALENCE = 88; // en %
const SOLUTION_CATEGORIES = new Set(["NOM", "ADJ", "VER", "ADV"]);
const VALID_CATEGORIES = new Set(["NOM", "ADJ", "VER", "ADV", "PRE", "CON", "PRO", "ART", "AUX", "ONO"]);

// Jamais proposés comme mot à trouver (ils restent acceptés si un joueur les tape)
const EXCLUDED = new Set(`
anus bander baise baiser bâtard bite bordel bougnoule branler chatte chier connard conne couille crever cul
enculé enculer foutre fion gouine merde nazi nazie nègre négro nichon niquer pédé pénis putain pute salaud salope
sexe suicide tapette tuer vagin viol violer violée youpin zizi zob
pour avec très plus même tout tant déjà lors vers près sauf rien delà celà insu idem bien ouais alors aussi comme moins
assez avant ainsi après enfin voire guère jadis sitôt parce jamais encore depuis plutôt autant dessus devant envers
certes tantôt exprès autour good eyes girl baby lady team room pink rain pass shot like deal finn okay sexy homo pine
beuh naze meuf came rand taré juif sida mama ados lacs hard cools black night party speed dance strip sweat porno
sucer garce péter media doris louis coran arabe gland orgie abdos sieur plaza swing cieux vieil chili gueule pisser
sperme chiant fessée capote string gerber crétin débile abruti ordure utérus foetus herpès tumeur cancer chimio
sexuel hétéro pawnee please street spring mister donuts latino yankee indien coréen suisse piaule gratos illico
traine gigolo bourre fumier
`.trim().split(/\s+/));

const col = {word: 0, lemma: 3, category: 4, verbInfo: 8, rowFreq: 9, freq: 10, isLemma: 13, prevalence: 32};

function build(tsv: string) {
    const accepted = new Map<number, Set<string>>(LENGTHS.map(n => [n, new Set<string>()]));
    const ladder = new Map<number, Set<string>>(LENGTHS.map(n => [n, new Set<string>()]));
    // clé normalisée → forme écrite la plus fréquente
    const solutions = new Map<number, Map<string, { word: string; freq: number }>>(LENGTHS.map(n => [n, new Map()]));
    const lines = tsv.split("\n").slice(1);

    // Fréquence de chaque mot comme verbe conjugué : « imposé » ou « faites » ne sont pas des mots de base
    const conjugated = new Map<string, number>();
    for (const line of lines) {
        const cols = line.split("\t");
        if ((cols[col.category] === "VER" || cols[col.category] === "AUX") && !(cols[col.verbInfo] ?? "").includes("inf")) {
            const word = cols[col.word] ?? "";
            conjugated.set(word, Math.max(conjugated.get(word) ?? 0, Number(cols[col.rowFreq]) || 0));
        }
    }

    for (const line of lines) {
        const cols = line.split("\t");
        const word = cols[col.word] ?? "";
        const category = cols[col.category] ?? "";
        if (!VALID_CATEGORIES.has(category) || !/^[a-zàâäçéèêëîïôöùûüÿœæ]+$/.test(word)) continue;

        const key = normalizeWord(word);
        if (!(LENGTHS as readonly number[]).includes(key.length)) continue;
        const freq = Number(cols[col.freq]) || 0;
        if (freq < ACCEPTED_MIN_FREQ) continue;
        accepted.get(key.length)!.add(key);
        if (freq >= LADDER_MIN_FREQ) ladder.get(key.length)!.add(key);

        const prevalence = Number(cols[col.prevalence]);
        const known = !cols[col.prevalence] || !Number.isFinite(prevalence) || prevalence >= SOLUTION_MIN_PREVALENCE;
        const isBaseForm = word === cols[col.lemma] && cols[col.isLemma] === "1";
        const isInfinitive = category !== "VER" || (cols[col.verbInfo] ?? "").includes("inf");
        if (!SOLUTION_CATEGORIES.has(category) || !isBaseForm || !isInfinitive || !known) continue;
        // fréquence du mot dans CETTE catégorie (« pour » est très fréquent, mais pas comme nom)
        const rowFreq = Number(cols[col.rowFreq]) || 0;
        if (rowFreq < SOLUTION_MIN_FREQ || EXCLUDED.has(word)) continue;
        if (category !== "VER" && (conjugated.get(word) ?? 0) >= rowFreq) continue;

        const list = solutions.get(key.length)!;
        const current = list.get(key);
        if (!current || rowFreq > current.freq) list.set(key, {word, freq: rowFreq});
    }
    return {accepted, ladder, solutions};
}

const input = process.argv[2];
if (!input) throw new Error("Chemin de Lexique4.1.tsv manquant");
const {accepted, ladder, solutions} = build(readFileSync(input, "utf8"));

const entries = (build: (n: number) => string) => LENGTHS.map(n => `    ${n}: "${build(n)}",`).join("\n");
const sortedSolutions = (n: number) => [...solutions.get(n)!.values()].sort((a, b) => b.freq - a.freq).map(s => s.word);

const output = `// Fichier généré par scripts/build-word-list.ts : ne pas modifier à la main.
// Dérivé de Lexique 4.10, B. New, C. Pallier et al. (https://www.lexique.org), sous licence CC BY-SA 4.0
// (https://creativecommons.org/licenses/by-sa/4.0/). Modifications : filtrage et normalisation des mots.

// Mots acceptés, sans accents, en majuscules
export const ACCEPTED_WORDS: Record<4 | 5 | 6, string> = {
${entries(n => [...accepted.get(n)!].sort().join(" "))}
};

// Mots courants (sans accents) : étapes du chemin de référence de l'Échelle
export const LADDER_WORDS: Record<4 | 5 | 6, string> = {
${entries(n => [...ladder.get(n)!].sort().join(" "))}
};

// Mots à trouver, avec leur orthographe, du plus au moins fréquent
export const SOLUTION_WORDS: Record<4 | 5 | 6, string> = {
${entries(n => sortedSolutions(n).join(" "))}
};
`;
writeFileSync(fileURLToPath(new URL("../backend/src/utils/wordData.ts", import.meta.url)), output);

for (const n of LENGTHS) {
    const list = sortedSolutions(n);
    console.log(`${n} lettres : ${accepted.get(n)!.size} acceptés, ${list.length} solutions`);
    if (process.argv.includes("--list")) console.log(list.join(" "));
}
console.log(`${(output.length / 1024).toFixed(0)} Ko`);

