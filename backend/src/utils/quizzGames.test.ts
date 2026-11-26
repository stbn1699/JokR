import {describe, expect, it} from "vitest";
import {parseGameStart, quizzReward} from "./quizzGames.js";
import {ROUNDS} from "./quizzDuel.js";

const questions = Array.from({length: ROUNDS}, (_, i) => ({
    question: `Question numéro ${i}`, answers: ["a", "b", "c", "d"], correct: 1, key: `q:0d4c2a8e-1b7f-4a39-9c51-2f6e8d0b7a${String(i).padStart(2, "0")}`,
}));

describe("début d'une partie enregistrée", () => {
    it("accepte une partie solo ou un duel, avec l'identifiant de chaque question", () => {
        expect(parseGameStart({topicId: "cars", mode: "solo", questions})).toMatchObject({mode: "solo", duelId: null});
        expect(parseGameStart({topicId: "cars", mode: "live", duelId: "0d4c2a8e-1b7f-4a39-9c51-2f6e8d0b7a13", questions}))
            .toMatchObject({mode: "live"});
    });

    it("refuse un mode inconnu, un duel en solo ou une question sans identifiant", () => {
        expect(parseGameStart({topicId: "cars", mode: "marathon", questions})).toBe("Mode inconnu");
        expect(parseGameStart({topicId: "cars", mode: "solo", duelId: "0d4c2a8e-1b7f-4a39-9c51-2f6e8d0b7a13", questions})).toBe("Duel introuvable");
        expect(parseGameStart({topicId: "cars", mode: "solo", questions: questions.map(({key, ...q}) => q)})).toBe("Partie invalide");
    });
});

describe("récompense de fin de partie", () => {
    it("donne un huitième du score en XP et un crédit tous les 60 points, arrondis vers le bas", () => {
        expect(quizzReward(160)).toEqual({xp: 20, credits: 2});
        expect(quizzReward(120)).toEqual({xp: 15, credits: 2});
        expect(quizzReward(97)).toEqual({xp: 12, credits: 1});
        expect(quizzReward(59)).toEqual({xp: 7, credits: 0});
        expect(quizzReward(7)).toEqual({xp: 0, credits: 0});
    });
});
