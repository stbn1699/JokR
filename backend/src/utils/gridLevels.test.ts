import {describe, expect, it} from "vitest";
import {
    BOUCHON_LEVELS, BOUCLE_LEVELS, COLORIA_LEVELS, DEMINEUR_LEVELS, DEVIMOT_LEVELS, ECHELLE_LEVELS, GRID_TUTORIAL, LIENS_LEVELS,
    MOTS_A_CASER_LEVELS, MOTS_MELES_LEVELS, PATURAGES_LEVELS, TUYAUX_LEVELS,
} from "./gridLevels.js";
import {LEVEL_GAMES, levelPuzzle} from "./levels.js";
import {GRID_GAMES} from "../services/gridGames.js";
import {isColoriaSolution} from "./coloria.js";
import {isTuyauxSolution, isTuyauxSolved, rotateTile} from "./tuyaux.js";
import {isLiensSolution} from "./liens.js";
import {exploreParking} from "./bouchon.js";
import {isPaturagesSolution} from "./paturages.js";
import {isBoucleSolution} from "./boucle.js";
import {neighbours} from "./demineur.js";
import {isAcceptedWord, ladderWords, type WordLength} from "./words.js";
import {readLine} from "./motsMeles.js";
import {isMotsACaserSolution, wordSlots} from "./motsACaser.js";
import {coloriaTier, demineurTier, liensTier, motsACaserTier, paturagesTier, type Tier, tuyauxTier} from "./gridLevelGuides.js";

/*
 * Niveaux des jeux ajoutés depuis 3.3 : 1000 par jeu, grilles valides, une seule solution quand le jeu l'exige,
 * et une difficulté qui monte doucement après le tutoriel (le guide de Boucle est testé côté site :
 * src/Components/Lessons/boucleLevels.test.ts).
 */

const ALL = {
    COLORIA: COLORIA_LEVELS, TUYAUX: TUYAUX_LEVELS, LIENS: LIENS_LEVELS, BOUCHON: BOUCHON_LEVELS, PATURAGES: PATURAGES_LEVELS,
    BOUCLE: BOUCLE_LEVELS, DEMINEUR: DEMINEUR_LEVELS, DEVIMOT: DEVIMOT_LEVELS, ECHELLE: ECHELLE_LEVELS, MOTSMELES: MOTS_MELES_LEVELS,
    MOTSACASER: MOTS_A_CASER_LEVELS,
} as const;

// Moyenne d'une mesure par tranche de 100 niveaux après le tutoriel : elle ne redescend jamais
function blockAverages<P>(levels: readonly P[], measure: (p: P) => number): number[] {
    const out: number[] = [];
    for (let from = GRID_TUTORIAL; from < levels.length; from += 100) {
        const block = levels.slice(from, from + 100);
        out.push(block.reduce((sum, p) => sum + measure(p), 0) / block.length);
    }
    return out;
}
const expectRising = (values: number[]) => values.forEach((v, i) => expect(v).toBeGreaterThanOrEqual(values[i - 1] ?? v));

// Palier du guide : après le tutoriel, seulement les techniques des leçons jusqu'à `taught`, puis jamais au-delà du palier 3
function expectTiers<P>(levels: readonly P[], tier: (p: P) => Tier | null, taught: number) {
    const lessons = levels.slice(0, GRID_TUTORIAL).map(tier);
    lessons.forEach(t => expect(t).not.toBeNull());
    const hardestLesson = Math.max(...lessons.map(Number));
    const tiers = levels.slice(GRID_TUTORIAL, taught).map(tier);
    // les premiers niveaux : jamais plus dur que la leçon la plus dure
    tiers.slice(0, 50).forEach(t => expect(t).toBeLessThanOrEqual(hardestLesson));
    tiers.forEach(t => expect(t === 1 || t === 2).toBe(true));
}

const sample = <P>(levels: readonly P[], every: number) => levels.filter((_, i) => i >= GRID_TUTORIAL && i % every === 0);

describe("niveaux des jeux ajoutés depuis 3.3", () => {
    it("1000 niveaux par jeu, dont les 3 leçons, tous différents, que chaque jeu sait charger", () => {
        for (const [code, levels] of Object.entries(ALL)) {
            expect(levels).toHaveLength(1000);
            expect(LEVEL_GAMES[code]!.levels).toBe(levels);
            expect(LEVEL_GAMES[code]!.tutorial).toBe(GRID_TUTORIAL);
            expect(new Set(levels.map(p => JSON.stringify(p))).size).toBe(1000);
            const def = GRID_GAMES[code as keyof typeof GRID_GAMES];
            for (const level of [1, 4, 5, 500, 1000]) {
                const puzzle = levelPuzzle(code, level);
                expect(() => def.view(def.load(puzzle) as never)).not.toThrow();
                expect(LEVEL_GAMES[code]!.describe(puzzle).size).toBeGreaterThan(0);
            }
        }
    });

    it("Coloria : solution juste, une seule solution, techniques du tutoriel jusqu'au niveau 400", () => {
        for (const p of COLORIA_LEVELS) {
            expect(p.colors).toBe(3);
            expect(p.regions).toHaveLength(p.width * p.width);
            expect(new Set(p.regions).size).toBe(p.zones);
            expect(isColoriaSolution(p, p.solution)).toBe(true);
        }
        for (const p of sample(COLORIA_LEVELS, 5)) expect(coloriaTier(p)).not.toBeNull();
        expectTiers(COLORIA_LEVELS, coloriaTier, 400);
        expectRising(blockAverages(COLORIA_LEVELS, p => p.zones));
    }, 120_000);

    it("Tuyaux : solution juste, une seule orientation, techniques du tutoriel jusqu'au niveau 550", () => {
        for (const p of TUYAUX_LEVELS) {
            const turns = p.tiles.map((tile, cell) => [0, 1, 2, 3].find(t => rotateTile(tile, t) === p.solution[cell])!);
            expect(isTuyauxSolution(p, turns)).toBe(true);
            expect(isTuyauxSolved(p.tiles, p.size)).toBe(false);
        }
        for (const p of sample(TUYAUX_LEVELS, 5)) expect(tuyauxTier(p)).not.toBeNull();
        expectTiers(TUYAUX_LEVELS, tuyauxTier, 550);
        expectRising(blockAverages(TUYAUX_LEVELS, p => p.size));
    }, 120_000);

    it("Liens : solution juste, une seule façon de relier, techniques du tutoriel jusqu'au niveau 550", () => {
        for (const p of LIENS_LEVELS) expect(isLiensSolution(p, p.solution)).toBe(true);
        for (const p of sample(LIENS_LEVELS, 10)) expect(liensTier(p)).not.toBeNull();
        expectTiers(LIENS_LEVELS, liensTier, 550);
        expectRising(blockAverages(LIENS_LEVELS, p => p.size));
    }, 240_000);

    it("Bouchon : le taxi sur la ligne de sortie, le nombre de coups annoncé est le plus court", () => {
        for (const p of BOUCHON_LEVELS) expect(p.vehicles[0]!.row).toBe(p.exitRow);
        for (const p of sample(BOUCHON_LEVELS, 20)) expect(exploreParking(p.size, p.vehicles, 200_000)!.distance[0]).toBe(p.minMoves);
        expect(BOUCHON_LEVELS[GRID_TUTORIAL]!.minMoves).toBeLessThanOrEqual(BOUCHON_LEVELS[GRID_TUTORIAL - 1]!.minMoves);
        expectRising(blockAverages(BOUCHON_LEVELS, p => p.minMoves));
    }, 120_000);

    it("Pâturages : découpage juste, un seul découpage, techniques du tutoriel jusqu'au niveau 550", () => {
        for (const p of PATURAGES_LEVELS) expect(isPaturagesSolution(p, p.solution)).toBe(true);
        for (const p of sample(PATURAGES_LEVELS, 5)) expect(paturagesTier(p)).not.toBeNull();
        expectTiers(PATURAGES_LEVELS, paturagesTier, 550);
        expectRising(blockAverages(PATURAGES_LEVELS, p => p.size));
    }, 120_000);

    it("Boucle : la boucle de la solution évite les murs", () => {
        for (const p of BOUCLE_LEVELS) expect(isBoucleSolution(p, p.solution)).toBe(true);
        expectRising(blockAverages(BOUCLE_LEVELS, p => p.size));
    });

    it("Démineur : départ sans mine voisine, tout se déduit sans deviner, techniques du tutoriel jusqu'au niveau 550", () => {
        for (const p of DEMINEUR_LEVELS) {
            const mined = new Set(p.mines);
            expect(mined.size).toBe(p.mineCount);
            expect(mined.has(p.start) || neighbours(p.start, p.size).some(n => mined.has(n))).toBe(false);
        }
        for (const p of sample(DEMINEUR_LEVELS, 2)) expect(demineurTier(p)).not.toBeNull();
        expectTiers(DEMINEUR_LEVELS, demineurTier, 550);
        expectRising(blockAverages(DEMINEUR_LEVELS, p => p.size));
    }, 120_000);

    it("Devimot : des mots du dictionnaire, tous différents, de moins en moins d'essais", () => {
        for (const p of DEVIMOT_LEVELS) {
            expect(p.secret).toHaveLength(p.length);
            expect(isAcceptedWord(p.secret)).toBe(true);
        }
        expect(new Set(DEVIMOT_LEVELS.map(p => p.secret)).size).toBe(1000);
        const attempts = blockAverages(DEVIMOT_LEVELS, p => -p.maxAttempts);
        expectRising(attempts);
        // pas de lettre double dans les premiers niveaux
        for (const p of DEVIMOT_LEVELS.slice(GRID_TUTORIAL, 103)) expect(new Set(p.secret).size).toBe(p.length);
    });

    it("Échelle : l'arrivée est à exactement `par` étapes, sans détour au début", () => {
        const words = Object.fromEntries([4, 5, 6].map(n => [n, new Set(ladderWords(n as WordLength))]));
        const distance = (start: string, target: string) => {
            const seen = new Map([[start, 0]]);
            const queue = [start];
            for (let i = 0; i < queue.length && !seen.has(target); i++) {
                const word = queue[i]!;
                for (let at = 0; at < word.length; at++) {
                    for (const letter of "ABCDEFGHIJKLMNOPQRSTUVWXYZ") {
                        const next = word.slice(0, at) + letter + word.slice(at + 1);
                        if (words[word.length]!.has(next) && !seen.has(next)) {
                            seen.set(next, seen.get(word)! + 1);
                            queue.push(next);
                        }
                    }
                }
            }
            return seen.get(target);
        };
        for (const p of sample(ECHELLE_LEVELS, 3)) expect(distance(p.start, p.target)).toBe(p.par);
        const hamming = (a: string, b: string) => [...a].filter((c, i) => c !== b[i]).length;
        for (const p of ECHELLE_LEVELS.slice(GRID_TUTORIAL, 253)) expect(hamming(p.start, p.target)).toBe(p.par);
        expectRising(blockAverages(ECHELLE_LEVELS, p => p.par));
    }, 120_000);

    it("Mots mêlés : chaque mot est dans la grille, une seule fois", () => {
        for (const p of MOTS_MELES_LEVELS) {
            expect(p.letters).toHaveLength(p.size * p.size);
            for (const word of p.words) expect(isAcceptedWord(word) || word.length < 4 || word.length > 6).toBe(true);
        }
        for (const p of sample(MOTS_MELES_LEVELS, 4)) {
            const total = p.size * p.size;
            for (const word of p.words) {
                let found = 0;
                for (let from = 0; from < total; from++) {
                    for (let to = 0; to < total; to++) if (from !== to && readLine(p, from, to) === word) found++;
                }
                expect(found).toBe(1);
            }
        }
        expectRising(blockAverages(MOTS_MELES_LEVELS, p => p.size * 100 + p.words.length));
        // les lettres de remplissage ne forment pas de mot grossier, dans aucun sens
        const crude = ["MERDE", "BITE", "PUTE", "NIQUE", "CONNE", "SALOPE", "PUTAIN", "CHIER", "FOUTRE", "SEXE", "PENIS", "NAZI"];
        for (const p of MOTS_MELES_LEVELS) {
            const total = p.size * p.size;
            for (let from = 0; from < total; from++) {
                for (let to = 0; to < total; to++) {
                    const line = from === to ? null : readLine(p, from, to);
                    if (line && line.length >= 4 && line.length <= 6) expect(crude).not.toContain(line);
                }
            }
        }
    }, 120_000);

    it("Mots à caser : grille juste, une seule façon de caser la liste, techniques du tutoriel jusqu'au niveau 400", () => {
        for (const p of MOTS_A_CASER_LEVELS) expect(isMotsACaserSolution(p, p.solution)).toBe(true);
        // le guide, ou (grandes grilles au-delà du guide) une recherche de toutes les façons de caser la liste
        for (const p of sample(MOTS_A_CASER_LEVELS, 10)) {
            if (motsACaserTier(p) === null) expect(countFills(p.cells, p.size, p.words)).toBe(1);
        }
        expectTiers(MOTS_A_CASER_LEVELS, motsACaserTier, 400);
        // de plus en plus de lettres à placer
        expectRising(blockAverages(MOTS_A_CASER_LEVELS, p => [...p.cells].filter(c => c === ".").length));
    }, 240_000);
});

// Nombre de façons de caser la liste (s'arrête à 2)
function countFills(cells: string, size: number, words: readonly string[]): number {
    const slots = wordSlots(cells, size);
    const grid = [...cells];
    const left = new Map<string, number>();
    for (const word of words) left.set(word, (left.get(word) ?? 0) + 1);
    const open = new Set<number>();
    slots.forEach((slot, k) => {
        const text = slot.map(c => grid[c]).join("");
        if (!text.includes(".") && (left.get(text) ?? 0) > 0) left.set(text, left.get(text)! - 1);
        else open.add(k);
    });
    let solutions = 0;
    const fits = (slot: number[], word: string) => word.length === slot.length && slot.every((c, i) => grid[c] === "." || grid[c] === word[i]);
    const search = (): void => {
        if (solutions > 1) return;
        if (open.size === 0) return void solutions++;
        let best = -1, options: string[] = [];
        for (const k of open) {
            const list = [...left].filter(([w, n]) => n > 0 && fits(slots[k]!, w)).map(([w]) => w);
            if (list.length === 0) return;
            if (best < 0 || list.length < options.length) {
                best = k;
                options = list;
            }
        }
        open.delete(best);
        for (const word of options) {
            const written: number[] = [];
            slots[best]!.forEach((c, i) => {
                if (grid[c] === ".") {
                    grid[c] = word[i]!;
                    written.push(c);
                }
            });
            left.set(word, left.get(word)! - 1);
            search();
            left.set(word, left.get(word)! + 1);
            written.forEach(c => { grid[c] = "."; });
        }
        open.add(best);
    };
    search();
    return solutions;
}
