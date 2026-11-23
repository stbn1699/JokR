import {sql, type Kysely} from "kysely";
import type {DB} from "../db/schema.js";
import {streakBonusPercent} from "../utils/streak.js";

// Série encore en vie : dernière grille aujourd'hui ou hier (jours de Paris), sinon 0
export const ACTIVE_STREAK = sql<number>`(case
    when users.streak_last_date >= (now() at time zone 'Europe/Paris')::date - 1 then users.streak_days
    else 0 end)`;

export type StreakInfo = { days: number; best: number; percent: number; playedToday: boolean };

export class StreakRepository {
    constructor(private db: Kysely<DB>) {
    }

    // percent : bonus de la prochaine victoire
    async of(userId: string): Promise<StreakInfo | null> {
        const row = await this.db.selectFrom("users")
            .select([
                ACTIVE_STREAK.as("days"), "streak_best as best",
                sql<boolean>`coalesce(users.streak_last_date = (now() at time zone 'Europe/Paris')::date, false)`.as("playedToday"),
            ])
            .where("id", "=", userId)
            .executeTakeFirst();
        if (!row) return null;
        return {...row, percent: streakBonusPercent(row.playedToday ? row.days : row.days + 1)};
    }

    /*
     * Rappel du jour : joueurs avec un appareil abonné et sans grille réussie aujourd'hui.
     * Une seule fois par joueur et par jour (la base refuse le doublon) ; le rappel de la veille disparaît de la cloche.
     */
    async remind(date: string): Promise<number> {
        await this.db.deleteFrom("notifications")
            .where("kind", "=", "streak_reminder")
            .where("ref", "<>", date)
            .execute();
        const result = await sql`
            insert into notifications (user_id, kind, ref, data)
            select u.id, 'streak_reminder', ${date},
                   jsonb_build_object('date', ${date}::text, 'days',
                       case when u.streak_last_date = ${date}::date - 1 then u.streak_days else 0 end)
            from users u
            where u.admin_mode = false
              and (u.streak_last_date is null or u.streak_last_date < ${date}::date)
              and exists (select 1 from push_subscriptions p where p.user_id = u.id)
            on conflict (user_id, kind, ref) do nothing`.execute(this.db);
        return Number(result.numAffectedRows ?? 0);
    }
}
