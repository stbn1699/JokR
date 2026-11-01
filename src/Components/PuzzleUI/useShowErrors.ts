import {useState} from "react";

const STORAGE_KEY = "jokr:showErrors";

function readSetting(): boolean {
    try {
        return localStorage.getItem(STORAGE_KEY) === "1";
    } catch {
        return false;
    }
}

/**
 * Option "Montrer les erreurs" (cases qui contredisent déjà les règles, en rouge).
 * Le choix est retenu dans le navigateur, pour tous les jeux.
 */
export function useShowErrors(): [boolean, (value: boolean) => void] {
    const [showErrors, setShowErrors] = useState(readSetting);

    const update = (value: boolean) => {
        setShowErrors(value);
        try {
            localStorage.setItem(STORAGE_KEY, value ? "1" : "0");
        } catch {
            // stockage indisponible (navigation privée...) : l'option reste valable pour cette page
        }
    };

    return [showErrors, update];
}
