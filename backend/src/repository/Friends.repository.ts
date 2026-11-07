import {sql, type Kysely, type Transaction} from "kysely";
import type {DB} from "../db/schema.js";

// Joueur tel qu'affiché dans la liste d'amis et les notifications
export type FriendPlayer = { username: string; avatar: string; level: number };

// Lien entre le joueur connecté et un autre : amis, demande envoyée, demande reçue, ou rien
export type Friendship = "friends" | "outgoing" | "incoming" | "none";

export type RequestResult = "requested" | "accepted" | "already_requested" | "already_friends";

type Db = Kysely<DB> | Transaction<DB>;

/*
 * Amis (table friendships) : demandes, acceptation, suppression.
 * Chaque demande et chaque acceptation envoie une notification (cloche du header) à l'autre joueur.
 */
export class FriendsRepository {
    constructor(private db: Kysely<DB>) {
    }

    async findUserId(username: string): Promise<string | undefined> {
        const row = await this.db.selectFrom("users").select("id").where("username", "=", username).executeTakeFirst();
        return row?.id;
    }

    // Ligne entre deux joueurs, dans un sens ou l'autre
    private async between(db: Db, a: string, b: string) {
        return db
            .selectFrom("friendships")
            .select(["requester_id", "addressee_id", "status"])
            .where(eb => eb.or([
                eb.and([eb("requester_id", "=", a), eb("addressee_id", "=", b)]),
                eb.and([eb("requester_id", "=", b), eb("addressee_id", "=", a)]),
            ]))
            .executeTakeFirst();
    }

    // Identifiants des amis (amitiés acceptées) d'un joueur
    async friendIds(userId: string): Promise<string[]> {
        const rows = await this.db
            .selectFrom("friendships")
            .select(sql<string>`case when requester_id = ${userId} then addressee_id else requester_id end`.as("id"))
            .where("status", "=", "accepted")
            .where(eb => eb.or([eb("requester_id", "=", userId), eb("addressee_id", "=", userId)]))
            .execute();
        return rows.map(r => r.id);
    }

    async relation(me: string, other: string): Promise<Friendship> {
        const row = await this.between(this.db, me, other);
        if (!row) return "none";
        if (row.status === "accepted") return "friends";
        return row.requester_id === me ? "outgoing" : "incoming";
    }

    // Amis, demandes reçues et demandes envoyées du joueur
    async list(userId: string) {
        const rows = await this.db
            .selectFrom("friendships as f")
            // l'autre joueur de la paire
            .innerJoin("users as u", join => join.on(
                sql<boolean>`u.id = case when f.requester_id = ${userId} then f.addressee_id else f.requester_id end`))
            .select([
                "u.username", "u.avatar", "u.user_level as level", "f.status", "f.created_at as since", "f.accepted_at as acceptedAt",
                sql<boolean>`f.requester_id = ${userId}`.as("sentByMe"),
            ])
            .where(eb => eb.or([eb("f.requester_id", "=", userId), eb("f.addressee_id", "=", userId)]))
            .orderBy("u.username")
            .execute();
        const player = (r: typeof rows[number]): FriendPlayer & { since: Date } =>
            ({username: r.username, avatar: r.avatar, level: r.level, since: r.acceptedAt ?? r.since});
        return {
            friends: rows.filter(r => r.status === "accepted").map(player),
            incoming: rows.filter(r => r.status === "pending" && !r.sentByMe).map(player),
            outgoing: rows.filter(r => r.status === "pending" && r.sentByMe).map(player),
        };
    }

    /*
     * Demande d'ami de `from` à `to`. Si `to` avait déjà demandé `from`, ils deviennent amis tout de suite.
     */
    async request(from: string, to: string): Promise<RequestResult> {
        return this.db.transaction().execute(async trx => {
            const row = await this.between(trx, from, to);
            if (row?.status === "accepted") return "already_friends";
            if (row && row.requester_id === from) return "already_requested";
            if (row) {
                await this.markAccepted(trx, to, from);
                return "accepted";
            }
            await trx.insertInto("friendships").values({requester_id: from, addressee_id: to}).execute();
            await this.notify(trx, to, "friend_request", from);
            return "requested";
        });
    }

    // `me` accepte la demande reçue de `from` ; false s'il n'y en a pas
    async accept(me: string, from: string): Promise<boolean> {
        return this.db.transaction().execute(async trx => {
            const row = await this.between(trx, me, from);
            if (!row || row.status !== "pending" || row.requester_id !== from) return false;
            await this.markAccepted(trx, from, me);
            return true;
        });
    }

    // Refuser, annuler une demande ou retirer un ami : la ligne disparaît (et la demande de la cloche)
    async remove(me: string, other: string): Promise<boolean> {
        const deleted = await this.db
            .deleteFrom("friendships")
            .where(eb => eb.or([
                eb.and([eb("requester_id", "=", me), eb("addressee_id", "=", other)]),
                eb.and([eb("requester_id", "=", other), eb("addressee_id", "=", me)]),
            ]))
            .executeTakeFirst();
        await this.db
            .deleteFrom("notifications")
            .where("kind", "=", "friend_request")
            .where(eb => eb.or([
                eb.and([eb("user_id", "=", me), eb("ref", "=", other)]),
                eb.and([eb("user_id", "=", other), eb("ref", "=", me)]),
            ]))
            .execute();
        return Number(deleted.numDeletedRows) > 0;
    }

    // Demande de `requester` acceptée par `addressee` : prévient celui qui avait demandé
    private async markAccepted(trx: Transaction<DB>, requester: string, addressee: string) {
        await trx
            .updateTable("friendships")
            .set({status: "accepted", accepted_at: new Date()})
            .where("requester_id", "=", requester)
            .where("addressee_id", "=", addressee)
            .execute();
        // la demande reçue n'a plus à attendre une réponse dans la cloche
        await trx.updateTable("notifications").set({read_at: new Date()})
            .where("user_id", "=", addressee).where("kind", "=", "friend_request").where("ref", "=", requester)
            .execute();
        await this.notify(trx, requester, "friend_accepted", addressee);
    }

    // Notification à `userId` à propos du joueur `aboutId` (une seule par sorte et par joueur : remise à neuf)
    private async notify(trx: Transaction<DB>, userId: string, kind: "friend_request" | "friend_accepted", aboutId: string) {
        const about = await trx
            .selectFrom("users")
            .select(["username", "avatar", "user_level as level"])
            .where("id", "=", aboutId)
            .executeTakeFirstOrThrow();
        const data: FriendPlayer = {username: about.username, avatar: about.avatar, level: about.level};
        await trx
            .insertInto("notifications")
            .values({user_id: userId, kind, ref: aboutId, data: JSON.stringify(data)})
            .onConflict(oc => oc.columns(["user_id", "kind", "ref"]).doUpdateSet({
                data: JSON.stringify(data),
                created_at: new Date(),
                read_at: null,
            }))
            .execute();
    }
}
