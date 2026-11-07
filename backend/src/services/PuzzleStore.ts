import {randomUUID} from "node:crypto";

/*
 * Mémorise en mémoire les grilles générées par le serveur (Sudoku, Binero...).
 * La validation n'accepte qu'une solution d'une grille connue, et une seule fois :
 * impossible d'envoyer une grille "maison" ou de rejouer la même victoire.
 *
 * Une partie gagnée (supprimée) reste lisible 24 h avec getFinished : on peut en envoyer la grille
 * à un ami (défi entre amis), sans pouvoir la valider une deuxième fois.
 *
 * Limite : les parties en cours sont perdues au redémarrage du serveur
 * (à remplacer par une table si besoin de persistance ou de plusieurs instances).
 */

export type StoredPuzzle<P> = {
    puzzle: P;
    // Date du défi du jour si la partie en est un (AAAA-MM-JJ), sinon absent
    daily?: string;
    cluesCount: number;
    createdAt: number;
};

const GAME_TTL_MS = 6 * 60 * 60 * 1000; // 6h
const FINISHED_TTL_MS = 24 * 60 * 60 * 1000; // 24h
const MAX_GAMES = 10_000;

export class PuzzleStore<P> {
    private games = new Map<string, StoredPuzzle<P>>();
    // Parties terminées : grille gardée 24 h (défier un ami avec la même grille)
    private finished = new Map<string, StoredPuzzle<P> & { finishedAt: number }>();

    // cluesCount : nombre de chiffres donnés au départ (sert au calcul de l'XP)
    create(puzzle: P, cluesCount: number, options: { daily?: string } = {}): string {
        this.purgeExpired();
        // Map garde l'ordre d'insertion : on supprime la plus ancienne si on est plein
        if (this.games.size >= MAX_GAMES) {
            const oldest = this.games.keys().next().value;
            if (oldest) this.games.delete(oldest);
        }

        const gameId = randomUUID();
        this.games.set(gameId, {puzzle, cluesCount, createdAt: Date.now(), ...options});
        return gameId;
    }

    get(gameId: string): StoredPuzzle<P> | undefined {
        const game = this.games.get(gameId);
        if (game && Date.now() - game.createdAt > GAME_TTL_MS) {
            this.games.delete(gameId);
            return undefined;
        }
        return game;
    }

    // Partie terminée : elle ne peut plus être validée, mais sa grille reste lisible 24 h (getFinished)
    delete(gameId: string): void {
        const game = this.games.get(gameId);
        this.games.delete(gameId);
        if (!game) return;
        if (this.finished.size >= MAX_GAMES) {
            const oldest = this.finished.keys().next().value;
            if (oldest) this.finished.delete(oldest);
        }
        this.finished.set(gameId, {...game, finishedAt: Date.now()});
    }

    // Grille d'une partie terminée depuis moins de 24 h
    getFinished(gameId: string): StoredPuzzle<P> | undefined {
        const game = this.finished.get(gameId);
        if (game && Date.now() - game.finishedAt > FINISHED_TTL_MS) {
            this.finished.delete(gameId);
            return undefined;
        }
        return game;
    }

    private purgeExpired(): void {
        const now = Date.now();
        for (const [id, game] of this.games) {
            if (now - game.createdAt > GAME_TTL_MS) this.games.delete(id);
        }
        for (const [id, game] of this.finished) {
            if (now - game.finishedAt > FINISHED_TTL_MS) this.finished.delete(id);
        }
    }
}
