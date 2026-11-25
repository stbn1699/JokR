import {sql, type Kysely, type Transaction} from "kysely";
import type {DB} from "../db/schema.js";

// Joueur cité dans une notification de défi
type Player = { username: string; avatar: string; level: number };

/*
 * Défis entre amis (tables friend_challenges, friend_challenge_players) et leurs notifications :
 * - friend_challenge : un ami t'envoie une grille (ref = id du défi)
 * - daily_challenge : un ami te défie au défi du jour (ref = jeu:date:ami)
 * - challenge_result : un ami a fait la grille que tu lui as envoyée, ou son côté d'un duel (ref = défi:ami)
 * Duel (onglet Social) : `difficulty` remplie, pas de `sender_ms` ; l'envoyeur a sa ligne de joueur comme l'ami·e.
 * Chaque défi envoyé à un·e ami·e apparaît aussi dans votre discussion (social_messages).
 */
export class ChallengesRepository {
    constructor(private db: Kysely<DB>) {
    }

    private async player(db: Kysely<DB> | Transaction<DB>, userId: string): Promise<Player> {
        return db.selectFrom("users").select(["username", "avatar", "user_level as level"])
            .where("id", "=", userId).executeTakeFirstOrThrow();
    }

    private async gameName(db: Kysely<DB> | Transaction<DB>, code: string): Promise<string> {
        const row = await db.selectFrom("games").select("designation").where("code", "=", code).executeTakeFirst();
        return row?.designation ?? code;
    }

    private async notify(trx: Transaction<DB>, userId: string, kind: string, ref: string, data: unknown) {
        await trx.insertInto("notifications")
            .values({user_id: userId, kind, ref, data: JSON.stringify(data)})
            .onConflict(oc => oc.columns(["user_id", "kind", "ref"]).doUpdateSet({
                data: JSON.stringify(data), created_at: new Date(), read_at: null,
            }))
            .execute();
    }

    // Dernière partie libre gagnée par le joueur sur ce jeu, depuis moins de 24 h (celle qu'on peut envoyer)
    async lastWin(userId: string, gameCode: string) {
        return this.db.selectFrom("game_sessions")
            .select(["game_id", "duration_ms", "grid_size", "empty_cells"])
            .where("user_id", "=", userId)
            .where("game_code", "=", gameCode)
            .where("mode", "=", "free")
            .where("finished_at", "is not", null)
            .where("finished_at", ">", sql<Date>`now() - interval '24 hours'`)
            .orderBy("finished_at", "desc")
            .limit(1)
            .executeTakeFirst();
    }

    // Temps du joueur au défi du jour (null s'il ne l'a pas encore réussi)
    async dailyTime(userId: string, gameCode: string, date: string): Promise<number | null> {
        const row = await this.db.selectFrom("daily_results").select("duration_ms")
            .where("user_id", "=", userId).where("game_code", "=", gameCode).where("challenge_date", "=", date)
            .executeTakeFirst();
        return row?.duration_ms ?? null;
    }

    // Crée le défi (grille d'une partie gagnée) et prévient chaque ami
    async create(sender: string, game: { code: string; puzzle: unknown; gridSize: number; emptyCells: number; senderMs: number }, friends: string[]) {
        return this.db.transaction().execute(async trx => {
            const {id} = await trx.insertInto("friend_challenges").values({
                sender_id: sender, game_code: game.code, puzzle: JSON.stringify(game.puzzle),
                grid_size: game.gridSize, empty_cells: game.emptyCells, sender_ms: game.senderMs,
            }).returning("id").executeTakeFirstOrThrow();
            await trx.insertInto("friend_challenge_players")
                .values(friends.map(user_id => ({challenge_id: id, user_id})))
                .execute();
            const data = {
                challengeId: id, from: await this.player(trx, sender), gameCode: game.code, gameName: await this.gameName(trx, game.code),
                gridSize: game.gridSize, emptyCells: game.emptyCells, senderMs: game.senderMs,
            };
            for (const friend of friends) await this.notify(trx, friend, "friend_challenge", id, data);
            await trx.insertInto("social_messages")
                .values(friends.map(recipient_id => ({sender_id: sender, recipient_id, challenge_id: id})))
                .execute();
            return id;
        });
    }

    // Duel : une grille pour deux, que l'envoyeur joue aussi (prévenu·e : son ami·e, dans la cloche et la discussion)
    async createDuel(sender: string, friend: string, game: { code: string; puzzle: unknown; gridSize: number; emptyCells: number; difficulty: string }) {
        return this.db.transaction().execute(async trx => {
            const {id} = await trx.insertInto("friend_challenges").values({
                sender_id: sender, game_code: game.code, puzzle: JSON.stringify(game.puzzle),
                grid_size: game.gridSize, empty_cells: game.emptyCells, sender_ms: null, difficulty: game.difficulty,
            }).returning("id").executeTakeFirstOrThrow();
            await trx.insertInto("friend_challenge_players")
                .values([sender, friend].map(user_id => ({challenge_id: id, user_id})))
                .execute();
            await trx.insertInto("social_messages").values({sender_id: sender, recipient_id: friend, challenge_id: id}).execute();
            await this.notify(trx, friend, "friend_challenge", id, {
                challengeId: id, from: await this.player(trx, sender), gameCode: game.code, gameName: await this.gameName(trx, game.code),
                gridSize: game.gridSize, emptyCells: game.emptyCells, senderMs: null, difficulty: game.difficulty,
            });
            return id;
        });
    }

    /*
     * Adversaire de `userId` sur ce défi et son temps (null s'il n'a pas encore joué) :
     * l'envoyeur pour un·e ami·e défié·e, l'autre joueur pour l'envoyeur d'un duel.
     */
    async opponent(challenge: { id: string; sender_id: string; sender_ms: number | null }, userId: string) {
        const player = (db: Kysely<DB>) => db.selectFrom("friend_challenge_players as p")
            .innerJoin("users as u", "u.id", "p.user_id")
            .select(["u.id", "u.username", "u.avatar", "u.user_level as level", "p.duration_ms"])
            .where("p.challenge_id", "=", challenge.id);
        if (userId !== challenge.sender_id) {
            const sender = await player(this.db).where("p.user_id", "=", challenge.sender_id).executeTakeFirst();
            if (sender) return {...sender, ms: challenge.sender_ms ?? sender.duration_ms};
            const u = await this.db.selectFrom("users").select(["id", "username", "avatar", "user_level as level"])
                .where("id", "=", challenge.sender_id).executeTakeFirstOrThrow();
            return {...u, ms: challenge.sender_ms};
        }
        const other = await player(this.db).where("p.user_id", "<>", userId).executeTakeFirstOrThrow();
        return {...other, ms: other.duration_ms};
    }

    // Défi du jour : prévient les amis (une seule notification par ami, jeu et jour : remise à neuf si renvoyée)
    async challengeDaily(sender: string, gameCode: string, date: string, senderMs: number, friends: string[]) {
        await this.db.transaction().execute(async trx => {
            const data = {from: await this.player(trx, sender), gameCode, gameName: await this.gameName(trx, gameCode), date, senderMs};
            for (const friend of friends) await this.notify(trx, friend, "daily_challenge", `${gameCode}:${date}:${sender}`, data);
        });
    }

    // Défi vu par un joueur défié (undefined s'il n'existe pas ou qu'il n'y est pas invité)
    async forPlayer(challengeId: string, userId: string) {
        return this.db.selectFrom("friend_challenges as c")
            .innerJoin("friend_challenge_players as p", "p.challenge_id", "c.id")
            .innerJoin("users as s", "s.id", "c.sender_id")
            .innerJoin("games as g", "g.code", "c.game_code")
            .select([
                "c.id", "c.sender_id", "c.game_code", "c.puzzle", "c.grid_size", "c.empty_cells", "c.sender_ms", "c.difficulty", "c.created_at",
                "g.designation as game_name", "s.username as sender_username", "s.avatar as sender_avatar", "s.user_level as sender_level",
                "p.game_id", "p.duration_ms",
            ])
            .where("c.id", "=", challengeId)
            .where("p.user_id", "=", userId)
            .executeTakeFirst();
    }

    // Partie lancée par le joueur défié pour ce défi (son temps est vérifié dessus)
    async setGame(challengeId: string, userId: string, gameId: string) {
        await this.db.updateTable("friend_challenge_players").set({game_id: gameId})
            .where("challenge_id", "=", challengeId).where("user_id", "=", userId).execute();
    }

    // Temps de la partie `gameId` gagnée par le joueur (null si elle n'est pas (encore) terminée)
    async sessionTime(userId: string, gameId: string): Promise<number | null> {
        const row = await this.db.selectFrom("game_sessions").select("duration_ms")
            .where("game_id", "=", gameId).where("user_id", "=", userId).where("finished_at", "is not", null)
            .executeTakeFirst();
        return row?.duration_ms ?? null;
    }

    // Première réussite du défi par un joueur : enregistrée et annoncée à son adversaire (`opponent`, avec son temps,
    // null s'il n'a pas encore joué son côté du duel) ; false si déjà fait
    async recordResult(challengeId: string, userId: string, durationMs: number, opponent: { id: string; ms: number | null }): Promise<boolean> {
        return this.db.transaction().execute(async trx => {
            const updated = await trx.updateTable("friend_challenge_players")
                .set({duration_ms: durationMs, finished_at: new Date()})
                .where("challenge_id", "=", challengeId).where("user_id", "=", userId).where("duration_ms", "is", null)
                .returning("challenge_id")
                .executeTakeFirst();
            if (!updated) return false;
            const challenge = await trx.selectFrom("friend_challenges").select(["game_code", "difficulty"])
                .where("id", "=", challengeId).executeTakeFirstOrThrow();
            await this.notify(trx, opponent.id, "challenge_result", `${challengeId}:${userId}`, {
                challengeId, by: await this.player(trx, userId), gameCode: challenge.game_code,
                gameName: await this.gameName(trx, challenge.game_code), senderMs: opponent.ms, playerMs: durationMs,
                difficulty: challenge.difficulty,
            });
            return true;
        });
    }
}
