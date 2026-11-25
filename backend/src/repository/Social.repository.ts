import {sql, type Kysely} from "kysely";
import type {DB} from "../db/schema.js";
import {challengeMatches, type ChallengeRow, records} from "../utils/social.js";

// Nombre de messages renvoyés pour une discussion (les plus récents)
export const CONVERSATION_LIMIT = 100;

// Message tel que le voit le joueur connecté
export type SocialMessage =
    | { id: string; from: "me" | "them"; at: Date; kind: "text"; text: string }
    | {
    id: string; from: "me" | "them"; at: Date; kind: "challenge";
    challengeId: string; gameCode: string; gameName: string; difficulty: string | null;
    // temps de chacun, null tant qu'il n'a pas joué
    myMs: number | null; theirMs: number | null;
};

/*
 * Onglet Social (table social_messages, défis de friend_challenges) :
 * - les ami·e·s avec leurs messages non lus et le bilan de vos défis
 * - la discussion avec un·e ami·e, défis compris (cartes avec les deux temps)
 * La présence (en ligne, en partie) ne vient pas d'ici : voir services/presence.ts.
 */
export class SocialRepository {
    constructor(private db: Kysely<DB>) {
    }

    // Ami·e·s (amitiés acceptées) avec leur identifiant
    async friends(me: string) {
        return this.db.selectFrom("friendships as f")
            .innerJoin("users as u", join => join.on(
                sql<boolean>`u.id = case when f.requester_id = ${me} then f.addressee_id else f.requester_id end`))
            .select(["u.id", "u.username", "u.avatar", "u.user_level as level"])
            .where("f.status", "=", "accepted")
            .where(eb => eb.or([eb("f.requester_id", "=", me), eb("f.addressee_id", "=", me)]))
            .orderBy("u.username")
            .execute();
    }

    // Messages non lus reçus de chaque joueur
    async unreadBySender(me: string): Promise<Map<string, number>> {
        const rows = await this.db.selectFrom("social_messages")
            .select(["sender_id", eb => eb.fn.countAll<string>().as("n")])
            .where("recipient_id", "=", me).where("read_at", "is", null)
            .groupBy("sender_id")
            .execute();
        return new Map(rows.map(r => [r.sender_id, Number(r.n)]));
    }

    async unreadTotal(me: string): Promise<number> {
        const row = await this.db.selectFrom("social_messages")
            .select(eb => eb.fn.countAll<string>().as("n"))
            .where("recipient_id", "=", me).where("read_at", "is", null)
            .executeTakeFirst();
        return Number(row?.n ?? 0);
    }

    // Dernier message échangé avec chaque joueur (pour ranger les discussions récentes en haut)
    async lastMessageAt(me: string): Promise<Map<string, Date>> {
        const rows = await this.db.selectFrom("social_messages")
            .select([
                sql<string>`case when sender_id = ${me} then recipient_id else sender_id end`.as("other"),
                eb => eb.fn.max("created_at").as("at"),
            ])
            .where(eb => eb.or([eb("sender_id", "=", me), eb("recipient_id", "=", me)]))
            .groupBy("other")
            .execute();
        return new Map(rows.map(r => [r.other, r.at as Date]));
    }

    // Lignes de tous les défis où `me` joue (envoyeur ou défié·e)
    private async challengeRows(me: string, challengeIds?: string[]): Promise<ChallengeRow[]> {
        if (challengeIds && challengeIds.length === 0) return [];
        let query = this.db.selectFrom("friend_challenge_players as p")
            .innerJoin("friend_challenges as c", "c.id", "p.challenge_id")
            .select(["c.id as challengeId", "c.sender_id as senderId", "c.sender_ms as senderMs", "p.user_id as userId",
                "p.duration_ms as durationMs", "p.finished_at as finishedAt"]);
        query = challengeIds
            ? query.where("c.id", "in", challengeIds)
            : query.where(eb => eb.or([
                eb("c.sender_id", "=", me),
                eb("c.id", "in", eb.selectFrom("friend_challenge_players").select("challenge_id").where("user_id", "=", me)),
            ]));
        return query.execute();
    }

    // Victoires et défaites de `me` contre chacun
    async records(me: string) {
        return records(me, challengeMatches(await this.challengeRows(me)));
    }

    // Discussion de `me` avec `other` : les plus récents, rangés du plus ancien au plus récent
    async conversation(me: string, other: string, limit = CONVERSATION_LIMIT): Promise<SocialMessage[]> {
        const rows = await this.db.selectFrom("social_messages as m")
            .leftJoin("friend_challenges as c", "c.id", "m.challenge_id")
            .leftJoin("games as g", "g.code", "c.game_code")
            .select(["m.id", "m.sender_id", "m.body", "m.challenge_id", "m.created_at",
                "c.sender_id as challenge_sender", "c.sender_ms", "c.game_code", "c.difficulty", "g.designation as game_name"])
            .where(eb => eb.or([
                eb.and([eb("m.sender_id", "=", me), eb("m.recipient_id", "=", other)]),
                eb.and([eb("m.sender_id", "=", other), eb("m.recipient_id", "=", me)]),
            ]))
            .orderBy("m.created_at", "desc")
            .limit(limit)
            .execute();
        rows.reverse();

        const ids = rows.map(r => r.challenge_id).filter((id): id is string => id !== null);
        const times = new Map<string, number | null>();
        for (const r of await this.challengeRows(me, ids)) times.set(`${r.challengeId}:${r.userId}`, r.durationMs);
        // temps d'un joueur sur un défi : celui de sa grille s'il l'a envoyée, sinon celui de sa ligne
        const timeOf = (r: typeof rows[number], user: string) =>
            (user === r.challenge_sender ? r.sender_ms : null) ?? times.get(`${r.challenge_id}:${user}`) ?? null;

        return rows.map(r => {
            const from = r.sender_id === me ? "me" as const : "them" as const;
            if (r.challenge_id === null || r.game_code === null) {
                return {id: r.id, from, at: r.created_at, kind: "text" as const, text: r.body ?? ""};
            }
            return {
                id: r.id, from, at: r.created_at, kind: "challenge" as const,
                challengeId: r.challenge_id, gameCode: r.game_code, gameName: r.game_name ?? r.game_code, difficulty: r.difficulty,
                myMs: timeOf(r, me), theirMs: timeOf(r, other),
            };
        });
    }

    async send(me: string, other: string, text: string): Promise<SocialMessage> {
        const row = await this.db.insertInto("social_messages")
            .values({sender_id: me, recipient_id: other, body: text})
            .returning(["id", "created_at"])
            .executeTakeFirstOrThrow();
        return {id: row.id, from: "me", at: row.created_at, kind: "text", text};
    }

    // Messages reçus de `other` marqués comme lus
    async markRead(me: string, other: string): Promise<void> {
        await this.db.updateTable("social_messages").set({read_at: new Date()})
            .where("recipient_id", "=", me).where("sender_id", "=", other).where("read_at", "is", null)
            .execute();
    }

    async gameNames(): Promise<Map<string, string>> {
        const rows = await this.db.selectFrom("games").select(["code", "designation"]).execute();
        return new Map(rows.map(r => [r.code, r.designation]));
    }
}
