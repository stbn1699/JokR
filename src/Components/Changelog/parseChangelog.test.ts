import {describe, expect, it} from "vitest";
import {parseChangelog} from "./parseChangelog.ts";
import changelog from "../../../CHANGELOG.md?raw";

describe("parseChangelog", () => {
    it("lit les versions, l'introduction, les rubriques et leurs éléments", () => {
        const md = [
            "# Nouveautés",
            "Consignes ignorées.",
            "",
            "## 1.1.0 — 3 décembre 2026",
            "Petite mise à jour.",
            "### Jeux",
            "- Nouveau jeu",
            "  sur deux lignes",
            "- Autre chose",
            "## 1.0.0 — 1er novembre 2026",
            "- Élément sans rubrique",
        ].join("\n");

        expect(parseChangelog(md)).toEqual([
            {
                version: "1.1.0", date: "3 décembre 2026", intro: ["Petite mise à jour."],
                sections: [{title: "Jeux", items: ["Nouveau jeu sur deux lignes", "Autre chose"]}],
            },
            {
                version: "1.0.0", date: "1er novembre 2026", intro: [],
                sections: [{title: "", items: ["Élément sans rubrique"]}],
            },
        ]);
    });

    it("la dernière version de CHANGELOG.md est celle de package.json", () => {
        expect(parseChangelog(changelog)[0]?.version).toBe(__APP_VERSION__);
    });
});
