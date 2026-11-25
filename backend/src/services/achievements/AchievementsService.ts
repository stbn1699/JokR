import {sql, type Kysely} from "kysely";
import {challengeMatches} from "../../utils/social.js";
import type {DB} from "../../db/schema.js";
import {
    type Achievement,
    ACHIEVEMENT_PUZZLES,
    ACHIEVEMENT_WORLD_SIZE,
    ACHIEVEMENT_WORLDS,
    achievementMet,
    achievementReward,
    ACHIEVEMENTS_BY_STAT,
} from "../../utils/achievements.js";
import {shopCategoryItems} from "../../utils/shop.js";
import {upgradeLevels} from "../../utils/upgrades.js";
import {levelGame} from "../../utils/levels.js";
import {dailyDate} from "../../utils/dailyDate.js";
import {WHEEL_SEGMENTS} from "../../utils/wheel.js";
import {isGhost} from "../adminMode.js";
import {activity, bitCount, dailyClosed, dayNumberOf, type LiveProvider, parisTime, type StatCtx, type UserMemory, watchCredits} from "./events.js";

/*
 * Succès des joueurs (liste : utils/achievements.ts ; ce que chaque action change : events.ts).
 *
 * - Les statistiques de chaque joueur sont chargées une fois puis gardées en mémoire ; seules celles qui changent
 *   sont écrites en base (table user_achievement_stats).
 * - Les mises à jour d'un même joueur passent l'une après l'autre (file par joueur) : deux billes de Plinko qui
 *   arrivent ensemble ne cassent pas une série.
 * - Ce qui est un état du compte (solde, niveau, objets, niveaux réussis, amis…) est relu en base quand une action
 *   le demande (`live`), et tout est relu à la première action de chaque joueur depuis le démarrage : les succès de
 *   ce genre se débloquent pour les joueurs qui y étaient déjà.
 * - La première fois, les compteurs qu'on peut retrouver dans l'historique (billes lâchées, défis réussis, mains de
 *   poker…) sont repris de la base (BACKFILL_VERSION). Le reste (séries, succès « troll ») compte à partir de maintenant.
 * - Un succès débloqué est enregistré avec sa récompense, ajoutée aux jetons dans la même transaction ; le site le
 *   montre ensuite (GET /achievements/unseen).
 * Les succès ne gênent jamais le jeu : une erreur est seulement écrite dans les logs. Mode admin : rien n'est compté.
 */

const BACKFILL_VERSION = 1;
const BACKFILL_KEY = "_backfill";
// joueur oublié de la mémoire après une heure sans rien faire
const IDLE_MS = 60 * 60 * 1000;
const ALL_PROVIDERS: LiveProvider[] = ["credits", "account", "shop", "levels", "wins", "friends", "challenges", "feedback"];
// statistiques calculées à partir des autres, regardées à chaque fois
const DERIVED = ["daily.best.all", "achievements.count"];

type UserState = {
    stats: Map<string, number>;
    unlocked: Set<string>;
    mem: UserMemory;
    // tout a déjà été relu en base depuis le démarrage
    full: boolean;
    lastUsed: number;
};

export type Unlocked = { id: string; reward: number; unlockedAt: Date };

export class AchievementsService {
    private users = new Map<string, Promise<UserState>>();
    private queues = new Map<string, Promise<void>>();

    constructor(private readonly db: Kysely<DB>, private readonly log: (msg: string, err?: unknown) => void = console.error) {
        const timer = setInterval(() => this.evict(), 10 * 60 * 1000);
        timer.unref();
    }

    /*
     * Met à jour les statistiques d'un joueur et débloque ce qui doit l'être. Jamais d'erreur : on peut l'attendre
     * ou non. Sans joueur (invité) ou en mode admin : rien.
     */
    track(userId: string | null | undefined, update: (ctx: StatCtx) => void, now = new Date()): Promise<void> {
        if (!userId || isGhost(userId)) return Promise.resolve();
        const run = (this.queues.get(userId) ?? Promise.resolve())
            .then(() => this.apply(userId, update, now))
            .catch(err => this.log("[achievements]", err));
        this.queues.set(userId, run);
        void run.finally(() => {
            if (this.queues.get(userId) === run) this.queues.delete(userId);
        });
        return run;
    }

    // Tout relire et débloquer ce qui doit l'être (page des succès)
    async refresh(userId: string): Promise<void> {
        await this.track(userId, ctx => ctx.live(...ALL_PROVIDERS));
    }

    // Succès débloqués et statistiques du joueur (page des succès)
    async overview(userId: string): Promise<{ unlocked: Unlocked[]; stats: Record<string, number> }> {
        await this.refresh(userId);
        const state = await this.state(userId);
        const rows = await this.db.selectFrom("user_achievements").select(["achievement_id", "reward", "unlocked_at"])
            .where("user_id", "=", userId).execute();
        const live = await this.liveValues(userId, ALL_PROVIDERS);
        const stats: Record<string, number> = {};
        for (const [k, v] of state.stats) if (!k.startsWith("_")) stats[k] = v;
        for (const [k, v] of live) stats[k] = v;
        for (const k of DERIVED) {
            const v = this.derived(k, state);
            if (v !== undefined) stats[k] = v;
        }
        return {unlocked: rows.map(r => ({id: r.achievement_id, reward: r.reward, unlockedAt: r.unlocked_at})), stats};
    }

    // Succès pas encore montrés par le site, du plus ancien au plus récent
    async unseen(userId: string): Promise<Unlocked[]> {
        const rows = await this.db.selectFrom("user_achievements").select(["achievement_id", "reward", "unlocked_at"])
            .where("user_id", "=", userId).where("seen_at", "is", null).orderBy("unlocked_at").limit(20).execute();
        return rows.map(r => ({id: r.achievement_id, reward: r.reward, unlockedAt: r.unlocked_at}));
    }

    async markSeen(userId: string, ids: string[]): Promise<void> {
        if (ids.length === 0) return;
        await this.db.updateTable("user_achievements").set({seen_at: sql`now()`})
            .where("user_id", "=", userId).where("achievement_id", "in", ids).where("seen_at", "is", null).execute();
    }

    /*
     * Clôture des défis d'un jour : places finales de chaque joueur (classements, « Lanterne rouge »…).
     * Sans effet si c'est déjà fait (records et succès ne comptent qu'une fois).
     */
    async closeDay(date: string): Promise<void> {
        const {rows} = await sql<{ user_id: string; game_code: string; duration_ms: number; rank: number; total: number; first: number }>`
            select user_id, game_code, duration_ms,
                   rank() over (partition by game_code order by duration_ms)::int as rank,
                   count(*) over (partition by game_code)::int as total,
                   min(duration_ms) over (partition by game_code)::int as first
            from daily_results where challenge_date = ${date}::date`.execute(this.db);
        const byUser = new Map<string, typeof rows>();
        for (const r of rows) byUser.set(r.user_id, [...byUser.get(r.user_id) ?? [], r]);
        await Promise.all([...byUser].map(([userId, games]) => this.track(userId, ctx => dailyClosed(ctx, games.map(g => ({
            gameCode: g.game_code, rank: g.rank, total: g.total, durationMs: g.duration_ms, firstMs: g.first,
        }))))));
    }

    // Passage sur le site (au plus une fois par minute et par joueur, sans attendre) : dates, séries, présence
    private seen = new Map<string, number>();
    noteActivity(userId: string | null, now = new Date()) {
        if (!userId) return;
        const minute = Math.floor(now.getTime() / 60_000);
        if (this.seen.get(userId) === minute) return;
        this.seen.set(userId, minute);
        if (this.seen.size > 10_000) this.seen.clear();
        void this.track(userId, activity, now);
    }

    // ---------- Déroulement d'une mise à jour

    private async apply(userId: string, update: (ctx: StatCtx) => void, now: Date) {
        const state = await this.state(userId);
        state.lastUsed = Date.now();
        const changed = new Set<string>();
        const live = new Set<LiveProvider>();
        const ctx = this.context(state, changed, live, now);
        update(ctx);
        if (!state.full) {
            ALL_PROVIDERS.forEach(p => live.add(p));
            state.stats.forEach((_v, k) => changed.add(k));
            state.full = true;
        }

        const values = await this.liveValues(userId, [...live]);
        const credits = values.get("credits");
        if (credits !== undefined) watchCredits(ctx, credits);
        await this.save(userId, state, changed);

        // succès à regarder : statistiques changées, relues ou calculées
        const keys = new Set([...changed, ...values.keys(), ...DERIVED]);
        for (let round = 0; round < 5 && keys.size > 0; round++) {
            const value = (key: string) => values.get(key) ?? this.derived(key, state) ?? state.stats.get(key);
            const met: Achievement[] = [];
            for (const key of keys) {
                for (const a of ACHIEVEMENTS_BY_STAT.get(key) ?? []) {
                    if (!state.unlocked.has(a.id) && achievementMet(a, value(key))) met.push(a);
                }
            }
            if (met.length === 0) break;
            const after = await this.unlock(userId, state, met);
            keys.clear();
            keys.add("achievements.count");
            if (after !== null) {
                values.set("credits", after);
                keys.add("credits");
                const rewardChanged = new Set<string>();
                watchCredits(this.context(state, rewardChanged, new Set(), now), after);
                await this.save(userId, state, rewardChanged);
                rewardChanged.forEach(k => keys.add(k));
            }
        }
    }

    private context(state: UserState, changed: Set<string>, live: Set<LiveProvider>, now: Date): StatCtx {
        const {stats} = state;
        const set = (key: string, value: number) => {
            if (!Number.isFinite(value)) return;
            const v = Math.round(value);
            if (stats.get(key) === v) return;
            stats.set(key, v);
            changed.add(key);
        };
        return {
            now,
            mem: state.mem,
            get: key => stats.get(key),
            set,
            add: (key, n = 1) => {
                const v = (stats.get(key) ?? 0) + n;
                set(key, v);
                return v;
            },
            max: (key, value) => {
                const v = stats.get(key);
                if (v === undefined || value > v) set(key, value);
            },
            min: (key, value) => {
                const v = stats.get(key);
                if (v === undefined || value < v) set(key, value);
            },
            live: (...providers) => providers.forEach(p => live.add(p)),
        };
    }

    // Statistiques calculées à partir des autres
    private derived(key: string, state: UserState): number | undefined {
        if (key === "achievements.count") return state.unlocked.size;
        if (key === "daily.best.all") {
            const ranks = ACHIEVEMENT_PUZZLES.map(g => state.stats.get(`daily.best.${g.code}`));
            return ranks.every(r => r !== undefined) ? Math.max(...ranks as number[]) : undefined;
        }
        return undefined;
    }

    // Succès débloqués et récompense versée ; renvoie le nouveau solde (null : rien de neuf)
    private async unlock(userId: string, state: UserState, met: Achievement[]): Promise<number | null> {
        const result = await this.db.transaction().execute(async trx => {
            const inserted = await trx.insertInto("user_achievements")
                .values(met.map(a => ({user_id: userId, achievement_id: a.id, reward: achievementReward(a), seen_at: null})))
                .onConflict(oc => oc.columns(["user_id", "achievement_id"]).doNothing())
                .returning("achievement_id").execute();
            const ids = new Set(inserted.map(r => r.achievement_id));
            const reward = met.filter(a => ids.has(a.id)).reduce((n, a) => n + achievementReward(a), 0);
            const user = reward > 0
                ? await trx.updateTable("users").set(eb => ({credits: eb("credits", "+", reward)})).where("id", "=", userId)
                    .returning("credits").executeTakeFirst()
                : undefined;
            return {credits: user?.credits ?? null};
        });
        met.forEach(a => state.unlocked.add(a.id));
        return result.credits;
    }

    private async save(userId: string, state: UserState, keys: Set<string>) {
        const rows = [...keys].filter(k => state.stats.has(k)).map(k => ({user_id: userId, key: k, value: state.stats.get(k)!}));
        for (let i = 0; i < rows.length; i += 500) {
            await this.db.insertInto("user_achievement_stats").values(rows.slice(i, i + 500))
                .onConflict(oc => oc.columns(["user_id", "key"]).doUpdateSet(eb => ({value: eb.ref("excluded.value")})))
                .execute();
        }
    }

    // ---------- Chargement

    private state(userId: string): Promise<UserState> {
        let state = this.users.get(userId);
        if (!state) {
            state = this.load(userId);
            this.users.set(userId, state);
            state.catch(() => this.users.delete(userId));
        }
        return state;
    }

    private async load(userId: string): Promise<UserState> {
        const [stats, unlocked] = await Promise.all([
            this.db.selectFrom("user_achievement_stats").select(["key", "value"]).where("user_id", "=", userId).execute(),
            this.db.selectFrom("user_achievements").select("achievement_id").where("user_id", "=", userId).execute(),
        ]);
        const state: UserState = {
            stats: new Map(stats.map(s => [s.key, Number(s.value)])),
            unlocked: new Set(unlocked.map(u => u.achievement_id)),
            mem: {losses: []},
            full: false,
            lastUsed: Date.now(),
        };
        if ((state.stats.get(BACKFILL_KEY) ?? 0) < BACKFILL_VERSION) {
            const changed = new Set<string>();
            await this.backfill(userId, this.context(state, changed, new Set(), new Date()));
            state.stats.set(BACKFILL_KEY, BACKFILL_VERSION);
            changed.add(BACKFILL_KEY);
            await this.save(userId, state, changed);
        }
        return state;
    }

    private evict() {
        const limit = Date.now() - IDLE_MS;
        for (const [userId, promise] of this.users) {
            if (this.queues.has(userId)) continue;
            void promise.then(s => {
                if (s.lastUsed < limit && !this.queues.has(userId)) this.users.delete(userId);
            }, () => undefined);
        }
    }

    // ---------- États du compte relus en base

    private async liveValues(userId: string, providers: LiveProvider[]): Promise<Map<string, number>> {
        const values = new Map<string, number>();
        const want = new Set(providers);
        const db = this.db;
        const jobs: Promise<void>[] = [];

        if (want.has("credits") || want.has("account")) jobs.push((async () => {
            const user = await db.selectFrom("users").select(["credits", "user_level", "created_at"]).where("id", "=", userId).executeTakeFirst();
            if (!user) return;
            values.set("credits", user.credits);
            values.set("level", user.user_level);
            values.set("account.days", Math.floor((Date.now() - user.created_at.getTime()) / 86_400_000));
        })());

        if (want.has("shop")) jobs.push((async () => {
            const items = await db.selectFrom("user_items").select(["item_id", "price"]).where("user_id", "=", userId).execute();
            const owned = new Set(items.map(i => i.item_id));
            values.set("shop.bought", items.filter(i => i.price > 0).length);
            values.set("upgrades.owned", items.filter(i => i.item_id.startsWith("upgrade-")).length);
            for (const [id, level] of Object.entries(upgradeLevels(owned))) values.set(`upgrade.${id}`, level);
            let all = true;
            for (const [cat, ids] of Object.entries(shopCategoryItems())) {
                const complete = ids.length > 0 && ids.every(id => owned.has(id));
                values.set(`shop.complete.${cat}`, complete ? 1 : 0);
                if (ids.length > 0 && !complete) all = false;
            }
            values.set("shop.complete.all", all ? 1 : 0);
        })());

        if (want.has("levels")) jobs.push((async () => {
            const rows = await db.selectFrom("puzzle_level_progress").select(eb => ["game_code", eb.fn.countAll<string>().as("done")])
                .where("user_id", "=", userId).groupBy("game_code").execute();
            const done = new Map(rows.map(r => [r.game_code, Number(r.done)]));
            let total = 0, minWorld = Infinity;
            for (const g of ACHIEVEMENT_PUZZLES) {
                const n = done.get(g.code) ?? 0;
                const tutorial = levelGame(g.code)?.tutorial ?? 0;
                const world = n < tutorial || n === 0 ? 0 : Math.min(ACHIEVEMENT_WORLDS.length, 1 + Math.floor(n / ACHIEVEMENT_WORLD_SIZE));
                values.set(`levels.${g.code}`, n);
                values.set(`world.${g.code}`, world);
                total += n;
                minWorld = Math.min(minWorld, world);
            }
            values.set("levels.total", total);
            values.set("world.min", minWorld);
        })());

        if (want.has("wins")) jobs.push((async () => {
            const rows = await db.selectFrom("game_stats").select(["game_code", "games_won"]).where("user_id", "=", userId).execute();
            for (const r of rows) values.set(`wins.${r.game_code}`, r.games_won);
        })());

        if (want.has("friends")) jobs.push((async () => {
            const row = await db.selectFrom("friendships").select(eb => eb.fn.countAll<string>().as("n"))
                .where("status", "=", "accepted")
                .where(eb => eb.or([eb("requester_id", "=", userId), eb("addressee_id", "=", userId)]))
                .executeTakeFirst();
            values.set("friends", Number(row?.n ?? 0));
        })());

        if (want.has("feedback")) jobs.push((async () => {
            const row = await db.selectFrom("feedback").select(eb => eb.fn.countAll<string>().as("n")).where("user_id", "=", userId).executeTakeFirst();
            values.set("feedback", Number(row?.n ?? 0));
        })());

        if (want.has("challenges")) jobs.push((async () => {
            // tous les joueurs des défis où il est (envoyeur ou défié), pour retrouver le temps de l'envoyeur d'un duel
            const rows = await db.selectFrom("friend_challenge_players as p").innerJoin("friend_challenges as c", "c.id", "p.challenge_id")
                .select(["c.id as challengeId", "c.sender_id as senderId", "c.sender_ms as senderMs", "p.user_id as userId",
                    "p.duration_ms as durationMs", "p.finished_at as finishedAt"])
                .where(eb => eb.or([
                    eb("c.sender_id", "=", userId),
                    eb("c.id", "in", eb.selectFrom("friend_challenge_players").select("challenge_id").where("user_id", "=", userId)),
                ]))
                .execute();
            let won = 0, tie = 0, revenge = 0;
            const lost = new Map<string, number>();
            for (const m of challengeMatches(rows)) {
                const mine = m.senderId === userId;
                if (!mine && m.opponentId !== userId) continue;
                const opponent = mine ? m.opponentId : m.senderId;
                const myMs = mine ? m.senderMs : m.opponentMs;
                const theirMs = mine ? m.opponentMs : m.senderMs;
                if (Math.floor(myMs / 1000) === Math.floor(theirMs / 1000)) tie = 1;
                if (myMs < theirMs) {
                    won++;
                    if ((lost.get(opponent) ?? 0) > 0) revenge = 1;
                } else if (myMs > theirMs) {
                    lost.set(opponent, (lost.get(opponent) ?? 0) + 1);
                }
            }
            values.set("challenges.won", won);
            values.set("challenges.tie", tie);
            values.set("challenges.revenge", revenge);
            values.set("challenges.lostvs.max", Math.max(0, ...lost.values()));
        })());

        await Promise.all(jobs);
        return values;
    }

    // ---------- Reprise de l'historique (une seule fois par joueur et par version)

    private async backfill(userId: string, ctx: StatCtx) {
        const db = this.db;
        const today = dailyDate();

        const [casino, spentDay, shopSpent, puzzleCredits, wheel, lottery, naturals, poker, daily, ranks, galaxies, sent, user] = await Promise.all([
            sql<{ game: string; n: number; bet: string; payout: string; lost: string; wins: number; best: number | null; x100: number }>`
                select game, count(*)::int as n, coalesce(sum(bet), 0)::text as bet, coalesce(sum(payout), 0)::text as payout,
                       coalesce(sum(greatest(bet - payout, 0)), 0)::text as lost, count(*) filter (where payout > 0)::int as wins,
                       max(outcome) as best, count(*) filter (where bet > 0 and payout >= 100 * bet)::int as x100
                from casino_plays where user_id = ${userId} group by game`.execute(db),
            sql<{ best: string | null }>`
                select max(total)::text as best from (
                    select d, sum(amount) as total from (
                        select (created_at at time zone 'Europe/Paris')::date as d, bet as amount from casino_plays where user_id = ${userId}
                        union all
                        select (purchased_at at time zone 'Europe/Paris')::date, price from user_items where user_id = ${userId}
                    ) x group by d
                ) y`.execute(db),
            db.selectFrom("user_items").select(eb => eb.fn.coalesce(eb.fn.sum<string>("price"), sql<string>`0`).as("n")).where("user_id", "=", userId).executeTakeFirst(),
            db.selectFrom("game_results").select(eb => eb.fn.coalesce(eb.fn.sum<string>("credits"), sql<string>`0`).as("n")).where("user_id", "=", userId).executeTakeFirst(),
            db.selectFrom("daily_wheel_spins").select([sql<string>`spin_date::text`.as("date"), "segment", "credits"]).where("user_id", "=", userId).orderBy("created_at").execute(),
            db.selectFrom("lottery_draws").select(["kind", "winner_tickets", "prize"]).where("winner_id", "=", userId).execute(),
            sql<{ n: number }>`
                select count(*)::int as n from blackjack_hands
                where user_id = ${userId} and finished and not ghost
                  and jsonb_array_length(state -> 'hands') = 1 and state -> 'hands' -> 0 ->> 'outcome' = 'blackjack'`.execute(db),
            sql<{ hand: string | null }>`
                select distinct state ->> 'hand' as hand from poker_hands where user_id = ${userId} and finished and not ghost`.execute(db),
            db.selectFrom("daily_results").select([sql<string>`challenge_date::text`.as("date"), "game_code", "duration_ms"])
                .where("user_id", "=", userId).execute(),
            sql<{ game_code: string; best: number }>`
                select game_code, min(rank)::int as best from (
                    select user_id, game_code, rank() over (partition by challenge_date, game_code order by duration_ms) as rank
                    from daily_results
                    where challenge_date < ${today}::date
                      and challenge_date in (select challenge_date from daily_results where user_id = ${userId})
                ) r where user_id = ${userId} group by game_code`.execute(db),
            db.selectFrom("game_results").select(eb => eb.fn.max("grid_size").as("n")).where("user_id", "=", userId).where("game_code", "=", "GALAXIES").executeTakeFirst(),
            db.selectFrom("friend_challenges").select(eb => eb.fn.countAll<string>().as("n")).where("sender_id", "=", userId).executeTakeFirst(),
            db.selectFrom("users").select("last_seen_at").where("id", "=", userId).executeTakeFirst(),
        ]);

        // Hasard
        let bet = 0, payout = 0, lost = 0;
        for (const g of casino.rows) {
            bet += Number(g.bet);
            payout += Number(g.payout);
            lost += Number(g.lost);
            if (g.x100 > 0) ctx.set("casino.x100", 1);
            if (g.game === "plinko") ctx.max("plinko.balls", g.n);
            if (g.game === "slots") ctx.max("slots.spins", g.n);
            if (g.game === "roulette") {
                ctx.max("roulette.rounds", g.n);
                ctx.max("roulette.wins", g.wins);
            }
            if (g.game === "keno" && g.best !== null) ctx.max("keno.hits.best", g.best);
        }
        ctx.max("bet.total", bet);
        ctx.max("lost.total", lost);
        ctx.max("spent.total", bet + Number(shopSpent?.n ?? 0));
        ctx.max("spent.day.best", Number(spentDay.rows[0]?.best ?? 0));
        ctx.max("bj.naturals", naturals.rows[0]?.n ?? 0);
        for (const p of poker.rows) if (p.hand && p.hand !== "nothing") ctx.set(`poker.${p.hand}`, 1);

        // Loteries
        let lotteryPrizes = 0;
        for (const w of lottery) {
            ctx.set(`lottery.win.${w.kind}`, 1);
            ctx.set("lottery.won", 1);
            if (w.winner_tickets === 1) ctx.set("lottery.onewin", 1);
            lotteryPrizes += w.prize;
        }

        // Roue du jour
        let seen = 0, wheelCredits = 0;
        for (const s of wheel) {
            seen |= 1 << s.segment;
            wheelCredits += s.credits;
            if (WHEEL_SEGMENTS[s.segment]?.jackpot) ctx.set("wheel.jackpot", 1);
        }
        ctx.max("wheel.spins", wheel.length);
        ctx.set("wheel.seen", seen);
        ctx.set("wheel.segments", bitCount(seen));
        seedDayStreak(ctx, "wheel.days", wheel.map(s => dayNumberOf(s.date)));

        ctx.max("earned.total", payout + Number(puzzleCredits?.n ?? 0) + wheelCredits + lotteryPrizes);

        // Défis du jour
        ctx.max("daily.done", daily.length);
        const byDate = new Map<string, number>();
        for (const d of daily) {
            ctx.min(`daily.fastest.${d.game_code}`, d.duration_ms);
            if (d.game_code === "QUEENS" && d.duration_ms < 60_000) ctx.add("daily.queens.under60");
            byDate.set(d.date, (byDate.get(d.date) ?? 0) + 1);
        }
        seedDayStreak(ctx, "daily.streak", [...byDate.keys()].map(dayNumberOf));
        const fullDays = [...byDate].filter(([, n]) => n >= 8).map(([d]) => dayNumberOf(d));
        ctx.max("daily.fullday", fullDays.length);
        seedDayStreak(ctx, "daily.fullday.streak", fullDays);
        for (const r of ranks.rows) ctx.min(`daily.best.${r.game_code}`, r.best);

        if (galaxies?.n) ctx.max("maxsize.GALAXIES", Number(galaxies.n));
        ctx.max("challenges.sent", Number(sent?.n ?? 0));
        if (user?.last_seen_at && ctx.get("seen.day") === undefined) ctx.set("seen.day", parisTime(user.last_seen_at).dayNumber);
    }
}

// Série de jours reprise de l'historique : record, et série en cours (jusqu'au dernier jour)
function seedDayStreak(ctx: StatCtx, key: string, days: number[]) {
    const sorted = [...new Set(days)].sort((a, b) => a - b);
    if (sorted.length === 0 || ctx.get(`${key}.last`) !== undefined) return;
    let best = 0, current = 0;
    sorted.forEach((d, i) => {
        current = i > 0 && d === sorted[i - 1]! + 1 ? current + 1 : 1;
        best = Math.max(best, current);
    });
    ctx.set(key, current);
    ctx.set(`${key}.last`, sorted.at(-1)!);
    ctx.max(`${key}.best`, best);
}
