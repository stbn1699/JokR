import {describe, expect, it} from "vitest";
import {countDigits, hasNote, notesAfterPlacing, parseGridValues, sudokuConflicts, toggleNote} from "./gridValues.ts";

const full = Array.from({length: 81}, (_, i) => String((i % 9) + 1));

describe("parseGridValues", () => {
    it("convertit 81 chiffres en grille 9×9", () => {
        const grid = parseGridValues(full);
        expect(grid).toHaveLength(9);
        expect(grid?.[0]).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
        expect(grid?.[8]).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
    });

    it("refuse une case vide", () => {
        const values = [...full];
        values[40] = "";
        expect(parseGridValues(values)).toBeNull();
    });

    it("refuse 0, 10 ou du texte", () => {
        for (const bad of ["0", "10", "a", "1.5"]) {
            const values = [...full];
            values[0] = bad;
            expect(parseGridValues(values)).toBeNull();
        }
    });

    it("refuse un nombre de cases différent de 81", () => {
        expect(parseGridValues(full.slice(1))).toBeNull();
    });
});

describe("countDigits", () => {
    it("compte chaque chiffre et ignore les cases vides", () => {
        const counts = countDigits(["2", "", "2", "9", "", "2"]);
        expect(counts[2]).toBe(3);
        expect(counts[9]).toBe(1);
        expect(counts[5]).toBe(0);
    });

    it("donne 9 partout pour une grille complète", () => {
        expect(countDigits(full).slice(1)).toEqual(Array(9).fill(9));
    });

    it("ignore ce qui n'est pas un chiffre de 1 à 9", () => {
        expect(countDigits(["0", "10", "a"]).reduce((a, b) => a + b, 0)).toBe(0);
    });
});

describe("sudokuConflicts", () => {
    const empty = () => Array<string>(81).fill("");

    it("ne signale rien sans doublon", () => {
        const v = empty();
        v[0] = "5";
        v[10] = "3";
        expect(sudokuConflicts(v).size).toBe(0);
    });

    it("signale un doublon dans une ligne", () => {
        const v = empty();
        v[0] = "5";
        v[8] = "5";
        expect([...sudokuConflicts(v)].sort((a, b) => a - b)).toEqual([0, 8]);
    });

    it("signale un doublon dans une colonne et dans un bloc", () => {
        const v = empty();
        v[4] = "7";
        v[76] = "7"; // même colonne (ligne 8)
        v[0] = "2";
        v[20] = "2"; // même bloc (ligne 2, colonne 2)
        expect([...sudokuConflicts(v)].sort((a, b) => a - b)).toEqual([0, 4, 20, 76]);
    });
});

describe("notes au crayon", () => {
    it("ajoute et retire une note", () => {
        let mask = 0;
        mask = toggleNote(mask, 4);
        mask = toggleNote(mask, 7);
        expect(hasNote(mask, 4)).toBe(true);
        expect(hasNote(mask, 7)).toBe(true);
        mask = toggleNote(mask, 4);
        expect(hasNote(mask, 4)).toBe(false);
    });

    it("poser un chiffre vide les notes de la case et retire ce chiffre des voisines", () => {
        const withFive = toggleNote(toggleNote(0, 5), 2);
        const notes = Array<number>(81).fill(withFive);
        const after = notesAfterPlacing(notes, 40, 5); // case centrale

        expect(after[40]).toBe(0);
        expect(hasNote(after[36]!, 5)).toBe(false); // même ligne
        expect(hasNote(after[4]!, 5)).toBe(false); // même colonne
        expect(hasNote(after[30]!, 5)).toBe(false); // même bloc
        expect(hasNote(after[36]!, 2)).toBe(true); // les autres notes restent
        expect(hasNote(after[0]!, 5)).toBe(true); // case sans rapport
    });

    it("effacer un chiffre ne touche qu'à la case", () => {
        const notes = Array<number>(81).fill(toggleNote(0, 3));
        const after = notesAfterPlacing(notes, 10, null);
        expect(after[10]).toBe(0);
        expect(after[11]).toBe(notes[11]);
    });
});
