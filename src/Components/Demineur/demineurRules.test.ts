import {describe, expect, it} from "vitest";
import {neighbours, planClick} from "./demineurRules.ts";

describe("Démineur : clic", () => {
    // grille 3×3, case centrale = 4, coin = 0
    it("compte les voisines dans les coins et au centre", () => {
        expect(neighbours(0, 3).sort()).toEqual([1, 3, 4]);
        expect(neighbours(4, 3)).toHaveLength(8);
    });

    it("libère une case cachée, mais pas une case avec drapeau", () => {
        expect(planClick(0, 3, new Map(), new Set())).toEqual({kind: "reveal", cells: [0]});
        expect(planClick(0, 3, new Map(), new Set([0]))).toEqual({kind: "none"});
    });

    it("chiffre entouré de ses drapeaux : libère les autres voisines cachées", () => {
        const revealed = new Map([[4, 1], [1, 1], [3, 1]]);
        const plan = planClick(4, 3, revealed, new Set([0]));
        expect(plan).toEqual({kind: "reveal", cells: [2, 5, 6, 7, 8]});
    });

    it("chiffre sans le bon nombre de drapeaux : met en évidence ses cases cachées", () => {
        const revealed = new Map([[4, 2]]);
        const plan = planClick(4, 3, revealed, new Set([0]));
        expect(plan).toEqual({kind: "highlight", cells: [1, 2, 3, 5, 6, 7, 8]});
    });
});
