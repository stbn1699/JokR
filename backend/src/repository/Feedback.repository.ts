import type {Kysely} from "kysely";
import type {DB} from "../db/schema.js";
import type {FeedbackInput} from "../utils/feedback.js";

/*
 * Retours des joueurs : envoi (joueur connecté), liste et suivi (administrateur).
 */
export class FeedbackRepository {
    constructor(private db: Kysely<DB>) {
    }

    async create(userId: string, input: FeedbackInput): Promise<void> {
        await this.db.insertInto("feedback").values({
            user_id: userId, kind: input.kind, message: input.message, page: input.page, user_agent: input.userAgent,
        }).execute();
    }

    // Derniers retours, les plus récents d'abord, avec le pseudo de l'auteur
    async list(limit = 200) {
        const rows = await this.db.selectFrom("feedback as f")
            .innerJoin("users as u", "u.id", "f.user_id")
            .select(["f.id", "f.kind", "f.message", "f.page", "f.user_agent", "f.created_at", "f.done_at", "u.username"])
            .orderBy("f.created_at", "desc").limit(limit).execute();
        return rows.map(r => ({
            id: r.id, kind: r.kind, message: r.message, page: r.page, userAgent: r.user_agent, username: r.username,
            createdAt: r.created_at.toISOString(), doneAt: r.done_at?.toISOString() ?? null,
        }));
    }

    // Marque comme traité (ou plus traité) ; false si le retour n'existe pas
    async setDone(id: string, done: boolean): Promise<boolean> {
        const result = await this.db.updateTable("feedback").set({done_at: done ? new Date() : null})
            .where("id", "=", id).executeTakeFirst();
        return Number(result.numUpdatedRows) > 0;
    }
}
