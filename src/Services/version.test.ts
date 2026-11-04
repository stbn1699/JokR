import {describe, expect, it} from "vitest";
import {compareVersions, isNewSince, versionsSince} from "./version.ts";

describe("version", () => {
    it("compare les versions chiffre par chiffre", () => {
        expect(compareVersions("1.6.0", "1.7.0")).toBeLessThan(0);
        expect(compareVersions("1.10.0", "1.9.0")).toBeGreaterThan(0);
        expect(compareVersions("1.5.0", "1.5.0")).toBe(0);
        expect(compareVersions("2.0.0", "1.99.99")).toBeGreaterThan(0);
    });

    it("garde les versions sorties depuis la dernière visite, jusqu'à la version en cours", () => {
        const versions = [{version: "1.8.0"}, {version: "1.7.0"}, {version: "1.6.0"}, {version: "1.5.0"}];
        expect(versionsSince(versions, "1.5.0", "1.7.0").map(v => v.version)).toEqual(["1.7.0", "1.6.0"]);
        expect(versionsSince(versions, "1.7.0", "1.7.0")).toEqual([]);
    });

    it("pastille Nouveau : seulement les jeux apparus après la dernière version vue", () => {
        // venu en 1.6, la 1.7 n'ajoute pas de jeu (derniers jeux en 1.4) : aucune pastille
        expect(isNewSince("1.4.0", "1.6.0")).toBe(false);
        // venu en 1.3 : les jeux de la 1.4 sont nouveaux, pas ceux de la 1.0
        expect(isNewSince("1.4.0", "1.3.0")).toBe(true);
        expect(isNewSince("1.0.0", "1.3.0")).toBe(false);
        // venu depuis la dernière mise à jour qui a ajouté un jeu : seulement ce jeu
        expect(isNewSince("1.7.0", "1.6.0")).toBe(true);
        // pas de nouveautés à montrer (première visite, ou déjà vues)
        expect(isNewSince("1.7.0", null)).toBe(false);
    });
});
