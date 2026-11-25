import {describe, expect, it} from "vitest";
import {
    BOUCHON_LESSONS, BOUCLE_LESSONS, COLORIA_LESSONS, DEMINEUR_LESSONS, DEVIMOT_LESSONS, ECHELLE_LESSONS, LIENS_LESSONS,
    MOTS_A_CASER_LESSONS, MOTS_MELES_LESSONS, PATURAGES_LESSONS, TUYAUX_LESSONS,
} from "./gridLessons.js";
import {LEVEL_GAMES, levelPuzzle} from "./levels.js";
import {isColoriaSolution, zoneNeighbours} from "./coloria.js";
import {isTuyauxSolution, isTuyauxSolved, rotateTile} from "./tuyaux.js";
import {isLiensSolution} from "./liens.js";
import {exploreParking} from "./bouchon.js";
import {isPaturagesSolution, isUniquePaturages} from "./paturages.js";
import {isBoucleSolution} from "./boucle.js";
import {neighbours} from "./demineur.js";
import {isAcceptedWord, ladderWords, type WordLength} from "./words.js";
import {isMotsACaserSolution, wordSlots} from "./motsACaser.js";
import {readLine} from "./motsMeles.js";
import {GRID_GAMES} from "../services/gridGames.js";

const side = (size: number) => (cell: number) => {
    const row = Math.floor(cell / size), col = cell % size;
    return [row > 0 ? cell - size : -1, col < size - 1 ? cell + 1 : -1, row < size - 1 ? cell + size : -1, col > 0 ? cell - 1 : -1].filter(c => c >= 0);
};

describe("leçons des jeux ajoutés depuis 3.3", () => {
    it("3 leçons par jeu, qui forment le tutoriel (niveaux 1 à 3), et chaque jeu sait les charger", () => {
        for (const code of Object.keys(GRID_GAMES)) {
            const game = LEVEL_GAMES[code]!;
            expect(game.levels.length).toBeGreaterThan(3);
            expect(game.tutorial).toBe(3);
            for (let level = 1; level <= 3; level++) {
                const puzzle = levelPuzzle(code, level);
                const def = GRID_GAMES[code as keyof typeof GRID_GAMES];
                expect(() => def.view(def.load(puzzle) as never)).not.toThrow();
            }
        }
    });

    it("Coloria : une seule façon de colorier", () => {
        for (const p of COLORIA_LESSONS) {
            expect(isColoriaSolution(p, p.solution)).toBe(true);
            const links = zoneNeighbours(p.regions, p.width, p.zones);
            let count = 0;
            const colors = [...p.given];
            const fill = (zone: number) => {
                if (zone === p.zones) return void count++;
                const options = p.given[zone]! >= 0 ? [p.given[zone]!] : [0, 1, 2];
                for (const color of options) {
                    if ([...links[zone]!].some(other => other < zone && colors[other] === color)) continue;
                    colors[zone] = color;
                    fill(zone + 1);
                }
            };
            fill(0);
            expect(count).toBe(1);
        }
    });

    it("Tuyaux : une seule orientation juste, et rien n'est résolu au départ", () => {
        for (const p of TUYAUX_LESSONS) {
            const turns = p.tiles.map((tile, cell) => [0, 1, 2, 3].find(t => rotateTile(tile, t) === p.solution[cell])!);
            expect(isTuyauxSolution(p, turns)).toBe(true);
            expect(isTuyauxSolved(p.tiles, p.size)).toBe(false);
            const options = p.tiles.map(tile => [...new Set([0, 1, 2, 3].map(t => rotateTile(tile, t)))]);
            const masks = [...p.tiles];
            let count = 0;
            const fits = (cell: number) => {
                const row = Math.floor(cell / p.size), col = cell % p.size, m = masks[cell]!;
                if ((row === 0 && m & 1) || (col === 0 && m & 8) || (row === p.size - 1 && m & 4) || (col === p.size - 1 && m & 2)) return false;
                if (row > 0 && Boolean(m & 1) !== Boolean(masks[cell - p.size]! & 4)) return false;
                return !(col > 0 && Boolean(m & 8) !== Boolean(masks[cell - 1]! & 2));
            };
            const place = (cell: number) => {
                if (cell === masks.length) return void (isTuyauxSolved(masks, p.size) && count++);
                for (const mask of options[cell]!) {
                    masks[cell] = mask;
                    if (fits(cell)) place(cell + 1);
                }
            };
            place(0);
            expect(count).toBe(1);
        }
    });

    it("Liens : une seule façon de relier les paires", () => {
        for (const p of LIENS_LESSONS) {
            expect(isLiensSolution(p, p.solution)).toBe(true);
            const next = side(p.size);
            const used = new Uint8Array(p.size * p.size);
            p.pairs.flat().forEach(cell => { used[cell] = 1; });
            let count = 0;
            const draw = (pair: number, head: number, filled: number) => {
                if (pair === p.pairs.length) return void (filled === used.length && count++);
                for (const cell of next(head)) {
                    if (cell === p.pairs[pair]![1]) draw(pair + 1, p.pairs[pair + 1]?.[0] ?? -1, filled);
                    else if (!used[cell]) {
                        used[cell] = 1;
                        draw(pair, cell, filled + 1);
                        used[cell] = 0;
                    }
                }
            };
            draw(0, p.pairs[0]![0], p.pairs.length * 2);
            expect(count).toBe(1);
        }
    });

    it("Bouchon : le nombre de coups annoncé est le plus court", () => {
        for (const p of BOUCHON_LESSONS) {
            expect(p.vehicles[0]!.row).toBe(p.exitRow);
            expect(exploreParking(p.size, p.vehicles, 100_000)!.distance[0]).toBe(p.minMoves);
        }
    });

    it("Pâturages : un seul découpage", () => {
        for (const p of PATURAGES_LESSONS) {
            expect(isPaturagesSolution(p, p.solution)).toBe(true);
            expect(isUniquePaturages(p.size, p.cows)).toBe(true);
        }
    });

    it("Boucle : une seule boucle", () => {
        for (const p of BOUCLE_LESSONS) {
            expect(isBoucleSolution(p, p.solution)).toBe(true);
            const walls = new Set(p.walls.map(([a, b]) => `${Math.min(a, b)}-${Math.max(a, b)}`));
            const next = (cell: number) => side(p.size)(cell).filter(other => !walls.has(`${Math.min(cell, other)}-${Math.max(cell, other)}`));
            const seen = new Uint8Array(p.size * p.size);
            let count = 0;
            const walk = (cell: number, length: number) => {
                if (length === seen.length) return void (next(cell).includes(0) && count++);
                for (const other of next(cell)) {
                    if (seen[other]) continue;
                    seen[other] = 1;
                    walk(other, length + 1);
                    seen[other] = 0;
                }
            };
            seen[0] = 1;
            walk(0, 1);
            // chaque boucle est parcourue dans les deux sens
            expect(count).toBe(2);
        }
    });

    it("Démineur : départ sans mine voisine, puis tout se déduit sans deviner", () => {
        for (const {size, mineCount, mines, start} of DEMINEUR_LESSONS) {
            const mined = new Set(mines);
            expect(mined.size).toBe(mineCount);
            const count = (cell: number) => neighbours(cell, size).filter(n => mined.has(n)).length;
            expect(mined.has(start) || count(start) > 0).toBe(false);
            const open = new Set<number>(), flags = new Set<number>();
            const reveal = (cell: number) => {
                const queue = [cell];
                while (queue.length) {
                    const c = queue.pop()!;
                    if (open.has(c)) continue;
                    expect(mined.has(c)).toBe(false);
                    open.add(c);
                    if (count(c) === 0) queue.push(...neighbours(c, size));
                }
            };
            const hidden = (cell: number) => neighbours(cell, size).filter(n => !open.has(n) && !flags.has(n));
            const left = (cell: number) => count(cell) - neighbours(cell, size).filter(n => flags.has(n)).length;
            reveal(start);
            for (let guard = 0; open.size < size * size - mineCount && guard < 100; guard++) {
                const numbers = [...open].filter(c => hidden(c).length > 0);
                const simple = numbers.find(c => left(c) === 0 || left(c) === hidden(c).length);
                if (simple !== undefined) {
                    if (left(simple) === 0) hidden(simple).forEach(reveal);
                    else hidden(simple).forEach(c => flags.add(c));
                    continue;
                }
                // deux nombres dont les cases cachées s'emboîtent
                const pair = numbers.flatMap(a => numbers.map(b => [a, b] as const))
                    .find(([a, b]) => a !== b && hidden(a).every(c => hidden(b).includes(c)) && left(a) === left(b) && hidden(b).length > hidden(a).length);
                expect(pair).toBeDefined();
                const [a, b] = pair!;
                hidden(b).filter(c => !hidden(a).includes(c)).forEach(reveal);
            }
            expect(open.size).toBe(size * size - mineCount);
        }
    });

    it("Devimot : des mots du dictionnaire", () => {
        for (const p of DEVIMOT_LESSONS) {
            expect(p.secret).toHaveLength(p.length);
            expect(isAcceptedWord(p.secret)).toBe(true);
        }
        // mots proposés par la bulle des leçons
        for (const word of ["LION", "TRAIN", "PORTE"]) expect(isAcceptedWord(word)).toBe(true);
    });

    it("Échelle : l'arrivée est à exactement `par` étapes", () => {
        for (const p of ECHELLE_LESSONS) {
            const words = new Set(ladderWords(p.length as WordLength));
            const distance = new Map([[p.start, 0]]);
            const queue = [p.start];
            for (let i = 0; i < queue.length && !distance.has(p.target); i++) {
                const word = queue[i]!;
                for (let at = 0; at < word.length; at++) {
                    for (const letter of "ABCDEFGHIJKLMNOPQRSTUVWXYZ") {
                        const next = word.slice(0, at) + letter + word.slice(at + 1);
                        if (words.has(next) && !distance.has(next)) {
                            distance.set(next, distance.get(word)! + 1);
                            queue.push(next);
                        }
                    }
                }
            }
            expect(distance.get(p.target)).toBe(p.par);
        }
    });

    it("Mots mêlés : chaque mot est dans la grille, une seule fois", () => {
        for (const p of MOTS_MELES_LESSONS) {
            expect(p.letters).toHaveLength(p.size * p.size);
            const total = p.size * p.size;
            for (const word of p.words) {
                let found = 0;
                for (let from = 0; from < total; from++) {
                    for (let to = 0; to < total; to++) if (from !== to && readLine(p, from, to) === word) found++;
                }
                expect(found).toBe(1);
            }
        }
    });

    it("Mots à caser : une seule façon de caser la liste", () => {
        for (const p of MOTS_A_CASER_LESSONS) {
            expect(isMotsACaserSolution(p, p.solution)).toBe(true);
            const slots = wordSlots(p.solution, p.size);
            const grid: (string | null)[] = Array.from(p.cells, c => (c === "." ? null : c));
            const used = new Array<boolean>(p.words.length).fill(false);
            let count = 0;
            const fill = (index: number) => {
                if (index === slots.length) return void count++;
                const slot = slots[index]!;
                p.words.forEach((word, w) => {
                    if (used[w] || word.length !== slot.length || !slot.every((c, k) => grid[c] === null || grid[c] === word[k])) return;
                    const before = slot.map(c => grid[c]!);
                    slot.forEach((c, k) => { grid[c] = word[k]!; });
                    used[w] = true;
                    fill(index + 1);
                    used[w] = false;
                    slot.forEach((c, k) => { grid[c] = before[k] ?? null; });
                });
            };
            fill(0);
            expect(count).toBe(1);
        }
    });
});
