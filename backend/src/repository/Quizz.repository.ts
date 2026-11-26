import type {Kysely} from "kysely";
import type {DB} from "../db/schema.js";
import {QUIZZ_APPROVED_CREDITS, QUIZZ_TOPIC_NAMES, type QuestionInput, type ReviewInput} from "../utils/quizz.js";

/*
 * Questions du Quizz proposées par les joueurs : envoi (joueur connecté), questions validées d'un thème (tout le
 * monde, pour les parties), file d'attente et décision (administrateur).
 * Question validée : son auteur gagne QUIZZ_APPROVED_CREDITS crédits et reçoit une notification « quizz_approved ».
 */
export class QuizzRepository {
    constructor(private db: Kysely<DB>) {
    }

    // Envoi groupé : 1 ms d'écart entre les questions, pour que la file de validation garde l'ordre du formulaire
    async submit(userId: string, topicId: string, questions: QuestionInput[]): Promise<void> {
        const start = Date.now();
        await this.db.insertInto("quizz_questions")
            .values(questions.map((q, i) => ({
                topic_id: topicId, question: q.question, answers: q.answers, author_id: userId, created_at: new Date(start + i),
            })))
            .execute();
    }

    // Questions validées d'un thème (la bonne réponse en premier)
    async approved(topicId: string): Promise<QuestionInput[]> {
        const rows = await this.db.selectFrom("quizz_questions").select(["question", "answers"])
            .where("topic_id", "=", topicId).where("status", "=", "approved").orderBy("created_at").execute();
        return rows.map(r => ({question: r.question, answers: r.answers as QuestionInput["answers"]}));
    }

    // Questions proposées par un joueur sur un thème, par état (en attente, validées, refusées)
    async mine(userId: string, topicId: string): Promise<{ pending: number; approved: number; rejected: number }> {
        const rows = await this.db.selectFrom("quizz_questions")
            .select(eb => ["status", eb.fn.countAll<string>().as("n")])
            .where("author_id", "=", userId).where("topic_id", "=", topicId).groupBy("status").execute();
        const count = (status: string) => Number(rows.find(r => r.status === status)?.n ?? 0);
        return {pending: count("pending"), approved: count("approved"), rejected: count("rejected")};
    }

    // Questions en attente de validation, les plus anciennes d'abord, avec le pseudo de l'auteur
    async pending(limit = 500) {
        const rows = await this.db.selectFrom("quizz_questions as q")
            .leftJoin("users as u", "u.id", "q.author_id")
            .select(["q.id", "q.topic_id", "q.question", "q.answers", "q.created_at", "u.username"])
            .where("q.status", "=", "pending").orderBy("q.created_at").orderBy("q.id").limit(limit).execute();
        return rows.map(r => ({
            id: r.id, topicId: r.topic_id, question: r.question, answers: r.answers, username: r.username,
            createdAt: r.created_at.toISOString(),
        }));
    }

    // Valide (avec la correction éventuelle) ou refuse une question en attente ; false si elle n'est plus en attente.
    // Validée : crédits et notification pour l'auteur, dans la même transaction (jamais payée deux fois : la question
    // n'est modifiée que tant qu'elle est en attente)
    async review(id: string, adminId: string, review: ReviewInput): Promise<boolean> {
        return this.db.transaction().execute(async trx => {
            const row = await trx.updateTable("quizz_questions")
                .set({
                    status: review.status, reviewed_by: adminId, reviewed_at: new Date(),
                    ...review.edit ? {question: review.edit.question, answers: review.edit.answers} : {},
                })
                .where("id", "=", id).where("status", "=", "pending")
                .returning(["author_id", "topic_id", "question"]).executeTakeFirst();
            if (!row) return false;
            if (review.status === "approved" && row.author_id) {
                await trx.updateTable("users").set(eb => ({credits: eb("credits", "+", QUIZZ_APPROVED_CREDITS)}))
                    .where("id", "=", row.author_id).execute();
                const data = {topicId: row.topic_id, topicName: QUIZZ_TOPIC_NAMES[row.topic_id] ?? row.topic_id,
                    question: row.question, credits: QUIZZ_APPROVED_CREDITS};
                await trx.insertInto("notifications")
                    .values({user_id: row.author_id, kind: "quizz_approved", ref: id, data: JSON.stringify(data)})
                    .onConflict(oc => oc.columns(["user_id", "kind", "ref"]).doNothing())
                    .execute();
            }
            return true;
        });
    }
}
