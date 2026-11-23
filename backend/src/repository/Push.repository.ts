import {sql, type Kysely} from "kysely";
import type {DB} from "../db/schema.js";
import type {PushKeys} from "../utils/push.js";

// Appareils gardés par joueur : les plus anciens sont oubliés au-delà
const MAX_DEVICES = 5;

export type PendingPush = { id: string; user_id: string; kind: string; data: unknown; read_at: Date | null; created_at: Date };

/*
 * Notifications push : appareils abonnés (table push_subscriptions) et notifications à envoyer.
 */
export class PushRepository {
    constructor(private db: Kysely<DB>) {
    }

    // Un appareil appartient au dernier joueur qui l'a activé
    async save(userId: string, keys: PushKeys): Promise<void> {
        await this.db.transaction().execute(async trx => {
            await trx.insertInto("push_subscriptions")
                .values({user_id: userId, ...keys})
                .onConflict(oc => oc.column("endpoint").doUpdateSet({user_id: userId, p256dh: keys.p256dh, auth: keys.auth, created_at: new Date()}))
                .execute();
            const old = await trx.selectFrom("push_subscriptions").select("id")
                .where("user_id", "=", userId).orderBy("created_at", "desc").offset(MAX_DEVICES).limit(100).execute();
            if (old.length > 0) await trx.deleteFrom("push_subscriptions").where("id", "in", old.map(o => o.id)).execute();
        });
    }

    async remove(userId: string, endpoint: string): Promise<void> {
        await this.db.deleteFrom("push_subscriptions").where("user_id", "=", userId).where("endpoint", "=", endpoint).execute();
    }

    // Abonnement expiré (le service de push ne le connaît plus)
    async forget(endpoint: string): Promise<void> {
        await this.db.deleteFrom("push_subscriptions").where("endpoint", "=", endpoint).execute();
    }

    async devices(userIds: string[]) {
        if (userIds.length === 0) return [];
        return this.db.selectFrom("push_subscriptions").select(["user_id", "endpoint", "p256dh", "auth"])
            .where("user_id", "in", userIds).execute();
    }

    // Prend les prochaines notifications à envoyer : marquées d'un coup, jamais envoyées deux fois (plusieurs serveurs, redémarrage).
    // Les sortes de `heldKinds` restent en attente pour un prochain passage
    async claimPending(limit: number, heldKinds: string[] = []): Promise<PendingPush[]> {
        const {rows} = await sql<PendingPush>`
            update notifications n
            set pushed_at = n.created_at
            from (select id
                  from notifications
                  where pushed_at is distinct from created_at
                    and kind <> all (${heldKinds}::text[])
                  order by created_at
                  limit ${limit} for update skip locked) todo
            where n.id = todo.id
            returning n.id, n.user_id, n.kind, n.data, n.read_at, n.created_at`.execute(this.db);
        return rows;
    }
}
