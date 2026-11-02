import {describe, expect, it} from "vitest";
import {addXp, xpToNextLevel} from "./leveling.js";

// XP totale pour atteindre un niveau en partant du niveau 1
const totalTo = (level: number) => Array.from({length: level - 1}, (_, i) => xpToNextLevel(i + 1)).reduce((a, b) => a + b, 0);

describe("xpToNextLevel", () => {
    it("suit la formule ceil(2050 × (1 − e^(−level / 20)))", () => {
        expect(xpToNextLevel(1)).toBe(100);
        expect(xpToNextLevel(2)).toBe(196);
        expect(xpToNextLevel(10)).toBe(807);
        expect(xpToNextLevel(100)).toBe(2037);
    });

    it("demande toujours plus d'XP, sans dépasser le palier", () => {
        for (let level = 1; level < 300; level++) {
            expect(xpToNextLevel(level + 1)).toBeGreaterThanOrEqual(xpToNextLevel(level));
            expect(xpToNextLevel(level)).toBeLessThanOrEqual(2050);
        }
    });

    it("tient le rythme visé à ~600 XP par jour : niveau 50 en ~3,5 mois, niveau 100 en ~9 mois", () => {
        expect(totalTo(10) / 600).toBeLessThan(8);
        expect(totalTo(50) / 600).toBeGreaterThan(95);
        expect(totalTo(50) / 600).toBeLessThan(115);
        expect(totalTo(100) / 600).toBeGreaterThan(255);
        expect(totalTo(100) / 600).toBeLessThan(285);
    });
});

describe("addXp", () => {
    it("ajoute l'XP sans changer de niveau sous le seuil", () => {
        expect(addXp(1, 0, 99)).toEqual({level: 1, xp: 99});
    });

    it("passe au niveau suivant pile au seuil", () => {
        expect(addXp(1, 0, 100)).toEqual({level: 2, xp: 0});
    });

    it("enchaîne plusieurs niveaux d'un coup", () => {
        // 100 (1→2) + 196 (2→3) + 286 (3→4) = 582, il reste 18
        expect(addXp(1, 0, 600)).toEqual({level: 4, xp: 18});
    });

    it("tient compte de l'XP déjà accumulée", () => {
        expect(addXp(1, 90, 30)).toEqual({level: 2, xp: 20});
    });

    it("ignore un gain négatif", () => {
        expect(addXp(3, 50, -100)).toEqual({level: 3, xp: 50});
    });
});
