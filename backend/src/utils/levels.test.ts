import {describe, expect, it} from "vitest";
import {QUEENS_LEVELS, QUEENS_TUTORIAL} from "./queensLevels.js";
import {solveQueens} from "./queens.js";
import {isLevelUnlocked, levelPuzzle} from "./levels.js";
import {GALAXIES_LEVELS, GALAXIES_TUTORIAL} from "./galaxiesLevels.js";
import {solveGalaxies} from "./galaxies.js";
import {BINERO_LEVELS, BINERO_TUTORIAL} from "./bineroLevels.js";
import {logicalSolve} from "./binero.js";
import {SUDOKU_LEVELS, SUDOKU_TUTORIAL} from "./sudokuLevels.js";
import {countSolutions} from "./sudokuSolver.js";
import {SHIKAKU_LEVELS, SHIKAKU_TUTORIAL} from "./shikakuLevels.js";
import {solveShikaku} from "./shikaku.js";
import {TECTONIC_LEVELS, TECTONIC_TUTORIAL} from "./tectonicLevels.js";
import {solveTectonic} from "./tectonic.js";
import {RIKUDO_LEVELS, RIKUDO_TUTORIAL} from "./rikudoLevels.js";
import {solveRikudo} from "./rikudo.js";
import {TRACE_LEVELS, TRACE_TUTORIAL} from "./traceLevels.js";
import {solveTrace} from "./trace.js";

describe("niveaux du Queens", () => {
    it("1000 niveaux, dont 3 leçons de tutoriel, de 4×4 à 12×12", () => {
        expect(QUEENS_LEVELS).toHaveLength(1000);
        expect(QUEENS_TUTORIAL).toBe(3);
        for (const puzzle of QUEENS_LEVELS) {
            expect(puzzle.size).toBeGreaterThanOrEqual(4);
            expect(puzzle.size).toBeLessThanOrEqual(12);
            expect(puzzle.regions).toHaveLength(puzzle.size * puzzle.size);
            expect(new Set(puzzle.regions).size).toBe(puzzle.size);
        }
        // pas deux fois la même grille
        expect(new Set(QUEENS_LEVELS.map(p => p.regions.join(","))).size).toBe(1000);
    });

    it("une seule solution (leçons, et un niveau sur vingt ensuite)", () => {
        const sample = QUEENS_LEVELS.filter((_, i) => i < QUEENS_TUTORIAL || i % 20 === 0);
        for (const puzzle of sample) expect(solveQueens(puzzle, 2).count).toBe(1);
    }, 60_000);

    it("niveaux numérotés à partir de 1, débloqués un par un", () => {
        expect(levelPuzzle("QUEENS", 1)).toBe(QUEENS_LEVELS[0]);
        expect(levelPuzzle("QUEENS", 0)).toBeUndefined();
        expect(levelPuzzle("QUEENS", 1001)).toBeUndefined();
        expect(levelPuzzle("INCONNU", 1)).toBeUndefined();
        expect(isLevelUnlocked(1, new Set())).toBe(true);
        expect(isLevelUnlocked(3, new Set([1]))).toBe(false);
        expect(isLevelUnlocked(3, new Set([1, 2]))).toBe(true);
    });
});

describe("niveaux des Galaxies", () => {
    it("3 leçons de tutoriel, chacune à solution unique", () => {
        expect(GALAXIES_TUTORIAL).toBe(3);
        expect(GALAXIES_LEVELS.length).toBeGreaterThanOrEqual(GALAXIES_TUTORIAL);
        for (const puzzle of GALAXIES_LEVELS.slice(0, GALAXIES_TUTORIAL)) {
            const {count, aborted} = solveGalaxies(puzzle, 2);
            expect(aborted).toBe(false);
            expect(count).toBe(1);
        }
        expect(levelPuzzle("GALAXIES", 1)).toBe(GALAXIES_LEVELS[0]);
    });
});

describe("niveaux du Binero", () => {
    it("3 leçons de tutoriel, chacune à solution unique", () => {
        expect(BINERO_TUTORIAL).toBe(3);
        expect(BINERO_LEVELS.length).toBeGreaterThanOrEqual(BINERO_TUTORIAL);
        // résolue par déductions sûres : solution unique
        for (const puzzle of BINERO_LEVELS.slice(0, BINERO_TUTORIAL)) expect(logicalSolve(puzzle).solved).toBe(true);
        expect(levelPuzzle("BINERO", 1)).toBe(BINERO_LEVELS[0]);
    });
});

describe("niveaux du Sudoku", () => {
    it("3 leçons de tutoriel, chacune à solution unique", () => {
        expect(SUDOKU_TUTORIAL).toBe(3);
        for (const puzzle of SUDOKU_LEVELS.slice(0, SUDOKU_TUTORIAL)) {
            expect(puzzle).toHaveLength(9);
            expect(countSolutions(puzzle, 2)).toBe(1);
        }
        expect(levelPuzzle("SUDOKU", 1)).toBe(SUDOKU_LEVELS[0]);
    });
});

describe("niveaux du Shikaku", () => {
    it("3 leçons de tutoriel, chacune à solution unique", () => {
        expect(SHIKAKU_TUTORIAL).toBe(3);
        for (const puzzle of SHIKAKU_LEVELS.slice(0, SHIKAKU_TUTORIAL)) {
            const {count, aborted} = solveShikaku(puzzle, 2);
            expect(aborted).toBe(false);
            expect(count).toBe(1);
        }
        expect(levelPuzzle("SHIKAKU", 1)).toBe(SHIKAKU_LEVELS[0]);
    });
});

describe("niveaux du Tectonic", () => {
    it("3 leçons de tutoriel, chacune à solution unique", () => {
        expect(TECTONIC_TUTORIAL).toBe(3);
        for (const puzzle of TECTONIC_LEVELS.slice(0, TECTONIC_TUTORIAL)) {
            const {count, aborted} = solveTectonic(puzzle, {limit: 2});
            expect(aborted).toBe(false);
            expect(count).toBe(1);
        }
        expect(levelPuzzle("TECTONIC", 1)).toBe(TECTONIC_LEVELS[0]);
    });
});

describe("niveaux du Rikudo", () => {
    it("3 leçons de tutoriel, chacune à solution unique", () => {
        expect(RIKUDO_TUTORIAL).toBe(3);
        for (const puzzle of RIKUDO_LEVELS.slice(0, RIKUDO_TUTORIAL)) {
            const {solutions, complete} = solveRikudo(puzzle, 2);
            expect(complete).toBe(true);
            expect(solutions).toHaveLength(1);
        }
        expect(levelPuzzle("RIKUDO", 1)).toBe(RIKUDO_LEVELS[0]);
    });
});

describe("niveaux du Tracé", () => {
    it("3 leçons de tutoriel, chacune à solution unique", () => {
        expect(TRACE_TUTORIAL).toBe(3);
        for (const puzzle of TRACE_LEVELS.slice(0, TRACE_TUTORIAL)) {
            const {count, complete} = solveTrace(puzzle, 2);
            expect(complete).toBe(true);
            expect(count).toBe(1);
        }
        expect(levelPuzzle("TRACE", 1)).toBe(TRACE_LEVELS[0]);
    });
});

describe("1000 niveaux pour chaque jeu de puzzle", () => {
    const games = {
        GALAXIES: [GALAXIES_LEVELS, (p: (typeof GALAXIES_LEVELS)[number]) => solveGalaxies(p, 2, 2_000_000).count],
        BINERO: [BINERO_LEVELS, (p: (typeof BINERO_LEVELS)[number]) => (logicalSolve(p).solved ? 1 : 0)],
        SUDOKU: [SUDOKU_LEVELS, (p: (typeof SUDOKU_LEVELS)[number]) => countSolutions(p, 2)],
        SHIKAKU: [SHIKAKU_LEVELS, (p: (typeof SHIKAKU_LEVELS)[number]) => solveShikaku(p, 2, 2_000_000).count],
        TECTONIC: [TECTONIC_LEVELS, (p: (typeof TECTONIC_LEVELS)[number]) => solveTectonic(p, {limit: 2, maxNodes: 2_000_000}).count],
        RIKUDO: [RIKUDO_LEVELS, (p: (typeof RIKUDO_LEVELS)[number]) => solveRikudo(p, 2, 5_000_000).solutions.length],
        TRACE: [TRACE_LEVELS, (p: (typeof TRACE_LEVELS)[number]) => solveTrace(p, 2, 5_000_000).count],
    } as const;

    for (const [code, [levels, count]] of Object.entries(games)) {
        it(`${code} : 1000 niveaux tous différents, une seule solution (un niveau sur cinquante)`, () => {
            expect(levels).toHaveLength(1000);
            expect(new Set(levels.map(p => JSON.stringify(p))).size).toBe(1000);
            const sample = levels.filter((_, i) => i % 50 === 0);
            for (const puzzle of sample) expect((count as (p: unknown) => number)(puzzle)).toBe(1);
        }, 120_000);
    }
});
