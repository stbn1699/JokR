/*
 * Génère les niveaux 4 à 1000 du mode Niveaux des jeux ajoutés depuis 3.3 (backend/src/utils/<jeu>LevelData.ts).
 * Les niveaux 1 à 3 sont les leçons du tutoriel (backend/src/utils/gridLessons.ts).
 *
 * Lancement, depuis backend/ (un jeu à la fois, ou plusieurs séparés par des virgules) :
 *   node --import ./node_modules/tsx/dist/esm/index.mjs ../scripts/build-grid-levels.ts COLORIA [secondes par tranche]
 *
 * Chaque jeu est découpé en tranches de difficulté croissante (taille, palier de déduction, aide). Pour chaque tranche,
 * le script tire des grilles au hasard (graine fixe), garde celles que le guide de déduction résout au palier voulu
 * (backend/src/utils/gridLevelGuides.ts, src/Components/Lessons/boucleGuide.ts), les range de la plus douce à la plus
 * dure, puis en prend le nombre voulu, régulièrement espacées. Les tranches tournent en parallèle (une par cœur).
 * Les premières tranches n'utilisent que les techniques du tutoriel (paliers 1 et 2).
 * Ne pas relancer sur un jeu déjà publié : la progression des joueurs est enregistrée par numéro de niveau.
 */
import {writeFileSync} from "node:fs";
import {fileURLToPath} from "node:url";
import {isMainThread, parentPort, Worker, workerData} from "node:worker_threads";
import {cpus} from "node:os";
import {generateColoria} from "../backend/src/utils/coloria.ts";
import {generateTuyaux} from "../backend/src/utils/tuyaux.ts";
import {generatePaturages} from "../backend/src/utils/paturages.ts";
import {generateBoucle, type BouclePuzzle} from "../backend/src/utils/boucle.ts";
import {placeMines} from "../backend/src/utils/demineur.ts";
import {BOUCHON_BANK} from "../backend/src/utils/bouchonBankData.ts";
import {decodeParking} from "../backend/src/utils/bouchon.ts";
import {isAcceptedWord, ladderWords, solutionWords, type WordLength} from "../backend/src/utils/words.ts";
import {ACCEPTED_WORDS} from "../backend/src/utils/wordData.ts";
import {generateMotsMeles, readLine} from "../backend/src/utils/motsMeles.ts";
import {motsACaserGrids, transposeGrid, wordSlots} from "../backend/src/utils/motsACaser.ts";
import {
    coloriaSolves, coloriaTier, demineurTier, liensTier, motsACaserTier, paturagesTier, type Tier, tuyauxTier,
} from "../backend/src/utils/gridLevelGuides.ts";
import {encodeLoop, ZONE_CHARS} from "../backend/src/utils/levelCodes.ts";
import {loopLinks, solveBoucleWithGuide} from "../src/Components/Lessons/boucleGuide.ts";

type Random = (max: number) => number;
type Candidate = { line: string; score: number; key?: string };
type Band = { count: number; make: (random: Random) => Candidate | null };
type Game = { file: string; constant: string; header: string[]; bands: Band[] };

const LEXIQUE = [
    "Dérivé de Lexique 4.10, B. New, C. Pallier et al. (https://www.lexique.org), sous licence CC BY-SA 4.0",
    "(https://creativecommons.org/licenses/by-sa/4.0/). Modifications : sélection de mots et construction de grilles.",
];

function mulberry(seed: number): Random {
    let a = seed >>> 0;
    return (max: number) => {
        a = (a + 0x6d2b79f5) >>> 0;
        let t = a;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return Math.floor((((t ^ (t >>> 14)) >>> 0) / 4294967296) * max);
    };
}

const between = (random: Random, min: number, max: number) => min + random(max - min + 1);
const pick = <T>(random: Random, list: readonly T[]) => list[random(list.length)]!;
const shuffle = <T>(random: Random, list: T[]) => {
    for (let i = list.length - 1; i > 0; i--) {
        const j = random(i + 1);
        [list[i], list[j]] = [list[j]!, list[i]!];
    }
    return list;
};

/* ---------- Coloria : 3 couleurs, juste assez de zones données pour le palier voulu ---------- */

function coloria(zones: [number, number], tiers: Tier[]): Band["make"] {
    return random => {
        const n = between(random, ...zones);
        const base = generateColoria(n, 3, random);
        const top = Math.max(...tiers) as Tier;
        const puzzle = {...base, given: [...base.solution]};
        for (const zone of shuffle(random, Array.from({length: n}, (_, i) => i))) {
            const color = puzzle.given[zone]!;
            puzzle.given[zone] = -1;
            if (!coloriaSolves(puzzle, top)) puzzle.given[zone] = color;
        }
        const tier = coloriaTier(puzzle);
        if (!tier || !tiers.includes(tier)) return null;
        const given = puzzle.given.filter(c => c >= 0).length;
        return {
            line: `${base.width}:${base.regions.map(z => ZONE_CHARS[z]).join("")}:${puzzle.given.map(c => (c < 0 ? "." : c)).join("")}:${base.solution.join("")}`,
            score: tier * 100 + n * 2 - given * 3,
        };
    };
}

/* ---------- Tuyaux ---------- */

function tuyaux(sizes: [number, number], tiers: Tier[]): Band["make"] {
    return random => {
        const size = between(random, ...sizes);
        const puzzle = generateTuyaux(size, 0, random);
        const tier = tuyauxTier(puzzle);
        if (!tier || !tiers.includes(tier)) return null;
        const hex = (list: number[]) => list.map(m => m.toString(16)).join("");
        // la même solution, tournée autrement, reste la même grille
        return {line: `${size}:${hex(puzzle.tiles)}:${hex(puzzle.solution)}`, key: `${size}:${hex(puzzle.solution)}`, score: tier * 100 + size * size};
    };
}

/* ---------- Liens : un long chemin sur toute la grille, coupé avant qu'il ne se touche lui-même ---------- */

const sides = (cell: number, size: number) => {
    const row = Math.floor(cell / size), col = cell % size;
    return [row > 0 ? cell - size : -1, col < size - 1 ? cell + 1 : -1, row < size - 1 ? cell + size : -1, col > 0 ? cell - 1 : -1].filter(n => n >= 0);
};

function fullPath(size: number, random: Random): number[] {
    const total = size * size;
    const path = Array.from({length: total}, (_, i) => {
        const row = Math.floor(i / size), col = i % size;
        return row * size + (row % 2 === 0 ? col : size - 1 - col);
    });
    const position = new Int32Array(total);
    path.forEach((cell, i) => { position[cell] = i; });
    const reverse = (from: number, to: number) => {
        for (let i = from, j = to; i < j; i++, j--) {
            [path[i], path[j]] = [path[j]!, path[i]!];
            position[path[i]!] = i;
            position[path[j]!] = j;
        }
    };
    for (let move = 0; move < total * 20; move++) {
        if (random(2) === 0) {
            const options = sides(path[total - 1]!, size).filter(cell => cell !== path[total - 2]);
            reverse(position[pick(random, options)]! + 1, total - 1);
        } else {
            const options = sides(path[0]!, size).filter(cell => cell !== path[1]);
            reverse(0, position[pick(random, options)]! - 1);
        }
    }
    return path;
}

function liens(sizes: [number, number], maxLength: [number, number], tiers: Tier[]): Band["make"] {
    return random => {
        const size = between(random, ...sizes);
        const longest = between(random, ...maxLength);
        const paths: number[][] = [];
        let current: number[] = [];
        for (const cell of fullPath(size, random)) {
            const touchesItself = current.slice(0, -1).some(c => sides(c, size).includes(cell));
            if (current.length > 0 && (touchesItself || current.length >= longest)) {
                paths.push(current);
                current = [];
            }
            current.push(cell);
        }
        paths.push(current);
        if (paths.some(path => path.length < 3)) return null;
        const pairs = paths.map(path => [path[0]!, path[path.length - 1]!] as [number, number]);
        const tier = liensTier({size, pairs});
        if (!tier || !tiers.includes(tier)) return null;
        shuffle(random, paths);
        return {line: `${size}:${paths.map(path => path.join(".")).join(",")}`, score: tier * 100 + size * 8 - paths.length * 2};
    };
}

/* ---------- Pâturages ---------- */

function paturages(sizes: [number, number], tiers: Tier[]): Band["make"] {
    return random => {
        const size = between(random, ...sizes);
        const puzzle = generatePaturages(size, 0, random);
        const tier = paturagesTier(puzzle);
        if (!tier || !tiers.includes(tier)) return null;
        return {
            line: `${size}:${puzzle.cows.join(",")}:${puzzle.solution.map(s => `${s.row}.${s.col}.${s.side}`).join(",")}`,
            score: tier * 100 + size * size - puzzle.cows.length,
        };
    };
}

/* ---------- Boucle : tous les murs possibles, puis on en retire tant que le guide s'en sort ---------- */

const boucleLevel = (puzzle: BouclePuzzle) => {
    const result = solveBoucleWithGuide(puzzle, loopLinks(puzzle.solution, puzzle.size));
    return result.solved ? (result.rules.includes("trap") ? 2 : 1) : null;
};

function boucle(sizes: [number, number], keep: [number, number], tiers: (1 | 2)[]): Band["make"] {
    return random => {
        const size = between(random, ...sizes);
        const base = generateBoucle(size, size * size, random);
        const top = Math.max(...tiers);
        const walls = shuffle(random, [...base.walls]);
        // part des murs retirables qu'on laisse en place (aide)
        const left = Math.round(walls.length * between(random, ...keep) / 100);
        const kept: typeof walls = [];
        for (let i = 0; i < walls.length; i++) {
            const trial = {...base, walls: [...kept, ...walls.slice(i + 1)]};
            const level = boucleLevel(trial);
            if (level === null || level > top) kept.push(walls[i]!);
        }
        // remet quelques murs retirés, pour adoucir
        const removed = walls.filter(w => !kept.includes(w));
        const final = {...base, walls: [...kept, ...removed.slice(0, Math.max(0, left - kept.length))]};
        const tier = boucleLevel(final);
        if (!tier || !tiers.includes(tier)) return null;
        const wallText = final.walls.map(([a, b]) => `${Math.min(a, b)}-${Math.max(a, b)}`).sort().join(",");
        return {
            line: `${size}:${wallText}:${encodeLoop(base.solution, size)}`,
            score: tier * 100 + size * size - final.walls.length * 0.5,
        };
    };
}

/* ---------- Démineur ---------- */

function demineur(sizes: [number, number], density: [number, number], tiers: Tier[]): Band["make"] {
    return random => {
        const size = between(random, ...sizes);
        const mineCount = Math.max(2, Math.round(size * size * between(random, ...density) / 1000));
        const start = random(size * size);
        const mines = [...placeMines(size, mineCount, start, random)].sort((a, b) => a - b);
        const tier = demineurTier({size, mineCount, mines, start});
        if (!tier || !tiers.includes(tier)) return null;
        return {line: `${size}:${start}:${mines.join(",")}`, key: `${size}:${mines.join(",")}`, score: tier * 100 + size * 3 + mineCount * 1000 / (size * size)};
    };
}

/* ---------- Bouchon : les parkings de la banque, du plus court au plus long ---------- */

function bouchonLines(): Candidate[] {
    const out: Candidate[] = [];
    for (const [size, depths] of Object.entries(BOUCHON_BANK)) {
        for (const [moves, list] of Object.entries(depths)) {
            for (const code of list) {
                const vehicles = decodeParking(code).length;
                out.push({line: `${size}:${moves}:${code}`, score: Number(moves) * 10 + (Number(size) - 6) * 25 + vehicles * 0.1});
            }
        }
    }
    return out.sort((a, b) => a.score - b.score);
}

/* ---------- Devimot ---------- */

const LESSON_WORDS = new Set(["LOUP", "TIGRE", "POMME", "LION", "TRAIN", "PORTE", "CHAT", "OURS", "PAIN", "SOIN", "JOUR", "LEVRE"]);

type DevimotWord = { key: string; word: string; length: WordLength; rank: number; doubles: number; traps: number };
let devimotWords: DevimotWord[] | null = null;

function devimotPool(): DevimotWord[] {
    if (devimotWords) return devimotWords;
    const pool: DevimotWord[] = [];
    for (const length of [4, 5, 6] as WordLength[]) {
        const accepted = ACCEPTED_WORDS[length].split(" ");
        const seen = new Set<string>();
        solutionWords(length).forEach(({word, key}, rank) => {
            if (seen.has(key) || LESSON_WORDS.has(key) || !isAcceptedWord(key)) return;
            seen.add(key);
            // mots du dictionnaire qui ne diffèrent que d'une lettre : autant de pièges
            let traps = 0;
            for (const other of accepted) {
                let diff = 0;
                for (let i = 0; i < length && diff < 2; i++) if (other[i] !== key[i]) diff++;
                if (diff === 1) traps++;
            }
            pool.push({key, word, length, rank: rank / solutionWords(length).length, doubles: key.length - new Set(key).size, traps});
        });
    }
    devimotWords = pool;
    return pool;
}

function devimot(lengths: WordLength[], rank: [number, number], doubles: [number, number], attempts: number): Band["make"] {
    return random => {
        const pool = devimotPool().filter(w => lengths.includes(w.length) && w.rank >= rank[0] && w.rank < rank[1] && w.doubles >= doubles[0] && w.doubles <= doubles[1]);
        const w = pick(random, pool);
        return {line: `${w.key}:${w.word}:${attempts}`, key: w.key, score: w.rank * 40 + w.traps + w.doubles * 3 + w.length * 2};
    };
}

/* ---------- Échelle ---------- */

type Ladder = { neighbors: Map<string, string[]>; endpoints: string[] };
const ladders = new Map<WordLength, Ladder>();

function ladderFor(length: WordLength): Ladder {
    const cached = ladders.get(length);
    if (cached) return cached;
    const words = ladderWords(length);
    const set = new Set(words);
    const neighbors = new Map<string, string[]>();
    for (const word of words) {
        const linked: string[] = [];
        for (let i = 0; i < length; i++) {
            for (const letter of "ABCDEFGHIJKLMNOPQRSTUVWXYZ") {
                const next = word.slice(0, i) + letter + word.slice(i + 1);
                if (next !== word && set.has(next)) linked.push(next);
            }
        }
        neighbors.set(word, linked);
    }
    const endpoints = [...new Set(solutionWords(length).map(s => s.key))].filter(key => set.has(key) && !LESSON_WORDS.has(key));
    const ladder = {neighbors, endpoints};
    ladders.set(length, ladder);
    return ladder;
}

function echelle(lengths: WordLength[], pars: [number, number], detours: [number, number]): Band["make"] {
    return random => {
        const length = pick(random, lengths);
        const par = between(random, ...pars);
        const ladder = ladderFor(length);
        const start = pick(random, ladder.endpoints);
        // distance et nombre de plus courts chemins
        const distance = new Map([[start, 0]]);
        const ways = new Map([[start, 1]]);
        const queue = [start];
        for (let i = 0; i < queue.length; i++) {
            const word = queue[i]!;
            if (distance.get(word)! >= par) continue;
            for (const next of ladder.neighbors.get(word)!) {
                if (!distance.has(next)) {
                    distance.set(next, distance.get(word)! + 1);
                    ways.set(next, 0);
                    queue.push(next);
                }
                if (distance.get(next) === distance.get(word)! + 1) ways.set(next, ways.get(next)! + ways.get(word)!);
            }
        }
        const targets = ladder.endpoints.filter(word => {
            if (distance.get(word) !== par) return false;
            let hamming = 0;
            for (let i = 0; i < length; i++) if (word[i] !== start[i]) hamming++;
            return par - hamming >= detours[0] && par - hamming <= detours[1];
        });
        if (targets.length === 0) return null;
        const target = pick(random, targets);
        let hamming = 0;
        for (let i = 0; i < length; i++) if (target[i] !== start[i]) hamming++;
        const key = [start, target].sort().join("-");
        return {line: `${start}:${target}:${par}`, key, score: par * 10 + (par - hamming) * 6 + length * 2 - Math.log2(ways.get(target)!) * 2};
    };
}

/* ---------- Mots mêlés ---------- */

// Mots grossiers que les lettres de remplissage pourraient former par hasard (dans un sens ou dans l'autre)
const CRUDE = ["MERDE", "BITE", "PUTE", "NIQUE", "CONNE", "CONNARD", "SALOPE", "ENCULE", "PUTAIN", "CHIER", "FOUTRE", "COUILLE", "BAISE", "SEXE", "PENIS", "PORNO", "NAZI", "ZOB", "BRANLE", "CHATTE", "NEGRE", "PEDE"];

function hasCrude(size: number, letters: string): boolean {
    const lines: string[] = [];
    for (const [dr, dc] of [[0, 1], [1, 0], [1, 1], [1, -1]]) {
        for (let start = 0; start < size * size; start++) {
            const r = Math.floor(start / size), c = start % size;
            // départ d'une ligne : la case précédente est hors de la grille
            if (r - dr >= 0 && r - dr < size && c - dc >= 0 && c - dc < size) continue;
            let line = "";
            for (let i = 0; r + dr * i < size && c + dc * i >= 0 && c + dc * i < size; i++) line += letters[(r + dr * i) * size + c + dc * i];
            lines.push(line, [...line].reverse().join(""));
        }
    }
    return lines.some(line => CRUDE.some(word => line.includes(word)));
}

function motsMeles(size: number, words: [number, number]): Band["make"] {
    return random => {
        const count = between(random, ...words);
        const puzzle = generateMotsMeles(size, count, random);
        if (puzzle.words.some(word => LESSON_WORDS.has(word)) || hasCrude(size, puzzle.letters)) return null;
        const total = size * size;
        for (const word of puzzle.words) {
            let found = 0;
            for (let from = 0; from < total; from++) {
                for (let to = 0; to < total; to++) if (from !== to && readLine(puzzle, from, to) === word) found++;
            }
            if (found !== 1) return null;
        }
        return {line: `${size}:${puzzle.letters}:${puzzle.words.join(",")}`, score: size * 10 + count};
    };
}

/* ---------- Mots à caser : petites grilles construites ici, puis les grandes grilles de la banque ---------- */

const TWO_LETTERS = "AH AI AN AS AU CA CE DE DO DU EH EN ES ET EU FA HA IL IF JE LA LE LU MA ME MI MU NE NI NU OH ON OR OS OU PI PU RE RI RU SA SE SI SU TA TE TU UN US VA VU".split(" ");
let caserDictionary: Map<number, string[]> | null = null;

// Mots des grilles de la banque (déjà choisis dans Lexique : connus, sans mots grossiers)
function caserWords(): Map<number, string[]> {
    if (caserDictionary) return caserDictionary;
    const words = new Set(TWO_LETTERS);
    for (const size of [13, 15, 17, 20]) {
        for (const grid of motsACaserGrids(size)) {
            for (const g of [grid, transposeGrid(grid, size)]) for (const slot of wordSlots(g, size)) words.add(slot.map(c => g[c]).join(""));
        }
    }
    const byLength = new Map<number, string[]>();
    for (const word of words) {
        if (!byLength.has(word.length)) byLength.set(word.length, []);
        byLength.get(word.length)!.push(word);
    }
    caserDictionary = byLength;
    return byLength;
}

function runsOf(black: Uint8Array, size: number): number[][] {
    const out: number[][] = [];
    const scan = (at: (line: number, position: number) => number) => {
        for (let line = 0; line < size; line++) {
            let run: number[] = [];
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

// Cases noires jamais côte à côte, chaque lettre dans au moins un mot, pas de mot de plus de 9 lettres, tout relié
function caserPattern(size: number, blacks: number, random: Random): Uint8Array | null {
    const black = new Uint8Array(size * size);
    let placed = 0;
    for (let guard = 0; guard < size * size * 12; guard++) {
        const runs = runsOf(black, size);
        const long = runs.filter(run => run.length > 9);
        if (long.length === 0 && placed >= blacks) break;
        const from = long.length ? pick(random, long) : pick(random, runs);
        const cell = pick(random, from);
        if (black[cell] || sides(cell, size).some(n => black[n])) continue;
        black[cell] = 1;
        const inWord = new Uint8Array(size * size);
        for (const run of runsOf(black, size)) if (run.length >= 2) run.forEach(x => { inWord[x] = 1; });
        if (black.some((b, x) => !b && !inWord[x])) {
            black[cell] = 0;
            continue;
        }
        placed++;
    }
    if (runsOf(black, size).some(run => run.length > 9)) return null;
    const open = black.indexOf(0);
    const seen = new Uint8Array(size * size);
    const stack = [open];
    seen[open] = 1;
    while (stack.length) {
        for (const next of sides(stack.pop()!, size)) {
            if (!black[next] && !seen[next]) {
                seen[next] = 1;
                stack.push(next);
            }
        }
    }
    return black.every((b, x) => b || seen[x]) ? black : null;
}

// Remplit la grille, mots tous différents (recherche bornée)
function caserFill(black: Uint8Array, size: number, random: Random): string | null {
    const dictionary = caserWords();
    const slots = runsOf(black, size).filter(run => run.length >= 2);
    if (slots.some(slot => !dictionary.has(slot.length))) return null;
    const grid: string[] = Array.from(black, b => (b ? "#" : "."));
    const used = new Set<string>();
    const open = new Set(slots.keys());
    let nodes = 0;
    const fits = (slot: number[], word: string) => slot.every((c, i) => grid[c] === "." || grid[c] === word[i]);
    const search = (): boolean => {
        if (++nodes > 3000) return false;
        if (open.size === 0) return true;
        let best = -1, options: string[] = [];
        for (const k of open) {
            const list = dictionary.get(slots[k]!.length)!.filter(word => !used.has(word) && fits(slots[k]!, word));
            if (list.length === 0) return false;
            if (best < 0 || list.length < options.length) {
                best = k;
                options = list;
            }
        }
        open.delete(best);
        for (const word of shuffle(random, options).slice(0, 4)) {
            const written: number[] = [];
            slots[best]!.forEach((c, i) => {
                if (grid[c] === ".") {
                    grid[c] = word[i]!;
                    written.push(c);
                }
            });
            used.add(word);
            if (search()) return true;
            used.delete(word);
            written.forEach(c => { grid[c] = "."; });
        }
        open.add(best);
        return false;
    };
    return search() ? grid.join("") : null;
}

// Grille, mots déjà placés (numéros d'emplacement), palier
function caserLine(size: number, solution: string, givenCount: number, random: Random) {
    const slots = wordSlots(solution, size);
    const given = shuffle(random, slots.map((_, k) => k)).slice(0, givenCount).sort((a, b) => a - b);
    const shown = new Set(given.flatMap(k => slots[k]!));
    const cells = Array.from(solution, (letter, c) => (letter === "#" || shown.has(c) ? letter : ".")).join("");
    const words = slots.map(slot => slot.map(c => solution[c]).join(""));
    return {cells, words, given};
}

function motsACaserSmall(sizes: [number, number], blackShare: [number, number], givens: [number, number], tiers: Tier[]): Band["make"] {
    return random => {
        const size = between(random, ...sizes);
        const black = caserPattern(size, Math.round(size * size * between(random, ...blackShare) / 100), random);
        if (!black) return null;
        const solution = caserFill(black, size, random);
        if (!solution) return null;
        const words = wordSlots(solution, size).map(slot => slot.map(c => solution[c]).join(""));
        if (new Set(words).size !== words.length) return null;
        const {cells, given} = caserLine(size, solution, between(random, ...givens), random);
        const tier = motsACaserTier({size, cells, words});
        if (!tier || !tiers.includes(tier)) return null;
        return {line: `${size}:${solution}:${given.join(",")}`, key: solution, score: tier * 100 + size * size - given.length * 8};
    };
}

// Mots de 3 lettres à `size` lettres, et ceux qui contiennent chaque lettre, avec sa place (calculé une fois par taille)
const sparseIndexes = new Map<number, { known: Set<string>; pool: string[]; byLetter: Map<string, [string, number][]> }>();
function sparseIndex(size: number) {
    const cached = sparseIndexes.get(size);
    if (cached) return cached;
    const dictionary = caserWords();
    const known = new Set([...dictionary.values()].flat());
    const pool = [...dictionary].filter(([length]) => length >= 3 && length <= size).flatMap(([, list]) => list);
    const byLetter = new Map<string, [string, number][]>();
    for (const word of pool) {
        [...word].forEach((letter, i) => {
            if (!byLetter.has(letter)) byLetter.set(letter, []);
            byLetter.get(letter)!.push([word, i]);
        });
    }
    const index = {known, pool, byLetter};
    sparseIndexes.set(size, index);
    return index;
}

// Petite grille aérée, comme les leçons : des mots qui se croisent, posés un à un ; toute suite de lettres est un mot
function caserSparse(size: number, wordCount: number, random: Random): string | null {
    const {known, pool, byLetter} = sparseIndex(size);
    const grid: string[] = new Array<string>(size * size).fill("#");
    const placed = new Set<string>();
    const valid = () => {
        const text = grid.join("");
        const words = wordSlots(text, size).map(slot => slot.map(c => text[c]).join(""));
        return words.every(w => known.has(w)) && new Set(words).size === words.length;
    };
    const first = pick(random, pool.filter(w => w.length >= Math.min(size, 4)));
    const row = random(size), col = random(size - first.length + 1);
    [...first].forEach((letter, i) => { grid[row * size + col + i] = letter; });
    placed.add(first);
    for (let guard = 0; placed.size < wordCount && guard < 3000; guard++) {
        const anchors = grid.flatMap((letter, cell) => (letter === "#" ? [] : [cell]));
        const anchor = pick(random, anchors);
        const [word, index] = pick(random, byLetter.get(grid[anchor]!)!);
        if (placed.has(word)) continue;
        const across = random(2) === 0;
        const step = across ? 1 : size;
        const start = anchor - index * step;
        const r = Math.floor(anchor / size), c = anchor % size;
        if ((across ? c - index : r - index) < 0 || (across ? c - index : r - index) + word.length > size) continue;
        let crossings = 0, ok = true;
        for (let i = 0; i < word.length && ok; i++) {
            const cell = start + i * step;
            if (grid[cell] === word[i]) crossings++;
            else if (grid[cell] !== "#") ok = false;
        }
        if (!ok || crossings === word.length) continue;
        const before = [...grid];
        [...word].forEach((letter, i) => { grid[start + i * step] = letter; });
        if (valid()) placed.add(word);
        else grid.splice(0, grid.length, ...before);
    }
    if (placed.size < wordCount) return null;
    const text = grid.join("");
    // la grille est bien occupée : au plus une ligne et une colonne vides
    const emptyRows = Array.from({length: size}, (_, r) => r).filter(r => !text.slice(r * size, r * size + size).replace(/#/g, "")).length;
    const emptyCols = Array.from({length: size}, (_, c) => c).filter(c => Array.from({length: size}, (_, r) => text[r * size + c]).every(x => x === "#")).length;
    if (emptyRows > 1 || emptyCols > 1) return null;
    return text;
}

function motsACaserSparse(sizes: [number, number], words: [number, number], givens: [number, number], tiers: Tier[]): Band["make"] {
    return random => {
        const size = between(random, ...sizes);
        const solution = caserSparse(size, between(random, ...words), random);
        if (!solution) return null;
        const words_ = wordSlots(solution, size).map(slot => slot.map(c => solution[c]).join(""));
        const {cells, given} = caserLine(size, solution, between(random, ...givens), random);
        const tier = motsACaserTier({size, cells, words: words_});
        if (!tier || !tiers.includes(tier)) return null;
        return {line: `${size}:${solution}:${given.join(",")}`, key: solution, score: tier * 100 + size * 6 + words_.length * 2 - given.length * 8};
    };
}

function motsACaserBank(size: number, givens: [number, number], tiers: (Tier | 4)[]): Band["make"] {
    return random => {
        const picked = pick(random, motsACaserGrids(size));
        const solution = random(2) === 0 ? picked : transposeGrid(picked, size);
        const {cells, words, given} = caserLine(size, solution, between(random, ...givens), random);
        // grilles de la banque : une seule solution même sans aide ; au-delà du guide, palier 4
        const tier = motsACaserTier({size, cells, words}) ?? 4;
        if (!tiers.includes(tier)) return null;
        return {line: `${size}:${solution}:${given.join(",")}`, key: solution, score: tier * 100 - given.length * 20 + random(10)};
    };
}

/* ---------- Les 11 jeux ---------- */

const T12: Tier[] = [1, 2];

const GAMES: Record<string, () => Game> = {
    COLORIA: () => ({
        file: "coloriaLevelData.ts", constant: "COLORIA_LEVEL_DATA",
        header: [
            "Niveaux 4 à 1000 du Coloria (mode Niveaux), générés par scripts/build-grid-levels.ts, du plus doux au plus dur.",
            "Chaque niveau : \"<largeur>:<zone de chaque case, 0-9 a-z A-Z>:<couleur donnée de chaque zone, « . » à trouver>:<solution>\" (3 couleurs).",
            "Difficulté mesurée avec le guide (backend/src/utils/gridLevelGuides.ts) : jusqu'au niveau 400, seulement les",
            "techniques du tutoriel (la règle et la chaîne, puis le duo) ; ensuite il faut parfois essayer une couleur.",
        ],
        bands: [
            {count: 60, make: coloria([7, 10], [1])},
            {count: 80, make: coloria([9, 14], [1, 2])},
            {count: 120, make: coloria([12, 20], [2])},
            {count: 137, make: coloria([18, 30], [2])},
            {count: 150, make: coloria([24, 35], [3])},
            {count: 150, make: coloria([30, 45], [3])},
            {count: 150, make: coloria([40, 52], [3])},
            {count: 150, make: coloria([50, 60], [3])},
        ],
    }),
    TUYAUX: () => ({
        file: "tuyauxLevelData.ts", constant: "TUYAUX_LEVEL_DATA",
        header: [
            "Niveaux 4 à 1000 de Tuyaux (mode Niveaux), générés par scripts/build-grid-levels.ts, du plus doux au plus dur.",
            "Chaque niveau : \"<côté>:<pièce de départ de chaque case, hexadécimal>:<pièce de la solution>\" (1 haut, 2 droite, 4 bas, 8 gauche).",
            "Difficulté mesurée avec le guide (backend/src/utils/gridLevelGuides.ts) : jusqu'au niveau 550, seulement les",
            "techniques du tutoriel (le bord, les bouts, pas de boucle) ; ensuite il faut parfois essayer une orientation.",
        ],
        bands: [
            {count: 80, make: tuyaux([4, 5], [1])},
            {count: 120, make: tuyaux([5, 6], T12)},
            {count: 150, make: tuyaux([6, 7], T12)},
            {count: 197, make: tuyaux([7, 9], [2])},
            {count: 150, make: tuyaux([8, 10], [2, 3])},
            {count: 150, make: tuyaux([10, 12], [2, 3])},
            {count: 150, make: tuyaux([12, 15], [2, 3])},
        ],
    }),
    LIENS: () => ({
        file: "liensLevelData.ts", constant: "LIENS_LEVEL_DATA",
        header: [
            "Niveaux 4 à 1000 de Liens (mode Niveaux), générés par scripts/build-grid-levels.ts, du plus doux au plus dur.",
            "Chaque niveau : \"<côté>:<chemin de chaque paire, cases séparées par des points>\" (les lettres sont aux deux bouts).",
            "Difficulté mesurée avec le guide (backend/src/utils/gridLevelGuides.ts) : jusqu'au niveau 550, seulement les",
            "techniques du tutoriel (relier, les coins, toute la grille) ; ensuite il faut parfois voir deux coups plus loin.",
        ],
        bands: [
            {count: 80, make: liens([5, 5], [5, 7], [1])},
            {count: 120, make: liens([5, 6], [6, 9], T12)},
            {count: 150, make: liens([6, 7], [7, 12], T12)},
            {count: 197, make: liens([7, 8], [9, 16], T12)},
            {count: 150, make: liens([8, 9], [10, 20], [1, 2, 3])},
            {count: 150, make: liens([9, 10], [12, 24], [2, 3])},
            {count: 150, make: liens([10, 12], [14, 30], [2, 3])},
        ],
    }),
    PATURAGES: () => ({
        file: "paturagesLevelData.ts", constant: "PATURAGES_LEVEL_DATA",
        header: [
            "Niveaux 4 à 1000 de Pâturages (mode Niveaux), générés par scripts/build-grid-levels.ts, du plus doux au plus dur.",
            "Chaque niveau : \"<côté>:<case de chaque vache>:<carré de chaque vache, ligne.colonne.côté>\".",
            "Difficulté mesurée avec le guide (backend/src/utils/gridLevelGuides.ts) : jusqu'au niveau 550, seulement les",
            "techniques du tutoriel (une vache, un carré ; le grand carré) ; ensuite il faut parfois essayer un carré.",
        ],
        bands: [
            {count: 80, make: paturages([5, 6], T12)},
            {count: 120, make: paturages([6, 7], T12)},
            {count: 150, make: paturages([7, 8], T12)},
            {count: 197, make: paturages([8, 10], T12)},
            {count: 150, make: paturages([10, 11], [3])},
            {count: 150, make: paturages([11, 12], [3])},
            {count: 150, make: paturages([12, 14], [3])},
        ],
    }),
    BOUCLE: () => ({
        file: "boucleLevelData.ts", constant: "BOUCLE_LEVEL_DATA",
        header: [
            "Niveaux 4 à 1000 de Boucle (mode Niveaux), générés par scripts/build-grid-levels.ts, du plus doux au plus dur.",
            "Chaque niveau : \"<côté>:<murs a-b>:<boucle de la solution depuis la case 0, en directions H D B G>\".",
            "Difficulté mesurée avec le guide du tutoriel (src/Components/Lessons/boucleGuide.ts) : jusqu'au niveau 550,",
            "seulement les coins, les murs, les cases pleines et les petites boucles ; ensuite il faut parfois essayer un trait.",
        ],
        bands: [
            {count: 80, make: boucle([6, 6], [30, 50], [1])},
            {count: 120, make: boucle([6, 8], [10, 30], [1])},
            {count: 150, make: boucle([8, 8], [0, 15], [1])},
            {count: 197, make: boucle([8, 10], [0, 5], [1])},
            {count: 150, make: boucle([10, 10], [0, 10], [2])},
            {count: 150, make: boucle([10, 12], [0, 5], [2])},
            {count: 150, make: boucle([12, 14], [0, 0], [2])},
        ],
    }),
    DEMINEUR: () => ({
        file: "demineurLevelData.ts", constant: "DEMINEUR_LEVEL_DATA",
        header: [
            "Niveaux 4 à 1000 du Démineur (mode Niveaux), générés par scripts/build-grid-levels.ts, du plus doux au plus dur.",
            "Chaque niveau : \"<côté>:<case de départ, déjà ouverte>:<cases des mines>\". Tout se déduit sans deviner.",
            "Difficulté mesurée avec le guide (backend/src/utils/gridLevelGuides.ts) : jusqu'au niveau 550, seulement les",
            "techniques du tutoriel (drapeaux, cases sûres, motif 1-1) ; ensuite il faut comparer deux chiffres et compter les mines.",
        ],
        bands: [
            {count: 80, make: demineur([6, 7], [100, 130], [1])},
            {count: 120, make: demineur([7, 8], [120, 150], T12)},
            {count: 150, make: demineur([8, 10], [130, 160], T12)},
            {count: 197, make: demineur([10, 12], [140, 170], [2])},
            {count: 150, make: demineur([12, 14], [150, 180], [3])},
            {count: 150, make: demineur([14, 16], [160, 190], [3])},
            {count: 150, make: demineur([16, 20], [170, 205], [3])},
        ],
    }),
    BOUCHON: () => ({
        file: "bouchonLevelData.ts", constant: "BOUCHON_LEVEL_DATA",
        header: [
            "Niveaux 4 à 1000 de Bouchon (mode Niveaux), pris dans la banque de parkings (bouchonBankData.ts), du plus court au plus long.",
            "Chaque niveau : \"<côté>:<coups de la solution la plus courte>:<véhicules>\" (même code que la banque, le taxi en premier).",
        ],
        bands: [{count: 997, make: () => null}],
    }),
    DEVIMOT: () => ({
        file: "devimotLevelData.ts", constant: "DEVIMOT_LEVEL_DATA",
        header: [
            "Niveaux 4 à 1000 de Devimot (mode Niveaux), générés par scripts/build-grid-levels.ts, du plus doux au plus dur :",
            "des mots courants sans lettre double, puis plus rares, plus longs, avec des lettres doubles et des mots voisins pièges.",
            "Chaque niveau : \"<mot sans accent>:<mot écrit>:<essais>\".",
        ],
        bands: [
            {count: 100, make: devimot([4, 5], [0, 0.15], [0, 0], 7)},
            {count: 150, make: devimot([4, 5], [0.05, 0.35], [0, 1], 6)},
            {count: 200, make: devimot([5], [0.1, 0.6], [0, 1], 6)},
            {count: 200, make: devimot([5, 6], [0.2, 1], [0, 2], 6)},
            {count: 147, make: devimot([6], [0.2, 1], [0, 3], 6)},
            {count: 200, make: devimot([4, 5, 6], [0.3, 1], [0, 3], 5)},
        ],
    }),
    ECHELLE: () => ({
        file: "echelleLevelData.ts", constant: "ECHELLE_LEVEL_DATA",
        header: [
            "Niveaux 4 à 1000 de l'Échelle (mode Niveaux), générés par scripts/build-grid-levels.ts, du plus doux au plus dur :",
            "peu d'étapes et une lettre à changer par place, puis des échelles plus longues et des détours.",
            "Chaque niveau : \"<départ>:<arrivée>:<étapes du plus court chemin par des mots courants>\".",
        ],
        bands: [
            {count: 100, make: echelle([4], [2, 3], [0, 0])},
            {count: 150, make: echelle([4, 5], [3, 4], [0, 0])},
            {count: 200, make: echelle([4, 5], [3, 5], [0, 1])},
            {count: 200, make: echelle([4, 5, 6], [4, 6], [0, 2])},
            {count: 197, make: echelle([4, 5, 6], [5, 7], [1, 3])},
            {count: 150, make: echelle([4, 5, 6], [6, 8], [1, 4])},
        ],
    }),
    MOTSMELES: () => ({
        file: "motsMelesLevelData.ts", constant: "MOTS_MELES_LEVEL_DATA",
        header: [
            "Niveaux 4 à 1000 des Mots mêlés (mode Niveaux), générés par scripts/build-grid-levels.ts, du plus doux au plus dur :",
            "8×8 (horizontal et vertical), puis 10×10 (diagonales), puis 12×12 (à l'envers), avec de plus en plus de mots.",
            "Chaque niveau : \"<côté>:<lettres ligne par ligne>:<mots>\" ; chaque mot n'est qu'une seule fois dans la grille.",
        ],
        bands: [
            {count: 100, make: motsMeles(8, [4, 5])},
            {count: 150, make: motsMeles(8, [6, 8])},
            {count: 200, make: motsMeles(10, [6, 9])},
            {count: 200, make: motsMeles(10, [10, 12])},
            {count: 200, make: motsMeles(12, [8, 12])},
            {count: 147, make: motsMeles(12, [13, 16])},
        ],
    }),
    MOTSACASER: () => ({
        file: "motsACaserLevelData.ts", constant: "MOTS_A_CASER_LEVEL_DATA",
        header: [
            "Niveaux 4 à 1000 de Mots à caser (mode Niveaux), générés par scripts/build-grid-levels.ts, du plus doux au plus dur :",
            "petites grilles construites pour l'occasion, puis les grandes grilles de la banque (gridBankData.ts).",
            "Chaque niveau : \"<côté>:<grille finie, « # » case noire>:<numéros des emplacements déjà remplis>\" (voir wordSlots).",
            "Difficulté mesurée avec le guide (backend/src/utils/gridLevelGuides.ts) : jusqu'au niveau 400, seulement les",
            "longueurs et les croisements ; ensuite il faut parfois essayer un mot. Une seule façon de caser la liste.",
        ],
        bands: [
            {count: 60, make: motsACaserSparse([5, 6], [3, 4], [0, 1], [1])},
            {count: 100, make: motsACaserSparse([6, 7], [4, 6], [0, 1], T12)},
            {count: 120, make: motsACaserSparse([7, 9], [6, 9], [0, 1], T12)},
            {count: 117, make: motsACaserSmall([7, 8], [16, 22], [0, 2], [2])},
            {count: 120, make: motsACaserSmall([9, 10], [17, 22], [0, 2], [2, 3])},
            {count: 140, make: motsACaserBank(13, [0, 3], [1, 2, 3, 4])},
            {count: 140, make: motsACaserBank(15, [0, 2], [1, 2, 3, 4])},
            {count: 110, make: motsACaserBank(17, [0, 1], [2, 3, 4])},
            {count: 90, make: motsACaserBank(20, [0, 0], [2, 3, 4])},
        ],
    }),
};

/* ---------- Tranches en parallèle, puis assemblage ---------- */

type Job = { game: string; band: number; seconds: number };

function runBand({game, band, seconds}: Job): Candidate[] {
    const {count, make} = GAMES[game]!().bands[band]!;
    const wanted = Math.ceil(count * 2.2);
    const found = new Map<string, Candidate>();
    const random = mulberry(1000 * (band + 1) + game.length * 7919 + game.charCodeAt(0));
    const end = Date.now() + seconds * 1000;
    let tries = 0;
    while (found.size < wanted && (Date.now() < end || (found.size < count && !process.env.CALIBRATE))) {
        tries++;
        let candidate: Candidate | null = null;
        try {
            candidate = make(random);
        } catch {
            candidate = null;
        }
        if (candidate && !found.has(candidate.key ?? candidate.line)) found.set(candidate.key ?? candidate.line, candidate);
        if (tries > 4_000_000) break;
    }
    return [...found.values()];
}

// `count` grilles régulièrement espacées dans la liste rangée de la plus douce à la plus dure,
// sans reprendre une grille (ou un mot) déjà pris par une tranche précédente
function spread(candidates: Candidate[], count: number, taken: Set<string>): Candidate[] {
    const sorted = candidates.filter(c => !taken.has(c.key ?? c.line)).sort((a, b) => a.score - b.score);
    if (sorted.length < count) throw new Error(`${sorted.length} grilles trouvées sur ${count}`);
    const chosen = Array.from({length: count}, (_, i) => sorted[Math.floor(i * sorted.length / count)]!);
    chosen.forEach(c => taken.add(c.key ?? c.line));
    return chosen;
}

function runJobs(jobs: Job[]): Promise<Candidate[][]> {
    const threads = Math.max(1, cpus().length - 2);
    const results: Candidate[][] = new Array(jobs.length);
    let next = 0;
    const worker = async (): Promise<void> => {
        while (next < jobs.length) {
            const index = next++;
            const job = jobs[index]!;
            const t0 = Date.now();
            results[index] = await new Promise<Candidate[]>((resolve, reject) => {
                const w = new Worker(new URL(import.meta.url), {workerData: job});
                w.once("message", resolve);
                w.once("error", reject);
            });
            console.log(`${job.game} tranche ${job.band + 1} : ${results[index]!.length} grilles en ${Math.round((Date.now() - t0) / 1000)} s`);
        }
    };
    return Promise.all(Array.from({length: threads}, worker)).then(() => results);
}

if (!isMainThread) {
    parentPort!.postMessage(runBand(workerData as Job));
} else {
    const [names = "", seconds = "120"] = process.argv.slice(2);
    const codes = names.split(",").filter(Boolean);
    if (codes.length === 0 || codes.some(code => !GAMES[code])) throw new Error(`Jeux : ${Object.keys(GAMES).join(", ")}`);
    const jobs = codes.flatMap(game => (game === "BOUCHON" ? [] : GAMES[game]!().bands.map((_, band) => ({game, band, seconds: Number(seconds)}))));
    const results = await runJobs(jobs);
    // essai : combien de grilles chaque tranche trouve dans le temps donné, sans rien écrire
    if (process.env.CALIBRATE) process.exit(0);
    for (const game of codes) {
        const def = GAMES[game]!();
        const taken = new Set<string>();
        const lines = game === "BOUCHON"
            ? spread(bouchonLines(), 997, taken).map(c => c.line)
            : def.bands.flatMap((band, i) => spread(results[jobs.findIndex(j => j.game === game && j.band === i)]!, band.count, taken).map(c => c.line));
        if (lines.length !== 997 || new Set(lines).size !== 997) throw new Error(`${game} : ${lines.length} niveaux, ${new Set(lines).size} différents`);
        const words = ["DEVIMOT", "ECHELLE", "MOTSMELES", "MOTSACASER"].includes(game);
        const header = [...def.header, ...(words ? LEXIQUE : []), "Ne pas modifier un niveau publié : la progression des joueurs est enregistrée par numéro."];
        const target = fileURLToPath(new URL(`../backend/src/utils/${def.file}`, import.meta.url));
        writeFileSync(target, `/*\n${header.map(l => ` * ${l}`).join("\n")}\n */\nexport const ${def.constant}: readonly string[] = [\n${lines.map(l => `    ${JSON.stringify(l)},`).join("\n")}\n];\n`);
        console.log(`${game} : ${def.file} écrit`);
    }
}
