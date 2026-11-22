import {describe, expect, it} from "vitest";
import {COLORIA_SIZES, coloriaWidth, generateColoria, isColoriaSolution, solvesByLogic, zoneNeighbours} from "./coloria.js";

function seeded(seed: number) {
    let state = seed;
    return (max: number) => {
        state = (state * 48271) % 2147483647;
        return state % max;
    };
}

// Zones d'un seul tenant : chaque zone est atteignable depuis sa première case
function isContiguous(regions: number[], width: number, zone: number) {
    const cells = regions.flatMap((z, i) => (z === zone ? [i] : []));
    const seen = new Set([cells[0]!]);
    const stack = [cells[0]!];
    while (stack.length) {
        const cell = stack.pop()!;
        const near = [cell % width > 0 ? cell - 1 : -1, cell % width < width - 1 ? cell + 1 : -1, cell - width, cell + width];
        for (const next of near) {
            if (next >= 0 && next < regions.length && regions[next] === zone && !seen.has(next)) {
                seen.add(next);
                stack.push(next);
            }
        }
    }
    return seen.size === cells.length;
}

describe("Coloria", () => {
    it("génère chaque réglage : bon nombre de zones, coloriage juste, résoluble sans deviner", () => {
        const random = seeded(31);
        for (const {size, min, max} of COLORIA_SIZES) {
            for (let k = min; k <= max; k++) {
                const puzzle = generateColoria(size, k, random);
                expect(puzzle.width).toBe(coloriaWidth(size));
                expect(new Set(puzzle.regions).size).toBe(size);
                expect(isColoriaSolution(puzzle, puzzle.solution)).toBe(true);
                expect(puzzle.given.some(color => color === -1)).toBe(true);
                const links = zoneNeighbours(puzzle.regions, puzzle.width, size).map(set => [...set]);
                // 3 couleurs : une seule solution, trouvable sans deviner ; au-delà, rien n'est donné
                if (k === 3) expect(solvesByLogic(puzzle.given, links, k)).toBe(true);
                else expect(puzzle.given.every(color => color === -1)).toBe(true);
                for (let zone = 0; zone < size; zone++) expect(isContiguous(puzzle.regions, puzzle.width, zone)).toBe(true);
            }
        }
    }, 60_000);

    it("refuse un coloriage faux", () => {
        const puzzle = {width: 2, zones: 2, colors: 3, regions: [0, 0, 1, 1], given: [0, -1], solution: [0, 1]};
        expect(isColoriaSolution(puzzle, [0, 1])).toBe(true);
        expect(isColoriaSolution(puzzle, [0, 0])).toBe(false);
        expect(isColoriaSolution(puzzle, [1, 2])).toBe(false);
        expect(isColoriaSolution(puzzle, [0, 3])).toBe(false);
        expect(isColoriaSolution(puzzle, [0])).toBe(false);
        expect(isColoriaSolution(puzzle, "01")).toBe(false);
    });
});
