import {useState} from "react";

function readFlag(key: string): boolean {
    try {
        return localStorage.getItem(key) === "1";
    } catch {
        return false;
    }
}

/**
 * Option oui / non retenue dans le navigateur (clé `key` du localStorage).
 * Si le stockage est indisponible (navigation privée...), l'option vaut pour la page en cours.
 */
export function useStoredFlag(key: string): [boolean, (value: boolean) => void] {
    const [value, setValue] = useState(() => readFlag(key));

    const update = (next: boolean) => {
        setValue(next);
        try {
            localStorage.setItem(key, next ? "1" : "0");
        } catch {
            // stockage indisponible : l'option reste valable pour cette page
        }
    };

    return [value, update];
}
