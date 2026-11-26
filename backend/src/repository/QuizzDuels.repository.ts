import {sql, type Kysely, type Selectable, type Transaction} from "kysely";
import type {DB, QuizzDuelsTable} from "../db/schema.js";
import {lightStreak} from "./Streak.repository.js";
import {
    type Answer, DUEL_CLAIM_MINUTES, type DuelQuestion, LIVE_MAX_MS, LIVE_START_DELAY_MS, LOBBY_TIMEOUT_MS, outcome,
    padAnswers, ROUNDS, scoreOf,
} from "../utils/quizzDuel.js";

type Player = { username: string; avatar: string; level: number };
type Db = Kysely<DB> | Transaction<DB>;
type Duel = Selectable<QuizzDuelsTable>;

/*
 * Duels du Quizz (table quizz_duels, voir utils/quizzDuel.ts) et leurs notifications :
 * - quizz_duel : un·e ami·e te défie sur un thème, en direct (il t'attend dans le salon) ou chacun son tour
 *   (il a joué, à toi) (ref = id du duel)
 * - quizz_duel_result : ton adversaire a joué votre duel chacun son tour (ref = id du duel)
 */
export class QuizzDuelsRepository {
    constructor(private db: Kysely<DB>, private topicName: (topicId: string) => Promise<string>) {
    }

    private async player(db: Db, userId: string): Promise<Player> {
        return db.selectFrom("users").select(["username", "avatar", "user_level as level"])
            .where("id", "=", userId).executeTakeFirstOrThrow();
    }

    private async notify(trx: Transaction<DB>, userId: string, kind: string, ref: string, data: unknown) {
        await trx.insertInto("notifications")
            .values({user_id: userId, kind, ref, data: JSON.stringify(data)})
            .onConflict(oc => oc.columns(["user_id", "kind", "ref"]).doUpdateSet({
                data: JSON.stringify(data), created_at: new Date(), read_at: null,
            }))
            .execute();
    }

    // L'ami·e défié·e est prévenu·e : invitation au salon (en direct) ou partie du premier joueur à affronter
    private async invite(trx: Transaction<DB>, d: Pick<Duel, "id" | "topic_id" | "challenger_id" | "opponent_id" | "live" | "challenger_score">) {
        if (!d.opponent_id) return;
        await this.notify(trx, d.opponent_id, "quizz_duel", d.id, {
            duelId: d.id, from: await this.player(trx, d.challenger_id), topicId: d.topic_id, topicName: await this.topicName(d.topic_id),
            live: d.live, score: d.challenger_score,
        });
    }

    /*
     * Nouveau duel. answers : la partie du premier joueur (chacun son tour, au hasard) ; null pour un duel en direct
     * (le premier joueur attend son ami·e dans le salon).
     */
    async create(challengerId: string, duel: { topicId: string; questions: DuelQuestion[]; answers: Answer[] | null; friendId: string | null }) {
        const live = duel.answers === null;
        const score = duel.answers ? scoreOf(duel.answers, duel.questions) : null;
        return this.db.transaction().execute(async trx => {
            const row = await trx.insertInto("quizz_duels").values({
                topic_id: duel.topicId, random: duel.friendId === null, live, questions: JSON.stringify(duel.questions),
                challenger_id: challengerId, challenger_answers: JSON.stringify(duel.answers ?? []), challenger_score: score,
                challenger_seen_at: live ? new Date() : null, opponent_id: duel.friendId,
            }).returningAll().executeTakeFirstOrThrow();
            if (!live) await lightStreak(trx, challengerId);
            await this.invite(trx, row);
            return row.id;
        });
    }

    /*
     * Duel au hasard sur ce thème : le plus ancien qui attend un adversaire (d'abord celui que le joueur avait pris
     * sans le jouer, ou pris par un autre depuis plus de DUEL_CLAIM_MINUTES), réservé à ce joueur. null s'il n'y en a pas.
     */
    async claimRandom(userId: string, topicId: string): Promise<string | null> {
        const row = await this.db.updateTable("quizz_duels")
            .set({opponent_id: userId, claimed_at: new Date()})
            .where("id", "=", this.db.selectFrom("quizz_duels")
                .select("id")
                .where("topic_id", "=", topicId)
                .where("random", "=", true)
                .where("finished_at", "is", null)
                .where("challenger_id", "<>", userId)
                .where(w => w.or([
                    w("opponent_id", "is", null),
                    w("opponent_id", "=", userId),
                    w("claimed_at", "<", sql<Date>`now() - make_interval(mins => ${DUEL_CLAIM_MINUTES})`),
                ]))
                .orderBy(sql`(opponent_id = ${userId}) is true`, "desc")
                .orderBy("created_at")
                .limit(1)
                .forUpdate()
                .skipLocked())
            .returning("id")
            .executeTakeFirst();
        return row?.id ?? null;
    }

    private async row(db: Db, id: string, userId: string, lock = false) {
        let query = db.selectFrom("quizz_duels").selectAll()
            .where("id", "=", id)
            .where(eb => eb.or([eb("challenger_id", "=", userId), eb("opponent_id", "=", userId)]));
        if (lock) query = query.forUpdate();
        return query.executeTakeFirst();
    }

    // Les deux ont joué (ou la partie en direct a dépassé sa durée) : points recomptés, duel terminé
    private async finalize(trx: Transaction<DB>, d: Duel) {
        const questions = d.questions as DuelQuestion[];
        const mine = padAnswers(d.challenger_answers as Answer[]);
        const theirs = padAnswers(d.opponent_answers as Answer[]);
        const challengerScore = scoreOf(mine, questions);
        const opponentScore = scoreOf(theirs, questions);
        await trx.updateTable("quizz_duels").set({
            challenger_answers: JSON.stringify(mine), opponent_answers: JSON.stringify(theirs),
            challenger_score: challengerScore, opponent_score: opponentScore, finished_at: new Date(),
        }).where("id", "=", d.id).execute();
        // chacun son tour : le premier joueur apprend le résultat (en direct, les deux l'ont vu)
        if (!d.live && d.opponent_id) {
            await this.notify(trx, d.challenger_id, "quizz_duel_result", d.id, {
                duelId: d.id, by: await this.player(trx, d.opponent_id), topicId: d.topic_id, topicName: await this.topicName(d.topic_id),
                myScore: challengerScore, theirScore: opponentScore,
            });
        }
    }

    /*
     * Duel vu par l'un de ses deux joueurs (undefined sinon). Celui qui attend dans le salon y signale sa présence
     * à chaque lecture ; une partie en direct qui dépasse sa durée est terminée ici.
     * Réponses de l'adversaire : en direct (elles arrivent au fil de la partie), au second joueur chacun son tour
     * (il joue contre elles), et aux deux une fois le duel terminé.
     */
    async view(id: string, userId: string) {
        let d = await this.row(this.db, id, userId);
        if (!d) return undefined;
        const role = d.challenger_id === userId ? "challenger" as const : "opponent" as const;
        const now = new Date();
        if (d.live && !d.started_at && role === "challenger") {
            await this.db.updateTable("quizz_duels").set({challenger_seen_at: now}).where("id", "=", id).execute();
            d = {...d, challenger_seen_at: now};
        }
        if (d.live && d.started_at && !d.finished_at && now.getTime() > d.started_at.getTime() + LIVE_MAX_MS) {
            await this.db.transaction().execute(async trx => {
                const locked = await this.row(trx, id, userId, true);
                if (locked && !locked.finished_at) await this.finalize(trx, locked);
            });
            d = (await this.row(this.db, id, userId))!;
        }

        const ids = [d.challenger_id, ...d.opponent_id ? [d.opponent_id] : []];
        const users = await this.db.selectFrom("users").select(["id", "username", "avatar", "user_level as level"])
            .where("id", "in", ids).execute();
        const user = (uid: string | null) => users.find(u => u.id === uid);
        const finished = d.finished_at !== null;
        const challengerAnswers = d.challenger_answers as Answer[];
        const showOther = d.live || finished || (role === "opponent" && challengerAnswers.length === ROUNDS);
        const side = (uid: string | null, answers: unknown, score: number | null, isMe: boolean) => {
            const u = user(uid);
            if (!u) return null;
            return {username: u.username, avatar: u.avatar, level: u.level, score: finished || isMe ? score : null,
                answers: isMe || showOther ? answers as Answer[] : null};
        };
        // adversaire au hasard pas encore trouvé (ou pris sans être joué) : inconnu du premier joueur
        const hideOpponent = d.random && !finished && role === "challenger";
        return {
            id: d.id, topicId: d.topic_id, random: d.random, live: d.live, role, finished,
            createdAt: d.created_at.toISOString(),
            startedAt: d.started_at?.toISOString() ?? null,
            // salon ouvert : le premier joueur y est (ou vient d'y être)
            lobbyOpen: d.live && !d.started_at && d.challenger_seen_at !== null
                && now.getTime() - d.challenger_seen_at.getTime() < LOBBY_TIMEOUT_MS,
            serverNow: now.toISOString(),
            questions: d.questions as DuelQuestion[],
            challenger: side(d.challenger_id, d.challenger_answers, d.challenger_score, role === "challenger")!,
            opponent: hideOpponent ? null : side(d.opponent_id, d.opponent_answers, d.opponent_score, role === "opponent"),
        };
    }

    // En direct : l'ami·e entre dans le salon, la partie commence quelques secondes plus tard. false : salon fermé
    async join(id: string, userId: string): Promise<boolean> {
        const row = await this.db.updateTable("quizz_duels")
            .set({started_at: sql<Date>`now() + make_interval(secs => ${LIVE_START_DELAY_MS / 1000})`})
            .where("id", "=", id).where("opponent_id", "=", userId).where("live", "=", true)
            .where("started_at", "is", null)
            .where("challenger_seen_at", ">", sql<Date>`now() - make_interval(secs => ${LOBBY_TIMEOUT_MS / 1000})`)
            .returning("id").executeTakeFirst();
        return row !== undefined;
    }

    // En direct : réponse à la question `round` (dans l'ordre, une fois chacune). false si elle n'est pas attendue
    async answer(id: string, userId: string, round: number, answer: Answer): Promise<boolean> {
        return this.db.transaction().execute(async trx => {
            const d = await this.row(trx, id, userId, true);
            if (!d || !d.live || !d.started_at || d.finished_at) return false;
            const column = d.challenger_id === userId ? "challenger_answers" as const : "opponent_answers" as const;
            const answers = d[column] as Answer[];
            if (answers.length !== round || round >= ROUNDS) return false;
            const next = {...d, [column]: [...answers, answer]};
            await trx.updateTable("quizz_duels").set({[column]: JSON.stringify(next[column])}).where("id", "=", id).execute();
            if (round === ROUNDS - 1) await lightStreak(trx, userId);
            if ((next.challenger_answers as Answer[]).length === ROUNDS && (next.opponent_answers as Answer[]).length === ROUNDS) {
                await this.finalize(trx, next);
            }
            return true;
        });
    }

    /*
     * Chacun son tour : la partie entière d'un joueur. Le second (face aux réponses du premier), ou le premier
     * d'un duel prévu en direct qu'il a choisi de jouer sans attendre (son ami·e est alors prévenu·e).
     * false si ce n'est pas à lui de jouer.
     */
    async submit(id: string, userId: string, answers: Answer[]): Promise<boolean> {
        return this.db.transaction().execute(async trx => {
            const d = await this.row(trx, id, userId, true);
            if (!d || d.live || d.finished_at) return false;
            const played = async () => {
                await lightStreak(trx, userId);
                return true;
            };
            const challengerAnswers = d.challenger_answers as Answer[];
            if (d.challenger_id === userId) {
                if (challengerAnswers.length > 0) return false;
                const score = scoreOf(answers, d.questions as DuelQuestion[]);
                await trx.updateTable("quizz_duels").set({challenger_answers: JSON.stringify(answers), challenger_score: score})
                    .where("id", "=", id).execute();
                await this.invite(trx, {...d, challenger_score: score});
                return played();
            }
            if (challengerAnswers.length !== ROUNDS || (d.opponent_answers as Answer[]).length > 0) return false;
            await this.finalize(trx, {...d, opponent_answers: answers});
            return played();
        });
    }

    // Salon sans réponse : le premier joueur joue sans attendre, son ami·e jouera après lui
    async toTurns(id: string, userId: string): Promise<boolean> {
        const row = await this.db.updateTable("quizz_duels").set({live: false})
            .where("id", "=", id).where("challenger_id", "=", userId).where("live", "=", true).where("started_at", "is", null)
            .returning("id").executeTakeFirst();
        return row !== undefined;
    }

    // Le premier joueur renonce à un duel qu'il n'a pas encore joué (salon) : supprimé, avec l'invitation
    async cancel(id: string, userId: string): Promise<boolean> {
        return this.db.transaction().execute(async trx => {
            const row = await trx.deleteFrom("quizz_duels")
                .where("id", "=", id).where("challenger_id", "=", userId).where("started_at", "is", null)
                .where(sql<boolean>`jsonb_array_length(challenger_answers) = 0`)
                .returning("opponent_id").executeTakeFirst();
            if (!row) return false;
            if (row.opponent_id) {
                await trx.deleteFrom("notifications").where("user_id", "=", row.opponent_id)
                    .where("kind", "=", "quizz_duel").where("ref", "=", id).execute();
            }
            return true;
        });
    }

    // Duels du joueur sur un thème : à jouer, en attente de l'adversaire, derniers terminés, et son bilan
    async mine(userId: string, topicId: string) {
        const rows = await this.db.selectFrom("quizz_duels as d")
            .innerJoin("users as c", "c.id", "d.challenger_id")
            .leftJoin("users as o", "o.id", "d.opponent_id")
            .select([
                "d.id", "d.random", "d.live", "d.challenger_id", "d.challenger_score", "d.opponent_score", "d.challenger_seen_at",
                "d.started_at", "d.finished_at",
                sql<number>`jsonb_array_length(d.challenger_answers)`.as("c_played"),
                sql<number>`jsonb_array_length(d.opponent_answers)`.as("o_played"),
                "c.username as c_username", "c.avatar as c_avatar", "o.username as o_username", "o.avatar as o_avatar",
            ])
            .where("d.topic_id", "=", topicId)
            .where(eb => eb.or([eb("d.challenger_id", "=", userId), eb("d.opponent_id", "=", userId)]))
            .orderBy(sql`coalesce(d.finished_at, d.created_at)`, "desc")
            .execute();

        const now = Date.now();
        const record = {wins: 0, draws: 0, losses: 0};
        const toPlay = [], waiting = [], recent = [];
        for (const r of rows) {
            const isChallenger = r.challenger_id === userId;
            const other = isChallenger
                ? (r.o_username && !(r.random && r.finished_at === null) ? {username: r.o_username, avatar: r.o_avatar ?? ""} : null)
                : {username: r.c_username, avatar: r.c_avatar};
            if (r.finished_at === null) {
                if (r.live) {
                    if (r.started_at) continue;
                    const open = r.challenger_seen_at !== null && now - r.challenger_seen_at.getTime() < LOBBY_TIMEOUT_MS;
                    if (!isChallenger && open) toPlay.push({id: r.id, opponent: other, live: true});
                    continue;
                }
                const myTurn = isChallenger ? r.c_played === 0 : !r.random && r.c_played === ROUNDS && r.o_played === 0;
                if (myTurn) toPlay.push({id: r.id, opponent: other, live: false});
                else if (isChallenger) waiting.push({id: r.id, opponent: other, myScore: r.challenger_score});
                continue;
            }
            const myScore = (isChallenger ? r.challenger_score : r.opponent_score) ?? 0;
            const theirScore = (isChallenger ? r.opponent_score : r.challenger_score) ?? 0;
            const result = outcome(myScore, theirScore);
            record[result === "win" ? "wins" : result === "lose" ? "losses" : "draws"]++;
            if (recent.length < 10) recent.push({id: r.id, opponent: other, myScore, theirScore, result});
        }
        return {record, toPlay, waiting: waiting.slice(0, 10), recent};
    }
}
