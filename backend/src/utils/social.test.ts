import {describe, expect, it} from "vitest";
import {challengeMatches, cleanMessage, difficultyRange, MESSAGE_MAX, records, type ChallengeRow} from "./social.js";

const at = (minute: number) => new Date(Date.UTC(2026, 10, 25, 12, minute));

describe("challengeMatches", () => {
    it("grille envoyée à plusieurs amis : un face-à-face par ami, contre l'envoyeur seulement", () => {
        const rows: ChallengeRow[] = [
            {challengeId: "c", senderId: "s", senderMs: 100, userId: "a", durationMs: 90, finishedAt: at(1)},
            {challengeId: "c", senderId: "s", senderMs: 100, userId: "b", durationMs: 120, finishedAt: at(2)},
            {challengeId: "c", senderId: "s", senderMs: 100, userId: "x", durationMs: null, finishedAt: null},
        ];
        expect(challengeMatches(rows).map(m => [m.opponentId, m.senderMs, m.opponentMs])).toEqual([["a", 100, 90], ["b", 100, 120]]);
    });

    it("duel : le temps de l'envoyeur vient de sa ligne, rien tant qu'un des deux n'a pas joué", () => {
        const half: ChallengeRow[] = [
            {challengeId: "d", senderId: "s", senderMs: null, userId: "s", durationMs: null, finishedAt: null},
            {challengeId: "d", senderId: "s", senderMs: null, userId: "a", durationMs: 80, finishedAt: at(3)},
        ];
        expect(challengeMatches(half)).toEqual([]);
        const done = [{...half[0]!, durationMs: 70, finishedAt: at(5)}, half[1]!];
        expect(challengeMatches(done)).toEqual([{challengeId: "d", senderId: "s", opponentId: "a", senderMs: 70, opponentMs: 80, at: at(5)}]);
    });
});

describe("records", () => {
    it("compte victoires et défaites de chaque côté, sans les égalités", () => {
        const rows: ChallengeRow[] = [
            {challengeId: "1", senderId: "me", senderMs: 50, userId: "a", durationMs: 60, finishedAt: at(1)},
            {challengeId: "2", senderId: "a", senderMs: 40, userId: "me", durationMs: 45, finishedAt: at(2)},
            {challengeId: "3", senderId: "a", senderMs: 40, userId: "me", durationMs: 40, finishedAt: at(3)},
            {challengeId: "4", senderId: "b", senderMs: 40, userId: "a", durationMs: 10, finishedAt: at(4)},
        ];
        const r = records("me", challengeMatches(rows));
        expect(r.get("a")).toEqual({wins: 1, losses: 1});
        expect(r.has("b")).toBe(false);
    });
});

describe("difficultyRange", () => {
    it("couvre tous les niveaux après le tutoriel, sans trou ni chevauchement", () => {
        const ranges = (["Facile", "Moyen", "Difficile", "Expert"] as const).map(d => difficultyRange(d, 1000, 3));
        expect(ranges[0]!.from).toBe(4);
        expect(ranges[3]!.to).toBe(1000);
        for (let i = 1; i < ranges.length; i++) expect(ranges[i]!.from).toBe(ranges[i - 1]!.to + 1);
    });
});

describe("cleanMessage", () => {
    it("retire les espaces autour, refuse vide et trop long", () => {
        expect(cleanMessage("  salut  ")).toBe("salut");
        expect(cleanMessage("a\n\n\n\nb")).toBe("a\n\nb");
        expect(cleanMessage("   ")).toBeNull();
        expect(cleanMessage(42)).toBeNull();
        expect(cleanMessage("x".repeat(MESSAGE_MAX + 1))).toBeNull();
    });
});
