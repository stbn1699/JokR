import {useCallback, useEffect, useState} from "react";

/**
 * Chargement des statistiques avec un cache partagé entre les pages de la console : passer de « Activité »
 * à « Jeux » réutilise les données déjà chargées pour la même période. Au-delà d'une minute, elles s'affichent
 * tout de suite puis se rechargent en arrière-plan. `reload()` force le rechargement (bouton Actualiser).
 */

const FRESH_MS = 60_000;
const cache = new Map<string, { data: unknown; at: number }>();

type State<T> = { key: string; data: T | null; error: string | null };

export function useStatsData<T>(key: string, fetcher: (signal?: AbortSignal) => Promise<T>) {
    const cached = () => (cache.get(key)?.data as T | undefined) ?? null;
    const [state, setState] = useState<State<T>>(() => ({key, data: cached(), error: null}));
    const [loading, setLoading] = useState(false);

    const load = useCallback(async (signal?: AbortSignal) => {
        setLoading(true);
        try {
            const data = await fetcher(signal);
            cache.set(key, {data, at: Date.now()});
            setState({key, data, error: null});
        } catch (err) {
            if ((err as Error).name === "AbortError") return;
            setState(s => ({key, data: s.key === key ? s.data : null, error: (err as Error).message || "Impossible de charger les données"}));
        } finally {
            if (!signal?.aborted) setLoading(false);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [key]);

    useEffect(() => {
        const entry = cache.get(key);
        if (entry && Date.now() - entry.at < FRESH_MS) return;
        const controller = new AbortController();
        const timer = window.setTimeout(() => void load(controller.signal), 0);
        return () => {
            window.clearTimeout(timer);
            controller.abort();
        };
    }, [key, load]);

    const current = state.key === key;
    return {
        data: current ? state.data ?? cached() : cached(),
        error: current ? state.error : null,
        loading,
        reload: () => void load(),
    };
}
