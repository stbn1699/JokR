import {useEffect, useState} from "react";
import {dailyService} from "../../Services/daily.service.ts";
import type {DailyMonth} from "../../Models/daily.model.ts";
import {useAuth} from "../../Context/authContext.ts";
import {useDailyRefresh} from "../PuzzleUI/useDailyRefresh.ts";

/**
 * Défis d'un mois (AAAA-MM, mois courant si absent) et résultats du joueur connecté.
 * Rechargés à la connexion / déconnexion et après minuit (nouveau défi).
 * `dayTick` augmente à chaque changement de jour : à utiliser pour recharger ce qui en dépend.
 */
export function useDailyMonth(month: string | undefined, enabled = true) {
    const {userId} = useAuth();
    const [data, setData] = useState<DailyMonth | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [nextInMs, setNextInMs] = useState<number | undefined>(undefined);
    const dayTick = useDailyRefresh(enabled ? nextInMs : undefined);

    useEffect(() => {
        if (!enabled) return;
        const controller = new AbortController();
        dailyService.overview(controller.signal)
            .then(o => setNextInMs(o.nextInMs))
            .catch(() => undefined);
        dailyService.history(month, controller.signal)
            .then(d => {
                setData(d);
                setError(null);
            })
            .catch((err: Error) => {
                if (err.name !== "AbortError") setError(err.message || "Impossible de charger les défis.");
            });
        return () => controller.abort();
    }, [userId, dayTick, month, enabled]);

    return {data, error, dayTick};
}
