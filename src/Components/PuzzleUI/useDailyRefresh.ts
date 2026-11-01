import {useEffect, useState} from "react";

// Étalement des rafraîchissements après minuit, pour que tous les joueurs n'appellent pas le serveur ensemble
const MAX_JITTER_MS = 15_000;
// Nouvel essai si les défis du nouveau jour ne sont pas encore prêts
const RETRY_MS = 5_000;

/**
 * Rafraîchit une page du défi du jour au changement de jour.
 * - nextInMs : temps avant le prochain changement de jour, donné par le serveur (insensible à l'heure du PC)
 * - notReady : les défis du jour ne sont pas encore générés → nouvel essai dans quelques secondes
 * Renvoie un compteur qui augmente à chaque rafraîchissement : à mettre dans les dépendances du chargement.
 * Si l'ordinateur était en veille (minuteurs suspendus), le rafraîchissement a lieu au retour sur la page.
 */
export function useDailyRefresh(nextInMs: number | undefined, notReady = false): number {
    const [tick, setTick] = useState(0);

    useEffect(() => {
        if (nextInMs === undefined) return;
        const delay = notReady ? RETRY_MS : Math.max(nextInMs, 0) + 1000 + Math.random() * MAX_JITTER_MS;
        const deadline = Date.now() + delay;
        const refresh = () => setTick(t => t + 1);
        const timer = window.setTimeout(refresh, delay);

        const onVisible = () => {
            if (document.visibilityState === "visible" && Date.now() > deadline) refresh();
        };
        document.addEventListener("visibilitychange", onVisible);
        return () => {
            window.clearTimeout(timer);
            document.removeEventListener("visibilitychange", onVisible);
        };
    }, [nextInMs, notReady]);

    return tick;
}
