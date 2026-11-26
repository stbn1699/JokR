import {useMemo} from "react";
import {useSearchParams} from "react-router-dom";
import {filterFromParams, filterParams, type StatsFilter} from "../Stats/statsFilter.ts";

/**
 * Filtres des pages de statistiques (période et jeu), gardés dans l'adresse (voir statsFilter.ts).
 * La période suit d'une page à l'autre (voir la barre latérale) ; le jeu reste propre à la page.
 */
export function useAdminFilter(): [StatsFilter, (next: StatsFilter) => void] {
    const [params, setParams] = useSearchParams();
    const key = params.toString();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    const filter = useMemo(() => filterFromParams(params), [key]);
    return [filter, next => setParams(filterParams(next), {replace: true})];
}

// Clé de cache d'un filtre (indépendante de l'heure, contrairement à la requête envoyée au serveur)
export const filterKey = (f: StatsFilter) => new URLSearchParams(filterParams(f)).toString();

// Partie de l'adresse à garder en changeant de page : la période seulement (pas le jeu ni les filtres propres à une page)
export function periodSearch(search: string): string {
    const current = new URLSearchParams(search);
    const params = new URLSearchParams();
    for (const key of ["periode", "de", "a"]) {
        const value = current.get(key);
        if (value) params.set(key, value);
    }
    const s = params.toString();
    return s ? `?${s}` : "";
}
