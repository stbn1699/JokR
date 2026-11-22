import {readFileSync, writeFileSync} from "node:fs";
import {fileURLToPath} from "node:url";
import {isMainThread, parentPort, Worker, workerData} from "node:worker_threads";

/*
 * Génère la banque de grilles denses de Mots à caser (backend/src/utils/gridBankData.ts) à partir de Lexique 4.10
 * (https://www.lexique.org, CC BY-SA 4.0). Le fichier produit reste sous cette licence.
 *
 *   node scripts/build-word-grids.mjs <Lexique4.1.tsv> <secondes> <grilles par taille> [fichier de sortie]
 *
 * Chaque grille : peu de cases noires, mots tous différents, une seule façon de caser la liste sans aide.
 */

// Part de cases noires : la plus faible qui permet encore de remplir la grille avec des mots connus
const SIZES = [
    {size: 13, maxRun: 9, ratio: 0.15},
    {size: 15, maxRun: 9, ratio: 0.16},
    {size: 17, maxRun: 9, ratio: 0.16},
    {size: 20, maxRun: 9, ratio: 0.17},
];
const THREADS_PER_SIZE = 4;
const NODE_LIMIT = 500;
const MAX_LENGTH = 12;

const TWO_LETTERS = "AH AI AN AS AU CA CE DE DO DU EH EN ES ET EU FA HA IL IF JE LA LE LU MA ME MI MU NE NI NU OH ON OR OS OU PI PU RE RI RU SA SE SI SU TA TE TU UN US VA VU".split(" ");
const BAD = /porn|sexu|sexe|mastur|pédo|nazi|encul|emmerd|merd|salop|putain|prostit|suicid|génocid|bordel|branl|orgasm|éjacul|sodom|homosex|cancer|tumeur|handicap|mongol|sadomaso|chimio|antisémit|spermato|mutilat|strangul|extermin|euthanas|terroris|nègre|négro|pédé|connard|connasse|couill|chatte|chier|foutre|niqu|pute|gouine|youpin|bougnoul|séropos|^bite|^cul$|^culs$|^con$|^cons$|^conne|^viol(?!on|et|en)|^zob|^sida/;
const NOT_WORDS = new Set("gay hmm mme ais ben fee new man for won out off boy kat rex max svp stp etc hot big bad hit han del run fun tex min gus nan rob cal tit sal not sir can gun set ace ave hic let dot mac kid bip the and you are but was his her ohé ouf".split(" "));

const normalize = word => word.replace(/œ/g, "oe").replace(/æ/g, "ae").normalize("NFD").replace(/[̀-ͯ]/g, "").toUpperCase();

// Mots assez connus, formes conjuguées et pluriels compris : ils ne font que remplir la grille et la liste
function loadWords(path) {
    const byLength = new Map();
    for (const line of readFileSync(path, "utf8").split("\n").slice(1)) {
        const c = line.split("\t");
        const word = c[0] ?? "";
        if (!["NOM", "ADJ", "VER", "ADV", "PRE", "CON", "PRO", "AUX"].includes(c[4])) continue;
        if (!/^[a-zàâäçéèêëîïôöùûüÿœæ]+$/.test(word) || BAD.test(word) || BAD.test(c[3] ?? "") || NOT_WORDS.has(word)) continue;
        const key = normalize(word);
        if (key.length < 3 || key.length > MAX_LENGTH || !/^[A-Z]+$/.test(key)) continue;

        const freq = Number(c[10]) || 0;
        const lemmaFreq = Number(c[11]) || 0;
        const prevalence = c[32] ? Number(c[32]) : null;
        const known = prevalence !== null ? prevalence >= 82 && freq >= 0.03 : lemmaFreq >= 3 && freq >= 0.05;
        if (!known) continue;
        if (!byLength.has(key.length)) byLength.set(key.length, new Set());
        byLength.get(key.length).add(key);
    }
    byLength.set(2, new Set(TWO_LETTERS));
    return byLength;
}

const random = n => Math.floor(Math.random() * n);
const popcount = x => {
    x -= (x >>> 1) & 0x55555555;
    x = (x & 0x33333333) + ((x >>> 2) & 0x33333333);
    return (((x + (x >>> 4)) & 0x0f0f0f0f) * 0x01010101) >>> 24;
};
const countBits = bits => {
    let total = 0;
    for (let i = 0; i < bits.length; i++) total += popcount(bits[i]);
    return total;
};

function runsOf(black, size) {
    const out = [];
    const scan = at => {
        for (let line = 0; line < size; line++) {
            let run = [];
            for (let position = 0; position <= size; position++) {
                const cell = position < size ? at(line, position) : -1;
                if (cell >= 0 && !black[cell]) run.push(cell);
                else {
                    if (run.length) out.push(run);
                    run = [];
                }
            }
        }
    };
    scan((row, col) => row * size + col);
    scan((col, row) => row * size + col);
    return out;
}

function isConnected(black, size) {
    const total = size * size;
    const start = black.indexOf(0);
    const seen = new Uint8Array(total);
    const stack = [start];
    seen[start] = 1;
    let reached = 0;
    while (stack.length) {
        const cell = stack.pop();
        reached++;
        const row = Math.floor(cell / size), col = cell % size;
        for (const next of [col > 0 ? cell - 1 : -1, col < size - 1 ? cell + 1 : -1, row > 0 ? cell - size : -1, row < size - 1 ? cell + size : -1]) {
            if (next >= 0 && !black[next] && !seen[next]) {
                seen[next] = 1;
                stack.push(next);
            }
        }
    }
    return reached === total - black.reduce((a, b) => a + b, 0);
}

// Quelques cases noires, jamais côte à côte ; chaque lettre appartient à au moins un mot
function makePattern(size, maxRun, ratio) {
    const black = new Uint8Array(size * size);
    const target = Math.round(size * size * ratio);
    const allowed = cell => {
        if (black[cell]) return false;
        const row = Math.floor(cell / size), col = cell % size;
        if ((col > 0 && black[cell - 1]) || (col < size - 1 && black[cell + 1]) || (row > 0 && black[cell - size]) || (row < size - 1 && black[cell + size])) return false;
        black[cell] = 1;
        const inWord = new Uint8Array(size * size);
        for (const run of runsOf(black, size)) if (run.length >= 2) run.forEach(x => { inWord[x] = 1; });
        let ok = true;
        for (let x = 0; x < black.length && ok; x++) if (!black[x] && !inWord[x]) ok = false;
        black[cell] = 0;
        return ok;
    };
    let placed = 0;
    for (let guard = 0; guard < size * size * 12; guard++) {
        const all = runsOf(black, size);
        const long = all.filter(run => run.length > maxRun);
        if (!long.length && placed >= target) break;
        const pool = long.length ? long[random(long.length)] : all[random(all.length)];
        const cell = pool[random(pool.length)];
        if (allowed(cell)) {
            black[cell] = 1;
            placed++;
        }
    }
    // Couper les longues lignes peut demander quelques noires de plus : jamais au-delà de 18 %
    if (placed < target || placed > Math.ceil(size * size * 0.18)) return null;
    if (runsOf(black, size).some(run => run.length > maxRun) || !isConnected(black, size)) return null;
    return black;
}

function fillPattern(black, size, dictionary) {
    const slots = runsOf(black, size).filter(run => run.length >= 2);
    if (slots.some(slot => !dictionary.has(slot.length))) return null;
    const crossing = new Map();
    slots.forEach((slot, k) => slot.forEach((cell, p) => {
        if (!crossing.has(cell)) crossing.set(cell, []);
        crossing.get(cell).push([k, p]);
    }));
    let nodes = 0;

    const propagate = (domains, letters, start) => {
        const queue = [...start];
        const queued = new Uint8Array(slots.length);
        queue.forEach(k => { queued[k] = 1; });
        while (queue.length) {
            const k = queue.pop();
            queued[k] = 0;
            const slot = slots[k], entry = dictionary.get(slot.length), domain = domains[k];
            for (let p = 0; p < slot.length; p++) {
                let possible = 0;
                for (let l = 0; l < 26; l++) {
                    if (!(letters[slot[p]] & (1 << l))) continue;
                    const mask = entry.masks[p][l];
                    for (let i = 0; i < entry.blocks; i++) {
                        if (domain[i] & mask[i]) {
                            possible |= 1 << l;
                            break;
                        }
                    }
                }
                if (!possible) return false;
                if (possible === letters[slot[p]]) continue;
                letters[slot[p]] = possible;
                for (const [other, q] of crossing.get(slot[p])) {
                    if (other === k) continue;
                    const otherEntry = dictionary.get(slots[other].length), otherDomain = domains[other];
                    const keep = new Uint32Array(otherEntry.blocks);
                    for (let l = 0; l < 26; l++) {
                        if (!(possible & (1 << l))) continue;
                        const mask = otherEntry.masks[q][l];
                        for (let i = 0; i < otherEntry.blocks; i++) keep[i] |= mask[i];
                    }
                    let any = 0;
                    for (let i = 0; i < otherEntry.blocks; i++) {
                        otherDomain[i] &= keep[i];
                        any |= otherDomain[i];
                    }
                    if (!any) return false;
                    if (!queued[other]) {
                        queued[other] = 1;
                        queue.push(other);
                    }
                }
            }
        }
        return true;
    };

    const search = (domains, letters, done) => {
        if (++nodes > NODE_LIMIT) return null;
        let best = -1, fewest = Infinity;
        for (let k = 0; k < slots.length; k++) {
            if (done[k]) continue;
            const n = countBits(domains[k]);
            if (n < fewest) {
                best = k;
                fewest = n;
            }
        }
        if (best < 0) return letters;

        const entry = dictionary.get(slots[best].length), options = [];
        for (let i = 0; i < entry.blocks; i++) {
            let bits = domains[best][i];
            while (bits) {
                options.push(i * 32 + 31 - Math.clz32(bits & -bits));
                bits &= bits - 1;
            }
        }
        for (let i = options.length - 1; i > 0; i--) {
            const j = random(i + 1);
            [options[i], options[j]] = [options[j], options[i]];
        }
        for (const word of options.slice(0, 5)) {
            const nextDomains = domains.map(d => d.slice()), nextLetters = letters.slice(), nextDone = done.slice();
            nextDomains[best].fill(0);
            nextDomains[best][word >>> 5] = 1 << (word & 31);
            nextDone[best] = 1;
            // chaque mot n'est utilisé qu'une fois
            slots.forEach((slot, other) => {
                if (other !== best && slot.length === slots[best].length) nextDomains[other][word >>> 5] &= ~(1 << (word & 31));
            });
            if (propagate(nextDomains, nextLetters, [best])) {
                const found = search(nextDomains, nextLetters, nextDone);
                if (found) return found;
                if (nodes > NODE_LIMIT) return null;
            }
        }
        return null;
    };

    const domains = slots.map(slot => {
        const entry = dictionary.get(slot.length);
        const bits = new Uint32Array(entry.blocks).fill(0xffffffff);
        const extra = entry.words.length % 32;
        if (extra) bits[entry.blocks - 1] = (2 ** extra - 1) >>> 0;
        return bits;
    });
    const letters = new Int32Array(size * size).fill((1 << 26) - 1);
    if (!propagate(domains, letters, slots.map((_, k) => k))) return null;
    const result = search(domains, letters, new Uint8Array(slots.length));
    if (!result) return null;
    return Array.from({length: size * size}, (_, i) => (black[i] ? "#" : String.fromCharCode(65 + 31 - Math.clz32(result[i])))).join("");
}

// Une seule façon de caser la liste dans la grille vide ?
function isUnique(solution, size) {
    const black = Uint8Array.from(solution, c => (c === "#" ? 1 : 0));
    const slots = runsOf(black, size).filter(run => run.length >= 2);
    const words = slots.map(slot => slot.map(c => solution[c]).join(""));
    if (new Set(words).size !== words.length) return false;
    const current = Array.from(solution, c => (c === "#" ? "#" : "."));
    const left = new Set(words);
    const open = new Set(slots.keys());
    let solutions = 0, steps = 0;

    const fits = (slot, word) => word.length === slot.length && slot.every((c, i) => current[c] === "." || current[c] === word[i]);
    const search = () => {
        if (++steps > 40_000) return false;
        if (open.size === 0) return ++solutions < 2;
        let best = -1, options = null;
        for (const k of open) {
            const list = [...left].filter(word => fits(slots[k], word));
            if (list.length === 0) return true;
            if (!options || list.length < options.length) {
                best = k;
                options = list;
                if (list.length === 1) break;
            }
        }
        open.delete(best);
        for (const word of options) {
            const written = [];
            slots[best].forEach((c, i) => {
                if (current[c] === ".") {
                    current[c] = word[i];
                    written.push(c);
                }
            });
            left.delete(word);
            const go = search();
            left.add(word);
            written.forEach(c => { current[c] = "."; });
            if (!go) break;
        }
        open.add(best);
        return steps <= 40_000 && solutions < 2;
    };
    search();
    return steps <= 40_000 && solutions === 1;
}

if (!isMainThread) {
    const {tsv, size, maxRun, ratio, seconds, wanted} = workerData;
    const dictionary = new Map();
    for (const [length, set] of loadWords(tsv)) {
        const words = [...set];
        const blocks = Math.ceil(words.length / 32);
        const masks = Array.from({length}, () => Array.from({length: 26}, () => new Uint32Array(blocks)));
        words.forEach((word, i) => {
            for (let p = 0; p < length; p++) masks[p][word.charCodeAt(p) - 65][i >>> 5] |= 1 << (i & 31);
        });
        dictionary.set(length, {words, blocks, masks});
    }
    const grids = [];
    let filled = 0;
    const end = Date.now() + seconds * 1000;
    while (Date.now() < end && grids.length < wanted) {
        const black = makePattern(size, maxRun, ratio);
        if (!black) continue;
        const grid = fillPattern(black, size, dictionary);
        if (!grid) continue;
        filled++;
        if (isUnique(grid, size)) grids.push(grid);
    }
    parentPort.postMessage({size, grids, filled});
} else {
    const [tsv, seconds = "60", wanted = "50", output] = process.argv.slice(2);
    if (!tsv) throw new Error("Chemin de Lexique4.1.tsv manquant");
    const target = output ?? fileURLToPath(new URL("../backend/src/utils/gridBankData.ts", import.meta.url));
    const perThread = Math.ceil(Number(wanted) / THREADS_PER_SIZE);
    const parts = await Promise.all(SIZES.flatMap(({size, maxRun, ratio}) => Array.from({length: THREADS_PER_SIZE}, () => new Promise((resolve, reject) => {
        const worker = new Worker(new URL(import.meta.url), {workerData: {tsv, size, maxRun, ratio, seconds: Number(seconds), wanted: perThread}});
        worker.once("message", resolve);
        worker.once("error", reject);
    }))));
    const results = SIZES.map(({size}) => {
        const mine = parts.filter(part => part.size === size);
        return {size, grids: [...new Set(mine.flatMap(part => part.grids))], filled: mine.reduce((total, part) => total + part.filled, 0)};
    });
    const body = results.map(({size, grids}) => `    ${size}: "${grids.join(" ")}",`).join("\n");
    writeFileSync(target, `// Fichier généré par scripts/build-word-grids.mjs : ne pas modifier à la main.
// Dérivé de Lexique 4.10, B. New, C. Pallier et al. (https://www.lexique.org), sous licence CC BY-SA 4.0
// (https://creativecommons.org/licenses/by-sa/4.0/). Modifications : sélection de mots et construction de grilles.

// Grilles remplies, ligne par ligne (« # » = case noire), séparées par des espaces
export const GRID_BANK: Record<number, string> = {
${body}
};
`);
    for (const {size, grids, filled} of results) {
        console.log(`${size}×${size} : ${grids.length} grilles uniques sur ${filled} remplies`);
        if (grids[0]) for (let r = 0; r < size; r++) console.log("  " + grids[0].slice(r * size, r * size + size).replace(/#/g, "·"));
    }
}
