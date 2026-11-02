import {useStoredFlag} from "./useStoredFlag.ts";

/**
 * Option "Montrer les erreurs" (cases qui contredisent déjà les règles, en rouge).
 * Le choix est retenu dans le navigateur, pour tous les jeux.
 */
export function useShowErrors(): [boolean, (value: boolean) => void] {
    return useStoredFlag("jokr:showErrors");
}
