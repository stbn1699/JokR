import {useEffect, useState} from "react";
import {dailyService} from "../../Services/daily.service.ts";
import type {DailyResult, DailyStart} from "../../Models/daily.model.ts";
import {loadGame, clearSavedGame} from "./savedGame.ts";

/**
 * Défi du jour : au chargement de la page,
 * - reprend le défi déjà commencé (sauvegardé dans le navigateur et encore connu du serveur),
 * - sinon commence le défi du jour,
 * - ou signale qu'il est déjà réussi aujourd'hui (`done`).
 * `onLoad` reçoit la grille de départ, la sauvegarde (saisies) et le temps déjà écoulé.
 * `start` permet de charger autre chose que le défi du jour (ex. rejouer un jour passé).
 * Pendant le chargement, `loading` est vrai et `loadingSize` donne la taille de la grille du jour quand
 * elle est connue (liste des défis du jour, demandée en parallèle) : de quoi afficher une grille vide.
 */
export function useDailyGame<Saved extends { gameId: string }, Grid>(options: {
    enabled: boolean;
    gameCode: string;
    saveKey: string;
    fetchStatus: (gameId: string) => Promise<{ grid: Grid; elapsedMs: number }>;
    emptySave: (gameId: string) => Saved;
    onLoad: (grid: Grid, saved: Saved, elapsedMs: number) => void;
    start?: () => Promise<DailyStart<Grid>>;
}) {
    const [date, setDate] = useState<string | null>(null);
    const [done, setDone] = useState<DailyResult | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(options.enabled);
    const [loadingSize, setLoadingSize] = useState<number | null>(null);

    useEffect(() => {
        if (!options.enabled) return;
        let cancelled = false;

        // Taille de la grille du jour (pas pour un jour passé rejoué)
        if (!options.start) {
            dailyService.overview()
                .then(overview => {
                    const size = overview.games.find(g => g.code === options.gameCode)?.size;
                    if (!cancelled && size) setLoadingSize(size);
                })
                .catch(() => undefined);
        }

        const start = async () => {
            // Défi déjà commencé sur ce navigateur ?
            const saved = loadGame<Saved>(options.saveKey);
            if (saved) {
                try {
                    const status = await options.fetchStatus(saved.gameId);
                    if (!cancelled) options.onLoad(status.grid, saved, status.elapsedMs);
                    return;
                } catch {
                    clearSavedGame(options.saveKey);
                }
            }

            const started = options.start ? await options.start() : await dailyService.start<Grid>(options.gameCode);
            if (cancelled) return;
            setDate(started.date);
            if (started.alreadyDone) setDone(started.result);
            else options.onLoad(started.grid, options.emptySave(started.gameId), 0);
        };

        start()
            .catch((err: Error) => {
                if (!cancelled) setError(err.message || "Impossible de charger le défi du jour.");
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });
        return () => {
            cancelled = true;
        };
        // Une seule fois, à l'ouverture de la page
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [options.enabled]);

    return {date, done, error, loading, loadingSize: loading ? loadingSize : null};
}
