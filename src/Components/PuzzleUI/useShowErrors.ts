import {useStoredFlag} from "./useStoredFlag.ts";

/**
 * Option « Montrer les coups interdits » (ce qui contredit déjà les règles, en rouge ; pas les cases mal placées).
 * Le choix est retenu dans le navigateur, pour tous les jeux.
 */
export function useShowErrors(): [boolean, (value: boolean) => void] {
    return useStoredFlag("jokr:showErrors");
}
