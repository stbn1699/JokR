import {describe, expect, it} from "vitest";
import {normalizeWord} from "./normalizeWord.js";
import {isAcceptedWord, solutionWords, WORD_LENGTHS} from "./words.js";
import {DEVIMOT_SIZES, scoreGuess} from "./devimot.js";
import {ECHELLE_SIZES, generateEchelle, isEchelleSolution, isOneLetterApart} from "./echelle.js";
import {generateMotsMeles, isMotsMelesSolution, MOTS_MELES_SIZES, readLine} from "./motsMeles.js";

// Générateur reproductible
function seeded(seed: number) {
    let state = seed;
    return (max: number) => {
        state = (state * 48271) % 2147483647;
        return state % max;
    };
}

describe("dictionnaire", () => {
    it("normalise accents et ligatures", () => {
        expect(normalizeWord("été")).toBe("ETE");
        expect(normalizeWord("œuf")).toBe("OEUF");
        expect(normalizeWord("Forêt")).toBe("FORET");
    });

    it("toute solution a la bonne longueur et est acceptée", () => {
        for (const length of WORD_LENGTHS) {
            for (const {key} of solutionWords(length)) {
                expect(key).toHaveLength(length);
                expect(isAcceptedWord(key)).toBe(true);
            }
        }
    });

    it("accepte les formes conjuguées, refuse l'inconnu", () => {
        expect(isAcceptedWord("MANGE")).toBe(true);
        expect(isAcceptedWord("XQZW")).toBe(false);
    });
});

describe("Devimot", () => {
    it("marque les lettres bien et mal placées", () => {
        expect(scoreGuess("TABLE", "TABLE")).toEqual(Array(5).fill("correct"));
        expect(scoreGuess("TABLE", "BLATE")).toEqual(["present", "present", "present", "present", "correct"]);
    });

    it("ne marque une lettre double qu'autant de fois qu'elle existe", () => {
        expect(scoreGuess("PORTE", "POOLS")).toEqual(["correct", "correct", "absent", "absent", "absent"]);
        expect(scoreGuess("ARBRE", "RARES")).toEqual(["present", "present", "present", "present", "absent"]);
    });

    it("propose 4, 5 et 6 lettres", () => {
        expect(DEVIMOT_SIZES.map(s => s.size)).toEqual([4, 5, 6]);
    });
});

describe("Échelle", () => {
    it("génère toutes les difficultés proposées", () => {
        const random = seeded(7);
        for (const limits of ECHELLE_SIZES) {
            for (let par = limits.min; par <= limits.max; par++) {
                const puzzle = generateEchelle(limits.size as 4 | 5 | 6, par, random);
                expect(puzzle.start).toHaveLength(limits.size);
                expect(puzzle.target).not.toBe(puzzle.start);
            }
        }
    });

    it("vérifie un chemin", () => {
        const puzzle = {length: 4 as const, start: "CHAT", target: "CHAR", par: 1};
        expect(isOneLetterApart("CHAT", "CHAR")).toBe(true);
        expect(isOneLetterApart("CHAT", "CHOU")).toBe(false);
        expect(isEchelleSolution(puzzle, ["CHAT", "CHAR"])).toBe(true);
        expect(isEchelleSolution(puzzle, ["CHAT", "XHAT", "CHAR"])).toBe(false);
        expect(isEchelleSolution(puzzle, ["CHAR"])).toBe(false);
        expect(isEchelleSolution(puzzle, "CHAT")).toBe(false);
    });
});

describe("Mots mêlés", () => {
    it("place tous les mots, jusqu'aux grilles les plus chargées", () => {
        const random = seeded(11);
        for (const limits of MOTS_MELES_SIZES) {
            for (let i = 0; i < 20; i++) {
                const puzzle = generateMotsMeles(limits.size, limits.max, random);
                expect(puzzle.letters).toHaveLength(limits.size * limits.size);
                expect(puzzle.words).toHaveLength(limits.max);
                expect(findAll(puzzle)).not.toBeNull();
            }
        }
    });

    it("lit une ligne et refuse une sélection non alignée", () => {
        const puzzle = {size: 3, letters: "ABCDEFGHI", words: ["AEI"]};
        expect(readLine(puzzle, 0, 8)).toBe("AEI");
        expect(readLine(puzzle, 8, 0)).toBe("IEA");
        expect(readLine(puzzle, 0, 5)).toBeNull();
        expect(isMotsMelesSolution(puzzle, [{word: "AEI", from: 8, to: 0}])).toBe(true);
        expect(isMotsMelesSolution(puzzle, [{word: "AEI", from: 0, to: 2}])).toBe(false);
        expect(isMotsMelesSolution(puzzle, [])).toBe(false);
    });
});

// Retrouve chaque mot dans la grille, comme un joueur
function findAll(puzzle: { size: number; letters: string; words: string[] }) {
    const found = puzzle.words.map(word => {
        for (let from = 0; from < puzzle.letters.length; from++) {
            for (let to = 0; to < puzzle.letters.length; to++) {
                if (readLine(puzzle, from, to) === word) return {word, from, to};
            }
        }
        return null;
    });
    return found.every(Boolean) && isMotsMelesSolution(puzzle, found) ? found : null;
}
