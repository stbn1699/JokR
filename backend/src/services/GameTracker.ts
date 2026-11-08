import type {NextFunction, Request, Response} from "express";
import {sql, type Kysely} from "kysely";
import type {DB, GameMode} from "../db/schema.js";
import {peekUserId} from "../middleware/auth.js";
import {isGhost} from "./adminMode.js";
import {deviceFromUserAgent} from "../utils/device.js";

// Dernière activité d'un joueur : écrite au plus une fois toutes les 5 minutes
const LAST_SEEN_THROTTLE_MS = 5 * 60 * 1000;

export type StartedGame = {
    gameId: string;
    gameCode: string;
    mode: GameMode;
    gridSize: number;
    emptyCells: number;
};

/*
 * Enregistre ce qui se passe pendant les parties, pour la page Statistiques :
 * partie lancée (invités compris), grille envoyée fausse, partie gagnée, dernière activité des joueurs.
 *
 * Les statistiques ne doivent jamais gêner le jeu : chaque écriture est lancée sans être attendue,
 * et une erreur est seulement écrite dans les logs.
 */
export class GameTracker {
    private lastSeen = new Map<string, number>();
    // Insertion de chaque partie encore en cours d'écriture : les mises à jour de cette partie l'attendent
    private pending = new Map<string, Promise<unknown>>();

    constructor(private readonly db: Kysely<DB>) {}

    started(req: Request, game: StartedGame): void {
        const userId = peekUserId(req);
        // mode admin : la partie n'est pas notée (ses mises à jour suivantes ne trouvent rien à changer)
        if (isGhost(userId)) return;
        const insert = this.db.insertInto("game_sessions").values({
            game_id: game.gameId,
            game_code: game.gameCode,
            mode: game.mode,
            user_id: userId,
            logged_in: userId !== null,
            grid_size: game.gridSize,
            empty_cells: game.emptyCells,
            device: deviceFromUserAgent(req.headers["user-agent"]),
        }).execute();
        const done = insert.catch(() => undefined).finally(() => this.pending.delete(game.gameId));
        this.pending.set(game.gameId, done);
        this.run("started", insert);
    }

    failed(gameId: string): void {
        this.run("failed", this.afterInsert(gameId, () => this.db.updateTable("game_sessions")
            .set({failed_attempts: sql`failed_attempts + 1`})
            .where("game_id", "=", gameId)
            .execute()));
    }

    // userId : joueur connecté à la victoire (il a pu se connecter en cours de partie)
    finished(gameId: string, durationMs: number, userId: string | undefined): void {
        const update = this.db.updateTable("game_sessions")
            .set({finished_at: new Date(), duration_ms: durationMs})
            .where("game_id", "=", gameId)
            .where("finished_at", "is", null);
        this.run("finished", this.afterInsert(gameId, () => (userId
            ? update.set({user_id: sql`coalesce(user_id, ${userId}::uuid)`, logged_in: true})
            : update).execute()));
    }

    // Middleware : note la dernière activité des joueurs connectés (sans jamais bloquer la requête)
    readonly activity = (req: Request, _res: Response, next: NextFunction) => {
        const userId = peekUserId(req);
        const now = Date.now();
        if (userId && !isGhost(userId) && now - (this.lastSeen.get(userId) ?? 0) > LAST_SEEN_THROTTLE_MS) {
            this.lastSeen.set(userId, now);
            this.run("activity", this.db.updateTable("users").set({last_seen_at: new Date(now)}).where("id", "=", userId).execute());
        }
        next();
    };

    // Une mise à jour qui arrive avant la fin de l'insertion de sa partie (grille validée très vite) l'attend
    private async afterInsert(gameId: string, update: () => Promise<unknown>): Promise<unknown> {
        await this.pending.get(gameId);
        return update();
    }

    private run(what: string, query: Promise<unknown>): void {
        query.catch(err => console.error(`[stats] ${what}`, err));
    }
}
