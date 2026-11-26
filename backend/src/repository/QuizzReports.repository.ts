import type {Kysely} from "kysely";
import type {DB} from "../db/schema.js";
import type {QuestionInput, ReportInput, ReportReview} from "../utils/quizz.js";

/*
 * Questions du Quizz contestées par les joueurs en fin de partie (table quizz_reports).
 * L'administrateur les voit regroupées par question (page Statistiques) et décide pour toutes à la fois :
 * - corrigée : la question (quizz_questions, qu'elle vienne du site ou d'un joueur) se corrige sur place ; une
 *   question qui n'est plus en base telle quelle (déjà corrigée, refusée) se marque seulement corrigée ;
 * - la réponse est juste : rien ne change.
 * Chaque joueur qui l'a contestée reçoit une notification « quizz_report_reviewed » avec la décision.
 */
export class QuizzReportsRepository {
    constructor(private db: Kysely<DB>) {
    }

    // Une contestation par joueur et par question : la nouvelle remplace l'ancienne (et redevient à examiner)
    async report(userId: string, r: ReportInput): Promise<void> {
        await this.db.insertInto("quizz_reports")
            .values({topic_id: r.topicId, question: r.question, answers: r.answers, picked: r.picked, reason: r.reason, reporter_id: userId})
            .onConflict(oc => oc.columns(["reporter_id", "topic_id", "question"]).doUpdateSet({
                answers: r.answers, picked: r.picked, reason: r.reason, status: "pending", created_at: new Date(),
                reviewed_by: null, reviewed_at: null,
            }))
            .execute();
    }

    // Questions contestées à examiner, la plus anciennement contestée d'abord, avec chaque contestation
    async pending() {
        const rows = await this.db.selectFrom("quizz_reports as r")
            .leftJoin("users as u", "u.id", "r.reporter_id")
            .select(["r.topic_id", "r.question", "r.answers", "r.picked", "r.reason", "r.created_at", "u.username"])
            .where("r.status", "=", "pending").orderBy("r.created_at").limit(1000).execute();
        const groups = new Map<string, {
            topicId: string; question: string; answers: string[]; editable: boolean; site: boolean;
            reports: { username: string | null; picked: string | null; reason: string; createdAt: string }[];
        }>();
        for (const r of rows) {
            const key = `${r.topic_id}\n${r.question}`;
            const group = groups.get(key) ?? {topicId: r.topic_id, question: r.question, answers: r.answers, editable: false, site: false, reports: []};
            group.answers = r.answers;
            group.reports.push({username: r.username, picked: r.picked, reason: r.reason, createdAt: r.created_at.toISOString()});
            groups.set(key, group);
        }
        const list = [...groups.values()];
        if (list.length > 0) {
            // question encore en base telle qu'elle a été jouée : corrigeable ici
            // (site : une question du site, sinon d'un joueur)
            const stored = await this.db.selectFrom("quizz_questions").select(["topic_id", "question", "number"])
                .where("status", "=", "approved").where("question", "in", list.map(g => g.question)).execute();
            for (const g of list) {
                const found = stored.find(s => s.topic_id === g.topicId && s.question === g.question);
                g.editable = !!found;
                g.site = found?.number != null;
            }
        }
        return list;
    }

    /*
     * Décision sur une question contestée (toutes ses contestations en attente). edit : correction de la question. Nombre de contestations traitées, ou « not_editable » si la question à corriger n'est pas en base.
     */
    async review(adminId: string, r: ReportReview, topicName: (id: string) => Promise<string>): Promise<number | "not_editable"> {
        return this.db.transaction().execute(async trx => {
            if (r.edit) {
                const edit: QuestionInput = r.edit;
                const updated = await trx.updateTable("quizz_questions").set({question: edit.question, answers: edit.answers})
                    .where("topic_id", "=", r.topicId).where("question", "=", r.question).where("status", "=", "approved")
                    .returning("id").execute();
                if (updated.length === 0) return "not_editable";
            }
            const done = await trx.updateTable("quizz_reports")
                .set({status: r.status, reviewed_by: adminId, reviewed_at: new Date()})
                .where("topic_id", "=", r.topicId).where("question", "=", r.question).where("status", "=", "pending")
                .returning(["id", "reporter_id"]).execute();
            const data = JSON.stringify({
                topicId: r.topicId, topicName: await topicName(r.topicId), question: r.edit?.question ?? r.question, status: r.status,
            });
            const notified = done.filter(d => d.reporter_id !== null);
            if (notified.length > 0) {
                await trx.insertInto("notifications")
                    .values(notified.map(d => ({user_id: d.reporter_id!, kind: "quizz_report_reviewed", ref: d.id, data})))
                    .onConflict(oc => oc.columns(["user_id", "kind", "ref"]).doUpdateSet({data, created_at: new Date(), read_at: null}))
                    .execute();
            }
            return done.length;
        });
    }
}
