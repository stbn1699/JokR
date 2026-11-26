import {sql, type Kysely} from "kysely";
import type {DB} from "../db/schema.js";
import {type Answer, type DuelQuestion, pointsFor, ROUNDS} from "../utils/quizzDuel.js";
import {type GameStart, MIN_REWARDED_GAME_MS, type QuizzReward, quizzReward} from "../utils/quizzGames.js";
import {addXp} from "../utils/leveling.js";

// Question d'une partie enregistrée : son thème d'origine et sa catégorie (au moment de la partie)
type GameQuestion = DuelQuestion & { key: string; topic: string; category: string };

/*
 * Parties et réponses du Quizz, pour les statistiques (tables quizz_games, quizz_answers ; voir utils/quizzGames.ts).
 * Toutes les parties y passent, solo comme duels (au hasard, entre amis, en direct), finies ou non.
 */
export class QuizzGamesRepository {
    constructor(private db: Kysely<DB>) {
    }

    /*
     * Nouvelle partie. sources : thème d'origine et catégorie de chaque question, vérifiés par la route.
     * Un duel donné doit être un duel du joueur (sinon la partie est enregistrée sans lui).
     */
    async start(userId: string, game: GameStart, sources: { topic: string; category: string }[]): Promise<string> {
        let duelId = game.duelId;
        if (duelId) {
            const own = await this.db.selectFrom("quizz_duels").select("id").where("id", "=", duelId)
                .where(eb => eb.or([eb("challenger_id", "=", userId), eb("opponent_id", "=", userId)])).executeTakeFirst();
            if (!own) duelId = null;
        }
        const questions: GameQuestion[] = game.questions.map((q, i) => ({...q, ...sources[i]!}));
        const row = await this.db.insertInto("quizz_games").values({
            user_id: userId, mode: game.mode, duel_id: duelId, topic_id: game.topicId, questions: JSON.stringify(questions),
        }).returning("id").executeTakeFirstOrThrow();
        return row.id;
    }

    // Duel créé à la fin de la partie (joué en premier) : la partie lui est rattachée
    async linkDuel(gameId: string, userId: string, duelId: string): Promise<void> {
        await this.db.updateTable("quizz_games").set({duel_id: duelId})
            .where("id", "=", gameId).where("user_id", "=", userId).where("duel_id", "is", null).execute();
    }

    /*
     * Réponse à la question `round` (dans l'ordre, une fois chacune) ; false si elle n'est pas attendue.
     * Dernière réponse : la partie est finie et sa récompense versée (voir quizzReward) ; renvoyée avec la
     * progression du joueur (null si la partie ne rapporte rien).
     */
    async answer(gameId: string, userId: string, round: number, answer: Answer): Promise<false | { reward: QuizzReward | null }> {
        return this.db.transaction().execute(async trx => {
            const game = await trx.selectFrom("quizz_games").select(["mode", "topic_id", "questions", "answered", "score", "created_at"])
                .where("id", "=", gameId).where("user_id", "=", userId).forUpdate().executeTakeFirst();
            if (!game || game.answered !== round || round >= ROUNDS) return false;
            const q = (game.questions as GameQuestion[])[round]!;
            const points = pointsFor(answer, q, round);
            await trx.insertInto("quizz_answers").values({
                game_id: gameId, round, user_id: userId, mode: game.mode, question_key: q.key, question: q.question,
                topic_id: q.topic, category: q.category, mix_id: q.topic === game.topic_id ? null : game.topic_id,
                picked: answer.index, correct: answer.index === q.correct, ms: answer.ms, points,
            }).execute();
            await trx.updateTable("quizz_games").set(eb => ({
                answered: eb("answered", "+", 1), score: eb("score", "+", points),
                ...round === ROUNDS - 1 ? {finished_at: new Date()} : {},
            })).where("id", "=", gameId).execute();
            if (round !== ROUNDS - 1) return {reward: null};

            const reward = quizzReward(game.score + points);
            const lasted = Date.now() - new Date(game.created_at).getTime();
            if (lasted < MIN_REWARDED_GAME_MS || (reward.xp === 0 && reward.credits === 0)) return {reward: null};
            const user = await trx.selectFrom("users").select(["user_level", "user_xp"])
                .where("id", "=", userId).forUpdate().executeTakeFirst();
            if (!user) return {reward: null};
            const next = addXp(user.user_level, user.user_xp, reward.xp);
            await trx.updateTable("users")
                .set(eb => ({credits: eb("credits", "+", reward.credits), user_level: next.level, user_xp: next.xp}))
                .where("id", "=", userId).execute();
            return {reward};
        });
    }

    // Record solo du joueur sur un thème (ou un mélange) : meilleur score et nombre de parties finies
    async soloRecord(userId: string, topicId: string): Promise<{ best: number; games: number }> {
        const row = await this.db.selectFrom("quizz_games")
            .select([sql<number>`coalesce(max(score), 0)::int`.as("best"), sql<number>`count(*)::int`.as("games")])
            .where("user_id", "=", userId).where("topic_id", "=", topicId).where("mode", "=", "solo")
            .where("finished_at", "is not", null).executeTakeFirstOrThrow();
        return {best: row.best, games: row.games};
    }
}
