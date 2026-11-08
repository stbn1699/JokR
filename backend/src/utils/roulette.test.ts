import {describe, expect, it} from "vitest";
import {
    cornerKey,
    parseRouletteBets,
    rouletteCorner,
    rouletteNeighbors,
    rouletteNumbers,
    ROULETTE_WHEEL,
    rouletteColor,
    roulettePayout,
    rouletteRule,
    rouletteWinningKeys,
    ROULETTE_BETTING_MS,
    ROULETTE_ROUND_MS,
    rouletteBettingOpen,
    rouletteClosesAt,
    rouletteEndsAt,
    rouletteRoundAt,
    splitKey,
} from "./roulette.js";

describe("roulette", () => {
    it("la roue a les 37 cases, chacune une fois, 18 rouges et 18 noires", () => {
        expect([...ROULETTE_WHEEL].sort((a, b) => a - b)).toEqual(Array.from({length: 37}, (_, i) => i));
        const colors = ROULETTE_WHEEL.map(rouletteColor);
        expect(colors.filter(c => c === "red")).toHaveLength(18);
        expect(colors.filter(c => c === "black")).toHaveLength(18);
        // sur la roue, rouge et noir alternent
        for (let i = 1; i < 36; i++) expect(colors[i]).not.toBe(colors[i + 1]);
    });

    it("paie un numéro 35 fois la mise (plus la mise)", () => {
        expect(roulettePayout([{key: "n:17", amount: 10}], 17)).toBe(360);
        expect(roulettePayout([{key: "n:17", amount: 10}], 18)).toBe(0);
        expect(roulettePayout([{key: "n:0", amount: 10}], 0)).toBe(360);
    });

    it("paie les chances simples, douzaines et colonnes ; le zéro les fait perdre", () => {
        const bets = [
            {key: "red", amount: 10}, {key: "odd", amount: 10}, {key: "low", amount: 10},
            {key: "dozen:1", amount: 10}, {key: "column:1", amount: 10},
        ];
        // 1 : rouge, impair, 1-18, 1re douzaine, 1re colonne
        expect(roulettePayout(bets, 1)).toBe(20 * 3 + 30 * 2);
        expect(rouletteWinningKeys(bets, 1)).toHaveLength(5);
        // 0 : tout est perdu
        expect(roulettePayout(bets, 0)).toBe(0);
        expect(rouletteRule("even")!.wins(0)).toBe(false);
        // 36 : rouge, pair, 19-36, 3e douzaine, 3e colonne
        expect(rouletteWinningKeys([{key: "column:3", amount: 10}, {key: "dozen:3", amount: 10}], 36)).toEqual(["column:3", "dozen:3"]);
    });

    it("paie à cheval 17 fois la mise et le carré 8 fois", () => {
        expect(roulettePayout([{key: "split:17-20", amount: 10}], 20)).toBe(180);
        expect(roulettePayout([{key: "split:17-20", amount: 10}], 18)).toBe(0);
        expect(roulettePayout([{key: "split:0-2", amount: 10}], 0)).toBe(180);
        expect(roulettePayout([{key: "corner:17", amount: 10}], 21)).toBe(90);
        expect(roulettePayout([{key: "corner:17", amount: 10}], 19)).toBe(0);
    });

    it("n'accepte à cheval que des voisins du tapis, et que de vrais carrés", () => {
        expect(rouletteNeighbors(17, 20)).toBe(true); // même ligne
        expect(rouletteNeighbors(17, 18)).toBe(true); // même colonne
        expect(rouletteNeighbors(18, 19)).toBe(false); // 18 en haut, 19 en bas de la colonne suivante
        expect(rouletteNeighbors(0, 3)).toBe(true);
        expect(rouletteNeighbors(0, 4)).toBe(false);
        expect(rouletteNeighbors(34, 37)).toBe(false);
        expect(rouletteNumbers("split:20-17")).toBeUndefined(); // petit numéro d'abord
        expect(rouletteNumbers(splitKey(20, 17))).toEqual([17, 20]);
        expect(rouletteCorner(17)).toEqual([17, 18, 20, 21]);
        expect(rouletteCorner(18)).toBeUndefined(); // 18 est en haut de sa colonne
        expect(rouletteCorner(33)).toBeUndefined();
        expect(rouletteNumbers(cornerKey(32))).toEqual([32, 33, 35, 36]);
        expect(rouletteRule("split:1-5")).toBeUndefined();
        expect(rouletteRule("corner:3")).toBeUndefined();
    });

    it("rend 36/37 des mises en moyenne, quelle que soit la mise", () => {
        for (const key of ["n:7", "split:8-11", "split:0-1", "corner:14", "red", "even", "high", "dozen:2", "column:3"]) {
            let total = 0;
            for (let n = 0; n <= 36; n++) total += roulettePayout([{key, amount: 10}], n);
            expect(total / 37 / 10).toBeCloseTo(36 / 37, 10);
        }
    });

    it("vérifie les jetons et les garde un par un", () => {
        expect(parseRouletteBets([{key: "red", amount: 10}, {key: "red", amount: 20}, {key: "n:5", amount: 50}]))
            .toEqual([{key: "red", amount: 10}, {key: "red", amount: 20}, {key: "n:5", amount: 50}]);
        // pas un vrai jeton
        expect(parseRouletteBets([{key: "red", amount: 30}])).toBeTypeOf("string");
        // limite par case : sur le total des jetons de la case
        expect(parseRouletteBets([...Array(5)].map(() => ({key: "red", amount: 500})))).toBeTypeOf("string");
        expect(parseRouletteBets([])).toBeTypeOf("string");
        expect(parseRouletteBets([{key: "n:37", amount: 10}])).toBeTypeOf("string");
        expect(parseRouletteBets([{key: "toString", amount: 10}])).toBeTypeOf("string");
        expect(parseRouletteBets([{key: "red", amount: 15}])).toBeTypeOf("string");
        expect(parseRouletteBets([{key: "red", amount: -10}])).toBeTypeOf("string");
        expect(parseRouletteBets([{key: "red", amount: 2010}])).toBeTypeOf("string");
        expect(parseRouletteBets(null)).toBeTypeOf("string");
    });

    it("découpe le temps en tours de 30 s : 20 s de mises, puis la roue", () => {
        const start = 1_000 * ROULETTE_ROUND_MS;
        expect(rouletteRoundAt(start)).toBe(1000);
        expect(rouletteRoundAt(start + ROULETTE_ROUND_MS - 1)).toBe(1000);
        expect(rouletteClosesAt(1000)).toBe(start + ROULETTE_BETTING_MS);
        expect(rouletteEndsAt(1000)).toBe(start + ROULETTE_ROUND_MS);
        expect(rouletteBettingOpen(1000, start + ROULETTE_BETTING_MS - 1)).toBe(true);
        expect(rouletteBettingOpen(1000, start + ROULETTE_BETTING_MS)).toBe(false);
    });
});
