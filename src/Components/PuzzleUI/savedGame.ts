import {useEffect, useState} from "react";

/*
 * Partie en cours sauvegardée dans le navigateur (localStorage), pour la reprendre
 * après un rafraîchissement. La grille de départ et le temps viennent du serveur ;
 * on ne garde ici que l'identifiant de la partie et ce que le joueur a saisi.
 */

const key = (gameCode: string) => `jokr:game:${gameCode}`;

export function saveGame<T extends { gameId: string }>(gameCode: string, data: T) {
    try {
        localStorage.setItem(key(gameCode), JSON.stringify(data));
    } catch {
        // stockage indisponible : la partie ne pourra simplement pas être reprise
    }
}

export function loadGame<T extends { gameId: string }>(gameCode: string): T | null {
    try {
        const raw = localStorage.getItem(key(gameCode));
        const data: unknown = raw ? JSON.parse(raw) : null;
        return data && typeof data === "object" && "gameId" in data && typeof data.gameId === "string"
            ? data as T
            : null;
    } catch {
        return null;
    }
}

export function clearSavedGame(gameCode: string) {
    try {
        localStorage.removeItem(key(gameCode));
    } catch {
        // rien à faire
    }
}

export type Resumable<Saved, Grid> = {
    saved: Saved;
    // Grille de départ, renvoyée par le serveur
    grid: Grid;
    // Temps déjà écoulé au moment de la vérification
    elapsedMs: number;
    checkedAt: number;
};

/**
 * Au chargement de la page : y a-t-il une partie sauvegardée que le serveur connaît encore ?
 * Si le serveur ne la connaît plus (gagnée, expirée, serveur redémarré), la sauvegarde est effacée.
 */
export function useResumableGame<Saved extends { gameId: string }, Grid>(
    gameCode: string,
    fetchStatus: (gameId: string) => Promise<{ grid: Grid; elapsedMs: number }>,
    enabled = true,
) {
    const [resumable, setResumable] = useState<Resumable<Saved, Grid> | null>(null);

    useEffect(() => {
        if (!enabled) return;
        const saved = loadGame<Saved>(gameCode);
        if (!saved) return;
        let cancelled = false;
        fetchStatus(saved.gameId)
            .then(status => {
                if (!cancelled) setResumable({saved, ...status, checkedAt: Date.now()});
            })
            .catch(() => clearSavedGame(gameCode));
        return () => {
            cancelled = true;
        };
        // Vérification une seule fois, à l'ouverture de la page
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [gameCode]);

    return {resumable, dismissResumable: () => setResumable(null)};
}
