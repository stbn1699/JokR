import {type ColoriaPuzzle, zoneNeighbours} from "./coloria.js";
import {isTuyauxSolved, rotateTile, type TuyauxPuzzle} from "./tuyaux.js";
import type {LiensPuzzle} from "./liens.js";
import type {PaturagesPuzzle, PaturagesSquare} from "./paturages.js";
import {neighbours as demineurNeighbours} from "./demineur.js";
import {wordSlots} from "./motsACaser.js";

/*
 * Guides de déduction des jeux de grille ajoutés depuis 3.3, pour classer leurs niveaux (comme les guides des jeux
 * d'origine, src/Components/Levels/*Guide.ts ; celui de Boucle est src/Components/Lessons/boucleGuide.ts).
 * Chaque guide résout la grille avec des règles de plus en plus fortes et renvoie le palier qu'il a fallu atteindre,
 * ou null si même le dernier palier ne suffit pas. Toutes les règles sont sûres : une grille résolue jusqu'au bout
 * n'a qu'une seule solution.
 * Palier 1 et 2 : les techniques du tutoriel (voir gridLessons.ts) ; palier 3 : essayer un coup et voir qu'il bloque.
 */

export type Tier = 1 | 2 | 3;
const TIERS: Tier[] = [1, 2, 3];

// Premier palier qui résout la grille
const firstTier = (solves: (tier: Tier) => boolean): Tier | null => TIERS.find(solves) ?? null;

const sides = (cell: number, size: number) => {
    const row = Math.floor(cell / size), col = cell % size;
    return [row > 0 ? cell - size : -1, col < size - 1 ? cell + 1 : -1, row < size - 1 ? cell + size : -1, col > 0 ? cell - 1 : -1];
};

/* ---------- Coloria (3 couleurs) ----------
 * 1. la règle et la chaîne : une zone qui touche deux couleurs prend la troisième
 * 2. le duo : deux zones voisines qui n'ont plus que les deux mêmes couleurs les interdisent à leurs voisines communes
 * 3. l'essai : une couleur qui viderait une autre zone est barrée
 */

const isSingle = (bits: number) => bits !== 0 && (bits & (bits - 1)) === 0;
const bitCount = (bits: number) => {
    let n = 0;
    for (let b = bits; b; b &= b - 1) n++;
    return n;
};

function coloriaPropagate(domains: number[], links: number[][], tier: Tier): boolean {
    for (;;) {
        let changed = false;
        for (let zone = 0; zone < domains.length; zone++) {
            const bits = domains[zone]!;
            if (bits === 0) return false;
            if (!isSingle(bits)) continue;
            for (const next of links[zone]!) {
                if (!(domains[next]! & bits)) continue;
                domains[next] = domains[next]! & ~bits;
                if (domains[next] === 0) return false;
                changed = true;
            }
        }
        if (changed) continue;
        if (tier < 2) return true;
        for (let a = 0; a < domains.length && !changed; a++) {
            const pair = domains[a]!;
            if (bitCount(pair) !== 2) continue;
            for (const b of links[a]!) {
                if (domains[b] !== pair) continue;
                for (const z of links[a]!) {
                    if (z === b || !links[b]!.includes(z) || !(domains[z]! & pair)) continue;
                    domains[z] = domains[z]! & ~pair;
                    if (domains[z] === 0) return false;
                    changed = true;
                }
            }
        }
        if (!changed) return true;
    }
}

export function coloriaSolves(puzzle: Pick<ColoriaPuzzle, "width" | "zones" | "colors" | "regions" | "given">, tier: Tier): boolean {
    const links = zoneNeighbours(puzzle.regions, puzzle.width, puzzle.zones).map(set => [...set]);
    const all = (1 << puzzle.colors) - 1;
    const domains = puzzle.given.map(color => (color >= 0 ? 1 << color : all));
    if (!coloriaPropagate(domains, links, tier)) return false;
    while (tier === 3 && !domains.every(isSingle)) {
        let changed = false;
        for (let zone = 0; zone < domains.length; zone++) {
            if (isSingle(domains[zone]!)) continue;
            for (let c = 0; c < puzzle.colors; c++) {
                const bit = 1 << c;
                if (!(domains[zone]! & bit)) continue;
                const attempt = [...domains];
                attempt[zone] = bit;
                if (coloriaPropagate(attempt, links, 2)) continue;
                domains[zone] = domains[zone]! & ~bit;
                if (!coloriaPropagate(domains, links, 2)) return false;
                changed = true;
            }
        }
        if (!changed) break;
    }
    return domains.every(isSingle);
}

export const coloriaTier = (puzzle: Pick<ColoriaPuzzle, "width" | "zones" | "colors" | "regions" | "given">) =>
    firstTier(tier => coloriaSolves(puzzle, tier));

/* ---------- Tuyaux ----------
 * 1. le bord : aucune sortie vers l'extérieur, et deux pièces voisines se font face ou se tournent le dos
 * 2. les bouts : deux pièces à une seule sortie ne se font jamais face
 *    pas de boucle : deux pièces déjà reliées ne se relient pas une deuxième fois, et un morceau fermé doit
 *    contenir toute la grille
 * 3. l'essai : une orientation qui mène à une impasse est barrée
 */

const DIRS = [1, 2, 4, 8] as const;
const oppositeBit = (bit: number) => (bit << 2 | bit >> 2) & 15;

function tuyauxNeighbour(cell: number, bit: number, size: number) {
    return sides(cell, size)[DIRS.indexOf(bit as 1 | 2 | 4 | 8)]!;
}

function tuyauxPropagate(options: number[][], size: number, tier: Tier): boolean {
    const total = options.length;
    const degree = (cell: number) => bitCount(options[cell]![0]!);
    for (;;) {
        let changed = false;
        const keep = (cell: number, test: (mask: number) => boolean) => {
            const before = options[cell]!.length;
            options[cell] = options[cell]!.filter(test);
            if (options[cell]!.length !== before) changed = true;
            return options[cell]!.length > 0;
        };
        // pour chaque côté : toujours ouvert, toujours fermé, ou pas encore su
        const sure = (cell: number, bit: number) => {
            const list = options[cell]!;
            if (list.every(m => m & bit)) return 1;
            if (list.every(m => !(m & bit))) return 0;
            return -1;
        };
        for (let cell = 0; cell < total; cell++) {
            for (const bit of DIRS) {
                const next = tuyauxNeighbour(cell, bit, size);
                if (next < 0) {
                    if (!keep(cell, m => !(m & bit))) return false;
                    continue;
                }
                const state = sure(next, oppositeBit(bit));
                if (state === 1 && !keep(cell, m => (m & bit) !== 0)) return false;
                if (state === 0 && !keep(cell, m => !(m & bit))) return false;
                if (tier >= 2 && total > 2 && degree(cell) === 1 && degree(next) === 1 && !keep(cell, m => !(m & bit))) return false;
            }
        }
        if (changed) continue;
        if (tier < 2) return true;

        // morceaux déjà reliés à coup sûr
        const parent = Array.from({length: total}, (_, i) => i);
        const find = (x: number): number => (parent[x] === x ? x : (parent[x] = find(parent[x]!)));
        for (let cell = 0; cell < total; cell++) {
            for (const bit of [2, 4]) {
                const next = tuyauxNeighbour(cell, bit, size);
                if (next < 0 || sure(cell, bit) !== 1) continue;
                if (find(cell) === find(next)) return false;
                parent[find(cell)] = find(next);
            }
        }
        // sorties encore possibles de chaque morceau
        const open = new Map<number, number>();
        const members = new Map<number, number>();
        for (let cell = 0; cell < total; cell++) {
            const root = find(cell);
            members.set(root, (members.get(root) ?? 0) + 1);
            for (const bit of DIRS) {
                const next = tuyauxNeighbour(cell, bit, size);
                if (next >= 0 && sure(cell, bit) === -1) open.set(root, (open.get(root) ?? 0) + 1);
            }
        }
        for (const [root, size_] of members) {
            if (size_ < total && !open.get(root)) return false;
        }
        for (let cell = 0; cell < total && !changed; cell++) {
            for (const bit of DIRS) {
                const next = tuyauxNeighbour(cell, bit, size);
                if (next < 0 || sure(cell, bit) !== -1) continue;
                const a = find(cell), b = find(next);
                const loop = a === b;
                // relier ces deux morceaux en ferait un morceau sans autre sortie, plus petit que la grille
                const closed = !loop && members.get(a)! + members.get(b)! < total && open.get(a)! + open.get(b)! - 2 === 0;
                if ((loop || closed) && !keep(cell, m => !(m & bit))) return false;
            }
        }
        if (!changed) return true;
    }
}

export function tuyauxSolves(puzzle: Pick<TuyauxPuzzle, "size" | "tiles" | "locked">, tier: Tier): boolean {
    const {size} = puzzle;
    const locked = new Set(puzzle.locked);
    const options = puzzle.tiles.map((tile, cell) => (locked.has(cell) ? [tile] : [...new Set([0, 1, 2, 3].map(t => rotateTile(tile, t)))]));
    if (!tuyauxPropagate(options, size, tier)) return false;
    while (tier === 3 && options.some(list => list.length > 1)) {
        let changed = false;
        for (let cell = 0; cell < options.length; cell++) {
            if (options[cell]!.length < 2) continue;
            for (const mask of [...options[cell]!]) {
                const attempt = options.map(list => [...list]);
                attempt[cell] = [mask];
                if (tuyauxPropagate(attempt, size, 2)) continue;
                options[cell] = options[cell]!.filter(m => m !== mask);
                if (!tuyauxPropagate(options, size, 2)) return false;
                changed = true;
            }
        }
        if (!changed) break;
    }
    return options.every(list => list.length === 1) && isTuyauxSolved(options.map(list => list[0]!), size);
}

export const tuyauxTier = (puzzle: Pick<TuyauxPuzzle, "size" | "tiles" | "locked">) => firstTier(tier => tuyauxSolves(puzzle, tier));

/* ---------- Liens ----------
 * Chaque case est reliée à ses voisines par des traits : une lettre en a un, une autre case deux.
 * 1. relier : une case qui n'a plus que juste assez de voisines libres les relie toutes (le coin, la seule sortie),
 *    une case pleine ne prend plus de trait, deux couleurs différentes ne se relient pas, pas de boucle
 * 2. toute la grille : essayer un trait et voir qu'il coupe une paire de sa jumelle ou laisse des cases que plus
 *    aucune ligne ne peut atteindre
 * 3. l'essai à deux coups d'avance
 */

const ON = 1, OFF = 2;
type LiensState = { edges: Uint8Array; color: Int16Array };
type LiensBoard = { size: number; total: number; ends: Int16Array; edgeOf: (a: number, b: number) => number; around: number[][]; edgeCells: [number, number][] };

function liensBoard(puzzle: Pick<LiensPuzzle, "size" | "pairs">): LiensBoard {
    const {size} = puzzle, total = size * size;
    const edgeCells: [number, number][] = [];
    const index = new Map<number, number>();
    for (let cell = 0; cell < total; cell++) {
        for (const next of [cell % size < size - 1 ? cell + 1 : -1, cell + size < total ? cell + size : -1]) {
            if (next < 0) continue;
            index.set(cell * total + next, edgeCells.length);
            edgeCells.push([cell, next]);
        }
    }
    const edgeOf = (a: number, b: number) => index.get(Math.min(a, b) * total + Math.max(a, b))!;
    const around = Array.from({length: total}, (_, cell) => sides(cell, size).filter(n => n >= 0).map(n => edgeOf(cell, n)));
    const ends = new Int16Array(total).fill(-1);
    puzzle.pairs.forEach(([a, b], c) => { ends[a] = c; ends[b] = c; });
    return {size, total, ends, edgeOf, around, edgeCells};
}

function liensPropagate(b: LiensBoard, s: LiensState, deep: boolean): boolean {
    const {total, ends, around, edgeCells} = b;
    const need = (cell: number) => (ends[cell]! >= 0 ? 1 : 2);
    for (;;) {
        let changed = false;
        const set = (edge: number, value: number) => {
            if (s.edges[edge] === value) return true;
            if (s.edges[edge] !== 0) return false;
            s.edges[edge] = value;
            changed = true;
            return true;
        };
        // couleurs : un trait relie deux cases de même couleur
        for (let e = 0; e < edgeCells.length; e++) {
            const [x, y] = edgeCells[e]!;
            const cx = s.color[x]!, cy = s.color[y]!;
            if (s.edges[e] === ON) {
                if (cx >= 0 && cy >= 0 && cx !== cy) return false;
                if (cx >= 0 && cy < 0) { s.color[y] = cx; changed = true; }
                if (cy >= 0 && cx < 0) { s.color[x] = cy; changed = true; }
            } else if (s.edges[e] === 0 && cx >= 0 && cy >= 0 && cx !== cy && !set(e, OFF)) return false;
        }
        // nombre de traits de chaque case
        for (let cell = 0; cell < total; cell++) {
            const list = around[cell]!;
            let on = 0, free = 0;
            for (const e of list) {
                if (s.edges[e] === ON) on++;
                else if (s.edges[e] === 0) free++;
            }
            const want = need(cell);
            if (on > want || on + free < want) return false;
            if (free === 0) continue;
            if (on === want) for (const e of list) { if (s.edges[e] === 0) set(e, OFF); }
            else if (on + free === want) for (const e of list) { if (s.edges[e] === 0) set(e, ON); }
        }
        if (changed) continue;

        // morceaux de ligne : pas de boucle, et deux lettres reliées sont forcément jumelles
        const parent = Array.from({length: total}, (_, i) => i);
        const find = (x: number): number => (parent[x] === x ? x : (parent[x] = find(parent[x]!)));
        for (let e = 0; e < edgeCells.length; e++) {
            if (s.edges[e] !== ON) continue;
            const [x, y] = edgeCells[e]!;
            if (find(x) === find(y)) return false;
            parent[find(x)] = find(y);
        }
        for (let e = 0; e < edgeCells.length; e++) {
            if (s.edges[e] !== 0) continue;
            const [x, y] = edgeCells[e]!;
            if (find(x) === find(y) && !set(e, OFF)) return false;
        }
        if (changed) continue;
        if (!deep) return true;

        // chaque paire doit encore pouvoir rejoindre sa jumelle, et chaque case vide une ligne
        const full = (cell: number) => {
            let on = 0;
            for (const e of around[cell]!) if (s.edges[e] === ON) on++;
            return on >= need(cell);
        };
        const reach = (from: number, color: number) => {
            const seen = new Uint8Array(total);
            const stack = [from];
            seen[from] = 1;
            while (stack.length) {
                const cell = stack.pop()!;
                for (const e of around[cell]!) {
                    if (s.edges[e] === OFF) continue;
                    const [x, y] = edgeCells[e]!;
                    const next = x === cell ? y : x;
                    if (seen[next]) continue;
                    const c = s.color[next]!;
                    if (c >= 0 && c !== color) continue;
                    // on traverse une case par un trait déjà posé, ou une case qui a encore de la place
                    if (s.edges[e] !== ON && (full(next) || full(cell))) continue;
                    seen[next] = 1;
                    stack.push(next);
                }
            }
            return seen;
        };
        for (let c = 0; c < b.ends.length; c++) {
            const pairEnds: number[] = [];
            for (let cell = 0; cell < total; cell++) if (ends[cell] === c) pairEnds.push(cell);
            if (pairEnds.length !== 2) continue;
            const [p, q] = pairEnds as [number, number];
            if (find(p) === find(q)) continue;
            if (!reach(p, c)[q]) return false;
        }
        // une case sans couleur doit toucher (par des cases sans couleur) une ligne qui n'est pas finie
        const seenBlank = new Uint8Array(total);
        for (let start = 0; start < total; start++) {
            if (s.color[start]! >= 0 || seenBlank[start]) continue;
            const stack = [start];
            seenBlank[start] = 1;
            let touches = false;
            while (stack.length && !touches) {
                const cell = stack.pop()!;
                for (const e of around[cell]!) {
                    if (s.edges[e] === OFF) continue;
                    const [x, y] = edgeCells[e]!;
                    const next = x === cell ? y : x;
                    if (s.color[next]! >= 0) {
                        if (!full(next)) touches = true;
                    } else if (!seenBlank[next]) {
                        seenBlank[next] = 1;
                        stack.push(next);
                    }
                }
            }
            if (!touches) return false;
        }
        return true;
    }
}

function liensState(b: LiensBoard): LiensState {
    return {edges: new Uint8Array(b.edgeCells.length), color: Int16Array.from(b.ends)};
}

const copyLiens = (s: LiensState): LiensState => ({edges: s.edges.slice(), color: s.color.slice()});

// Essai : chaque trait encore libre, posé puis barré ; un choix qui mène à une impasse est écarté
function liensTrial(b: LiensBoard, s: LiensState, inner: (state: LiensState) => boolean): boolean {
    for (;;) {
        let changed = false;
        for (let e = 0; e < s.edges.length; e++) {
            if (s.edges[e] !== 0) continue;
            for (const value of [ON, OFF]) {
                const attempt = copyLiens(s);
                attempt.edges[e] = value;
                if (inner(attempt)) continue;
                s.edges[e] = value === ON ? OFF : ON;
                if (!inner(s)) return false;
                changed = true;
                break;
            }
        }
        if (!changed || s.edges.every(v => v !== 0)) return true;
    }
}

export function liensSolves(puzzle: Pick<LiensPuzzle, "size" | "pairs">, tier: Tier): boolean {
    const b = liensBoard(puzzle);
    const s = liensState(b);
    if (!liensPropagate(b, s, tier >= 2)) return false;
    if (tier === 2) liensTrial(b, s, state => liensPropagate(b, state, true));
    if (tier === 3) liensTrial(b, s, state => liensPropagate(b, state, true) && liensTrial(b, state, inner => liensPropagate(b, inner, true)));
    return s.edges.every(v => v !== 0) && liensPropagate(b, s, true);
}

export const liensTier = (puzzle: Pick<LiensPuzzle, "size" | "pairs">) => firstTier(tier => liensSolves(puzzle, tier));

/* ---------- Pâturages ----------
 * 1. une vache, un carré : une vache qui n'a plus qu'un carré possible le prend (les carrés posés, et les autres
 *    vaches, réduisent les possibilités)
 * 2. le grand carré : une case que la seule vache peut atteindre est dans son carré
 * 3. l'essai : un carré qui laisserait une vache ou une case sans solution est barré
 */

type PaturagesState = { options: PaturagesSquare[][]; size: number };

const coversCell = (sq: PaturagesSquare, cell: number, size: number) => {
    const row = Math.floor(cell / size), col = cell % size;
    return row >= sq.row && row < sq.row + sq.side && col >= sq.col && col < sq.col + sq.side;
};
const overlaps = (a: PaturagesSquare, b: PaturagesSquare) =>
    a.row < b.row + b.side && b.row < a.row + a.side && a.col < b.col + b.side && b.col < a.col + a.side;

function paturagesOptions(size: number, cows: readonly number[]): PaturagesSquare[][] {
    const cowAt = new Int16Array(size * size).fill(-1);
    cows.forEach((cell, i) => { cowAt[cell] = i; });
    return cows.map((cell, i) => {
        const out: PaturagesSquare[] = [];
        const r0 = Math.floor(cell / size), c0 = cell % size;
        for (let side = 1; side <= size; side++) {
            for (let row = Math.max(0, r0 - side + 1); row <= r0 && row + side <= size; row++) {
                for (let col = Math.max(0, c0 - side + 1); col <= c0 && col + side <= size; col++) {
                    let ok = true;
                    for (let r = row; r < row + side && ok; r++) {
                        for (let c = col; c < col + side && ok; c++) if (cowAt[r * size + c] !== -1 && cowAt[r * size + c] !== i) ok = false;
                    }
                    if (ok) out.push({row, col, side});
                }
            }
        }
        return out;
    });
}

function paturagesPropagate(s: PaturagesState, tier: Tier): boolean {
    const {size} = s;
    for (;;) {
        let changed = false;
        // un carré posé (seule possibilité) chasse les carrés des autres vaches qui le chevauchent
        for (let i = 0; i < s.options.length; i++) {
            if (s.options[i]!.length === 0) return false;
            if (s.options[i]!.length !== 1) continue;
            const placed = s.options[i]![0]!;
            for (let j = 0; j < s.options.length; j++) {
                if (j === i) continue;
                const before = s.options[j]!.length;
                s.options[j] = s.options[j]!.filter(sq => !overlaps(sq, placed));
                if (s.options[j]!.length === 0) return false;
                if (s.options[j]!.length !== before) changed = true;
            }
        }
        if (changed) continue;
        if (tier < 2) return true;
        for (let cell = 0; cell < size * size; cell++) {
            const who: number[] = [];
            for (let i = 0; i < s.options.length && who.length < 2; i++) {
                if (s.options[i]!.some(sq => coversCell(sq, cell, size))) who.push(i);
            }
            if (who.length === 0) return false;
            if (who.length > 1) continue;
            const i = who[0]!;
            const before = s.options[i]!.length;
            s.options[i] = s.options[i]!.filter(sq => coversCell(sq, cell, size));
            if (s.options[i]!.length !== before) changed = true;
        }
        if (!changed) return true;
    }
}

export function paturagesSolves(puzzle: Pick<PaturagesPuzzle, "size" | "cows" | "given">, tier: Tier): boolean {
    const {size} = puzzle;
    const s: PaturagesState = {size, options: paturagesOptions(size, puzzle.cows)};
    for (const g of puzzle.given) {
        const i = puzzle.cows.findIndex(cell => coversCell(g, cell, size));
        if (i >= 0) s.options[i] = s.options[i]!.filter(sq => sq.row === g.row && sq.col === g.col && sq.side === g.side);
    }
    if (!paturagesPropagate(s, tier)) return false;
    while (tier === 3 && s.options.some(list => list.length > 1)) {
        let changed = false;
        for (let i = 0; i < s.options.length; i++) {
            if (s.options[i]!.length < 2) continue;
            for (const sq of [...s.options[i]!]) {
                const attempt: PaturagesState = {size, options: s.options.map(list => [...list])};
                attempt.options[i] = [sq];
                if (paturagesPropagate(attempt, 2)) continue;
                s.options[i] = s.options[i]!.filter(o => o !== sq);
                if (!paturagesPropagate(s, 2)) return false;
                changed = true;
            }
        }
        if (!changed) break;
    }
    if (!s.options.every(list => list.length === 1)) return false;
    const area = s.options.reduce((sum, list) => sum + list[0]!.side ** 2, 0);
    return area === size * size;
}

export const paturagesTier = (puzzle: Pick<PaturagesPuzzle, "size" | "cows" | "given">) => firstTier(tier => paturagesSolves(puzzle, tier));

/* ---------- Démineur ----------
 * 1. les drapeaux et les cases sûres : un chiffre qui a autant de cases cachées que de mines restantes, ou plus
 *    aucune mine à trouver
 * 2. le motif 1-1 : les cases cachées d'un chiffre sont toutes autour d'un autre, avec autant de mines à trouver :
 *    les autres cases de ce dernier sont sûres
 * 3. au-delà : comparer deux chiffres qui n'ont pas autant de mines, et compter les mines restantes
 */

export type StoredDemineur = { size: number; mineCount: number; mines: number[]; start: number };

export function demineurSolves({size, mineCount, mines, start}: StoredDemineur, tier: Tier): boolean {
    const mined = new Set(mines);
    const total = size * size;
    const around = Array.from({length: total}, (_, cell) => demineurNeighbours(cell, size));
    const count = (cell: number) => around[cell]!.filter(n => mined.has(n)).length;
    if (mined.has(start) || count(start) > 0) return false;
    const open = new Set<number>(), flags = new Set<number>();
    const reveal = (cell: number) => {
        const queue = [cell];
        while (queue.length) {
            const c = queue.pop()!;
            if (open.has(c)) continue;
            if (mined.has(c)) throw new Error("mine ouverte : règle fausse");
            open.add(c);
            if (count(c) === 0) queue.push(...around[c]!);
        }
    };
    const hidden = (cell: number) => around[cell]!.filter(n => !open.has(n) && !flags.has(n));
    const left = (cell: number) => count(cell) - around[cell]!.filter(n => flags.has(n)).length;
    reveal(start);
    while (open.size < total - mineCount) {
        const numbers = [...open].filter(c => hidden(c).length > 0);
        const simple = numbers.find(c => left(c) === 0 || left(c) === hidden(c).length);
        if (simple !== undefined) {
            if (left(simple) === 0) hidden(simple).forEach(reveal);
            else hidden(simple).forEach(c => flags.add(c));
            continue;
        }
        if (tier < 2) return false;
        let progress = false;
        for (const a of numbers) {
            const ha = hidden(a);
            for (const b of around[a]!.flatMap(n => around[n]!).concat(around[a]!)) {
                if (b === a || !open.has(b)) continue;
                const hb = hidden(b);
                if (hb.length <= ha.length || !ha.every(c => hb.includes(c))) continue;
                const rest = hb.filter(c => !ha.includes(c));
                if (left(a) === left(b)) {
                    rest.forEach(reveal);
                    progress = true;
                } else if (tier >= 3 && left(b) - left(a) === rest.length) {
                    rest.forEach(c => flags.add(c));
                    progress = true;
                }
                if (progress) break;
            }
            if (progress) break;
        }
        if (progress) continue;
        if (tier < 3) return false;
        const unknown = Array.from({length: total}, (_, c) => c).filter(c => !open.has(c) && !flags.has(c));
        const minesLeft = mineCount - flags.size;
        if (minesLeft === 0) unknown.forEach(reveal);
        else if (minesLeft === unknown.length) unknown.forEach(c => flags.add(c));
        else return false;
    }
    return true;
}

export const demineurTier = (puzzle: StoredDemineur) => firstTier(tier => demineurSolves(puzzle, tier));

/* ---------- Mots à caser ----------
 * 1. les longueurs : un emplacement où un seul mot tient, ou un mot qui ne tient qu'à un endroit
 * 2. les croisements : un mot n'est possible dans un emplacement que si chaque lettre croisée peut commencer,
 *    continuer ou finir un mot possible de l'autre emplacement
 * 3. l'essai : un mot qui, posé là, bloquerait un autre emplacement est barré
 */

type Caser = { slots: number[][]; crossings: [number, number, number][][]; domains: string[][]; counts: Map<string, number> };

function caserPropagate(c: Caser, tier: Tier): boolean {
    const {slots, crossings, domains, counts} = c;
    for (;;) {
        let changed = false;
        // mots sûrs : un emplacement qui n'a plus qu'un mot le garde, les autres emplacements ne l'ont plus
        const placed = new Map<string, number>();
        for (const list of domains) {
            if (list.length === 0) return false;
            if (list.length === 1) placed.set(list[0]!, (placed.get(list[0]!) ?? 0) + 1);
        }
        for (const [word, n] of placed) {
            if (n > counts.get(word)!) return false;
            if (n < counts.get(word)!) continue;
            domains.forEach((list, k) => {
                if (list.length > 1 && list.includes(word)) {
                    domains[k] = list.filter(w => w !== word);
                    changed = true;
                }
            });
        }
        if (changed) continue;
        // un mot qui ne tient plus qu'à un seul endroit y va
        for (const [word, n] of counts) {
            const places = domains.flatMap((list, k) => (list.includes(word) ? [k] : []));
            if (places.length < n) return false;
            if (places.length === n) {
                for (const k of places) {
                    if (domains[k]!.length > 1) {
                        domains[k] = [word];
                        changed = true;
                    }
                }
            }
        }
        if (changed) continue;
        if (tier < 2) return true;
        // croisements
        for (let k = 0; k < slots.length; k++) {
            const before = domains[k]!.length;
            domains[k] = domains[k]!.filter(word => crossings[k]!.every(([at, other, there]) =>
                domains[other]!.some(w => w[there] === word[at] && (w !== word || counts.get(word)! > 1))));
            if (domains[k]!.length === 0) return false;
            if (domains[k]!.length !== before) changed = true;
        }
        if (!changed) return true;
    }
}

const copyCaser = (c: Caser): Caser => ({...c, domains: c.domains.map(list => [...list])});

export function motsACaserSolves(puzzle: { size: number; cells: string; words: readonly string[] }, tier: Tier): boolean {
    const slots = wordSlots(puzzle.cells, puzzle.size);
    const counts = new Map<string, number>();
    for (const word of puzzle.words) counts.set(word, (counts.get(word) ?? 0) + 1);
    const at = new Map<number, [number, number][]>();
    slots.forEach((slot, k) => slot.forEach((cell, i) => at.set(cell, [...(at.get(cell) ?? []), [k, i]])));
    const crossings = slots.map((slot, k) => slot.flatMap((cell, i) =>
        at.get(cell)!.filter(([other]) => other !== k).map(([other, there]) => [i, other, there] as [number, number, number])));
    const domains = slots.map(slot => [...counts.keys()].filter(word =>
        word.length === slot.length && slot.every((cell, i) => puzzle.cells[cell] === "." || puzzle.cells[cell] === word[i])));
    const c: Caser = {slots, crossings, domains, counts};
    if (!caserPropagate(c, tier)) return false;
    while (tier === 3 && c.domains.some(list => list.length > 1)) {
        let changed = false;
        for (let k = 0; k < slots.length; k++) {
            for (const word of [...c.domains[k]!]) {
                if (c.domains[k]!.length < 2) break;
                const attempt = copyCaser(c);
                attempt.domains[k] = [word];
                if (caserPropagate(attempt, 2)) continue;
                c.domains[k] = c.domains[k]!.filter(w => w !== word);
                if (!caserPropagate(c, 2)) return false;
                changed = true;
            }
        }
        if (!changed) break;
    }
    return c.domains.every(list => list.length === 1);
}

export const motsACaserTier = (puzzle: { size: number; cells: string; words: readonly string[] }) =>
    firstTier(tier => motsACaserSolves(puzzle, tier));
