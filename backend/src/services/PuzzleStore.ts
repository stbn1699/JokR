import {randomUUID} from "node:crypto";

/*
 * Mémorise en mémoire les grilles générées par le serveur (Sudoku, Binero...).
 * La validation n'accepte qu'une solution d'une grille connue, et une seule fois :
 * impossible d'envoyer une grille "maison" ou de rejouer la même victoire.
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
const MAX_GAMES = 10_000;

export class PuzzleStore<P> {
    private games = new Map<string, StoredPuzzle<P>>();

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

    delete(gameId: string): void {
        this.games.delete(gameId);
    }

    private purgeExpired(): void {
        const now = Date.now();
        for (const [id, game] of this.games) {
            if (now - game.createdAt > GAME_TTL_MS) this.games.delete(id);
        }
    }
}
