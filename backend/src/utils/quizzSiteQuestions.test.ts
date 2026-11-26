import {readFileSync} from "node:fs";
import {join} from "node:path";
import {describe, expect, it} from "vitest";
import {QUIZZ_TOPIC_IDS, questionProblem} from "./quizz.js";
import {ROUNDS} from "./quizzDuel.js";

/*
 * Questions du site, versées en base par la migration V1_0_80 (quizz_questions) : chaque ligne
 *   ('<thème>', <numéro>, '<question>', array['<bonne>', '<mauvaise>', '<mauvaise>', '<mauvaise>'])
 * est relue ici et vérifiée comme une question proposée par un joueur.
 */
const SQL = readFileSync(join(import.meta.dirname, "../../../database/migrations/V1.0/V1_0_80__quizz_site_questions.sql"), "utf8");
const LIT = String.raw`'((?:[^']|'')*)'`;
const ROW = new RegExp(String.raw`^    \(${LIT}, (\d+), ${LIT}, array\[${LIT}, ${LIT}, ${LIT}, ${LIT}\]\),?$`, "gm");
const unquote = (s: string) => s.replaceAll("''", "'");

const rows = [...SQL.matchAll(ROW)].map(m => ({
    topic: m[1]!, number: Number(m[2]), question: unquote(m[3]!), answers: [m[4]!, m[5]!, m[6]!, m[7]!].map(unquote),
}));
const byTopic = Map.groupBy(rows, r => r.topic);

describe("questions du site (migration V1_0_80)", () => {
    it("sont toutes relues", () => {
        const values = SQL.split("\n").filter(l => l.startsWith("    ('")).length;
        expect(rows.length).toBe(values);
        expect(rows.length).toBeGreaterThan(5000);
    });

    it("couvrent chaque thème du site, et seulement eux", () => {
        expect([...byTopic.keys()].sort()).toEqual([...QUIZZ_TOPIC_IDS].sort());
    });

    it("respectent les mêmes règles que les questions proposées", () => {
        for (const r of rows) expect(questionProblem(r), `${r.topic} ${r.number}`).toBeNull();
    });

    it.each([...byTopic.entries()])("%s : assez de questions, numéros et textes uniques", (_, list) => {
        expect(list.length).toBeGreaterThanOrEqual(ROUNDS);
        expect(new Set(list.map(r => r.number)).size).toBe(list.length);
        expect(new Set(list.map(r => r.question)).size).toBe(list.length);
    });
});
