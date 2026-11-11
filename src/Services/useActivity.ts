import {useEffect} from "react";
import {type Activity, setActivity} from "./maintenance.ts";

/*
 * Une page de jeu dit ce qu'elle fait (partie de puzzle en cours, dernier tour de roulette, billes en l'air) :
 * pendant une mise à jour, l'onglet ne passe sur l'écran « Mise à jour en cours » qu'une fois fini
 * (voir Services/maintenance.ts). Effacé en quittant la page.
 */
export function useActivity(activity: Activity) {
    const key = JSON.stringify(activity);
    useEffect(() => {
        setActivity(JSON.parse(key) as Activity);
    }, [key]);
    useEffect(() => () => setActivity(null), []);
}
