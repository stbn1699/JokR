import type {Kysely} from "kysely";
import type {DB} from "../db/schema.js";
import type {WikiArticle} from "../services/wikipedia.js";
import {THEME_DRAFTS_MAX, filledQuestions, slugReserved, themeSlug, type ThemeDraft, type ThemeQuestion} from "../utils/quizzThemes.js";

/*
 * Thèmes du Quizz créés par les joueurs : brouillons (création, enregistrement, reprise), soumission, validation
 * par un administrateur (le thème reçoit son slug, ses questions passent dans quizz_questions déjà validées, et
 * l'auteur reçoit une notification « quizz_theme_approved »), et liste des thèmes jouables.
 */

export type ThemeStatus = "draft" | "pending" | "approved" | "rejected";

export class QuizzThemesRepository {
    constructor(private db: Kysely<DB>) {
    }

    // Thèmes validés, pour la page Quizz (le site les ajoute aux siens)
    async approved() {
        const rows = await this.db.selectFrom("quizz_themes as t")
            .leftJoin("users as u", "u.id", "t.author_id")
            .select(["t.slug", "t.name", "t.description", "t.category", "t.color", "t.wiki_url", "t.wiki_title", "t.summary",
                "u.username"])
            .where("t.status", "=", "approved").orderBy("t.reviewed_at").execute();
        return rows.map(r => ({
            id: r.slug!, name: r.name, description: r.description, category: r.category, color: r.color,
            wikiUrl: r.wiki_url, wikiTitle: r.wiki_title, summary: r.summary ?? [], creator: r.username,
        }));
    }

    // Catégorie d'un thème validé (null s'il n'existe pas)
    async approvedCategory(slug: string): Promise<string | null> {
        const row = await this.db.selectFrom("quizz_themes").select("category")
            .where("slug", "=", slug).where("status", "=", "approved").executeTakeFirst();
        return row?.category ?? null;
    }

    // Nom d'un thème validé (null s'il n'existe pas)
    async approvedName(slug: string): Promise<string | null> {
        const row = await this.db.selectFrom("quizz_themes").select("name")
            .where("slug", "=", slug).where("status", "=", "approved").executeTakeFirst();
        return row?.name ?? null;
    }

    // Thèmes du joueur (brouillons, soumis, validés, refusés), les plus récents d'abord
    async mine(userId: string) {
        const rows = await this.db.selectFrom("quizz_themes")
            .select(["id", "status", "slug", "name", "questions", "updated_at"])
            .where("author_id", "=", userId).orderBy("updated_at", "desc").execute();
        return rows.map(r => ({
            id: r.id, status: r.status as ThemeStatus, slug: r.slug, name: r.name,
            questionCount: filledQuestions(r.questions as ThemeQuestion[]).length, updatedAt: r.updated_at.toISOString(),
        }));
    }

    // Un thème du joueur, pour le reprendre
    async get(userId: string, id: string) {
        const r = await this.db.selectFrom("quizz_themes").selectAll()
            .where("id", "=", id).where("author_id", "=", userId).executeTakeFirst();
        if (!r) return null;
        return {
            id: r.id, status: r.status as ThemeStatus, slug: r.slug, name: r.name, description: r.description,
            category: r.category, color: r.color, wikiUrl: r.wiki_url, questions: r.questions as ThemeQuestion[],
            updatedAt: r.updated_at.toISOString(),
        };
    }

    // Brouillons et thèmes soumis du joueur (la limite THEME_DRAFTS_MAX)
    async openCount(userId: string): Promise<number> {
        const row = await this.db.selectFrom("quizz_themes").select(eb => eb.fn.countAll<string>().as("n"))
            .where("author_id", "=", userId).where("status", "in", ["draft", "pending", "rejected"]).executeTakeFirst();
        return Number(row?.n ?? 0);
    }

    async create(userId: string, draft: ThemeDraft): Promise<{ id: string; updatedAt: string } | "limit"> {
        if (await this.openCount(userId) >= THEME_DRAFTS_MAX) return "limit";
        const row = await this.db.insertInto("quizz_themes")
            .values({author_id: userId, ...columns(draft)})
            .returning(["id", "updated_at"]).executeTakeFirstOrThrow();
        return {id: row.id, updatedAt: row.updated_at.toISOString()};
    }

    // Enregistre un brouillon (ou un thème refusé, qui redevient brouillon) ; null si introuvable ou déjà soumis
    async save(userId: string, id: string, draft: ThemeDraft): Promise<{ updatedAt: string } | null> {
        const row = await this.db.updateTable("quizz_themes")
            .set({...columns(draft), status: "draft", updated_at: new Date()})
            .where("id", "=", id).where("author_id", "=", userId).where("status", "in", ["draft", "rejected"])
            .returning("updated_at").executeTakeFirst();
        return row ? {updatedAt: row.updated_at.toISOString()} : null;
    }

    async remove(userId: string, id: string): Promise<boolean> {
        const result = await this.db.deleteFrom("quizz_themes")
            .where("id", "=", id).where("author_id", "=", userId).where("status", "in", ["draft", "rejected"])
            .executeTakeFirst();
        return Number(result.numDeletedRows) > 0;
    }

    // Nom déjà pris par un thème du site ou un thème validé / soumis par quelqu'un d'autre ?
    async nameTaken(id: string, name: string): Promise<boolean> {
        const slug = themeSlug(name);
        if (slugReserved(slug)) return true;
        const rows = await this.db.selectFrom("quizz_themes").select(["id", "name"])
            .where("status", "in", ["pending", "approved"]).where("id", "!=", id).execute();
        return rows.some(r => themeSlug(r.name) === slug);
    }

    // Soumission : le brouillon (déjà vérifié) et l'article de Wikipédia lu par le serveur ; false si introuvable
    async submit(userId: string, id: string, draft: ThemeDraft, wiki: WikiArticle): Promise<boolean> {
        const result = await this.db.updateTable("quizz_themes")
            .set({
                ...columns({...draft, wikiUrl: wiki.url, questions: filledQuestions(draft.questions)}),
                wiki_title: wiki.title, summary: wiki.summary, status: "pending", submitted_at: new Date(), updated_at: new Date(),
            })
            .where("id", "=", id).where("author_id", "=", userId).where("status", "in", ["draft", "rejected"])
            .executeTakeFirst();
        return Number(result.numUpdatedRows) > 0;
    }

    // Thèmes soumis, les plus anciens d'abord (administrateur)
    async pending() {
        const rows = await this.db.selectFrom("quizz_themes as t")
            .leftJoin("users as u", "u.id", "t.author_id")
            .select(["t.id", "t.name", "t.description", "t.category", "t.color", "t.wiki_url", "t.wiki_title", "t.summary",
                "t.questions", "t.submitted_at", "u.username"])
            .where("t.status", "=", "pending").orderBy("t.submitted_at").execute();
        return rows.map(r => ({
            id: r.id, name: r.name, description: r.description, category: r.category, color: r.color, wikiUrl: r.wiki_url,
            wikiTitle: r.wiki_title, summary: r.summary ?? [], questions: r.questions as ThemeQuestion[], username: r.username,
            submittedAt: r.submitted_at?.toISOString() ?? null,
        }));
    }

    // Validation : slug libre, questions jouables, notification ; refus : le thème revient à son auteur.
    // "taken" : un autre thème porte déjà ce nom. false : thème introuvable ou plus en attente.
    async review(id: string, adminId: string, status: "approved" | "rejected"): Promise<boolean | "taken"> {
        return this.db.transaction().execute(async trx => {
            const theme = await trx.selectFrom("quizz_themes").select(["author_id", "name", "questions"])
                .where("id", "=", id).where("status", "=", "pending").forUpdate().executeTakeFirst();
            if (!theme) return false;
            if (status === "rejected") {
                await trx.updateTable("quizz_themes").set({status, reviewed_by: adminId, reviewed_at: new Date()})
                    .where("id", "=", id).execute();
                if (theme.author_id) await notify(trx, theme.author_id, "quizz_theme_rejected", id, {themeId: id, name: theme.name});
                return true;
            }
            const slug = themeSlug(theme.name);
            const clash = slugReserved(slug) || await trx.selectFrom("quizz_themes").select("id")
                .where("slug", "=", slug).executeTakeFirst();
            if (clash) return "taken";
            await trx.updateTable("quizz_themes").set({status, slug, reviewed_by: adminId, reviewed_at: new Date()})
                .where("id", "=", id).execute();
            const questions = theme.questions as ThemeQuestion[];
            const start = Date.now();
            if (questions.length > 0) {
                await trx.insertInto("quizz_questions").values(questions.map((q, i) => ({
                    topic_id: slug, question: q.question, answers: q.answers, author_id: theme.author_id, status: "approved",
                    created_at: new Date(start + i), reviewed_by: adminId, reviewed_at: new Date(),
                }))).execute();
            }
            if (theme.author_id) await notify(trx, theme.author_id, "quizz_theme_approved", id, {slug, name: theme.name});
            return true;
        });
    }
}

const columns = (d: ThemeDraft) => ({
    name: d.name, description: d.description, category: d.category, color: d.color, wiki_url: d.wikiUrl,
    questions: JSON.stringify(d.questions),
});

async function notify(trx: Kysely<DB>, userId: string, kind: string, ref: string, data: unknown) {
    await trx.insertInto("notifications").values({user_id: userId, kind, ref, data: JSON.stringify(data)})
        .onConflict(oc => oc.columns(["user_id", "kind", "ref"]).doUpdateSet({data: JSON.stringify(data), created_at: new Date(), read_at: null}))
        .execute();
}
