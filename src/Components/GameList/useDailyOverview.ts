import {useEffect, useState} from "react";
import {dailyService} from "../../Services/daily.service.ts";
import type {DailyOverview} from "../../Models/daily.model.ts";
import {useAuth} from "../../Context/authContext.ts";
import {useDailyRefresh} from "../PuzzleUI/useDailyRefresh.ts";

/**
 * Défis du jour et résultats du joueur connecté (accueil).
 * Rechargés à la connexion / déconnexion et tout seuls après minuit (nouveaux défis).
 * null tant que rien n'est chargé (ou si le serveur ne répond pas : l'accueil s'affiche sans les défis).
 */
export function useDailyOverview(): DailyOverview | null {
    const {userId} = useAuth();
    const [overview, setOverview] = useState<DailyOverview | null>(null);
    const dayTick = useDailyRefresh(overview?.nextInMs, overview ? !overview.ready : false);

    useEffect(() => {
        const controller = new AbortController();
        dailyService.overview(controller.signal)
            .then(setOverview)
            .catch(() => setOverview(null));
        return () => controller.abort();
    }, [userId, dayTick]);

    return overview;
}
