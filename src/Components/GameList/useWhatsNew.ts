import {useEffect, useState} from "react";
import changelog from "../../../CHANGELOG.md?raw";
import {type ChangelogVersion, parseChangelog} from "../Changelog/parseChangelog.ts";
import {APP_VERSION, compareVersions, versionsSince} from "../../Services/version.ts";
import {userService} from "../../Services/user.service.ts";

// Dernière version vue par un invité (dans son navigateur)
const GUEST_KEY = "jokr:lastVersion";
// Visite en cours : version vue la fois précédente (pastilles « Nouveau » jusqu'à la fin de la visite)
const SESSION_KEY = "jokr:newSince";

function read(storage: () => Storage, key: string): string | null {
    try {
        return storage().getItem(key);
    } catch {
        return null;
    }
}

function write(storage: () => Storage, key: string, value: string) {
    try {
        storage().setItem(key, value);
    } catch {
        // stockage indisponible (navigation privée...) : tant pis, rien de grave
    }
}

// Déjà décidé pendant cette visite : "" = rien de nouveau, sinon la version vue la fois précédente
const sessionSince = () => read(() => sessionStorage, SESSION_KEY);

/**
 * Nouveautés depuis la dernière visite du joueur (accueil).
 * - Dernière version vue : sur son compte (connecté, la même sur tous ses appareils) ou dans son navigateur (invité)
 * - Plus ancienne que la version du site : popup avec les nouveautés de chaque version sortie depuis,
 *   et `since` (cette version) pour mettre une pastille « Nouveau » sur les jeux apparus depuis
 * - Les pastilles restent jusqu'à la fin de la visite ; la popup ne s'affiche qu'une fois
 * - Première visite (ou compte tout neuf) : rien, la version actuelle est simplement enregistrée
 */
export function useWhatsNew(isLoggedIn: boolean) {
    const [since, setSince] = useState<string | null>(() => sessionSince() || null);
    const [versions, setVersions] = useState<ChangelogVersion[]>([]);

    useEffect(() => {
        // Déjà fait pendant cette visite
        if (sessionSince() !== null) return;
        let cancelled = false;

        const run = async () => {
            const previous = isLoggedIn
                ? (await userService.getMe()).lastVersion ?? null
                : read(() => localStorage, GUEST_KEY);
            if (cancelled) return;

            const isNewer = previous !== null && compareVersions(previous, APP_VERSION) < 0;
            write(() => sessionStorage, SESSION_KEY, isNewer ? previous : "");
            if (isNewer) {
                setSince(previous);
                setVersions(versionsSince(parseChangelog(changelog), previous, APP_VERSION));
            }
            // Version actuelle vue (aussi la première fois)
            if (previous === null || isNewer) {
                if (isLoggedIn) await userService.markVersionSeen(APP_VERSION);
                else write(() => localStorage, GUEST_KEY, APP_VERSION);
            }
        };
        run().catch(() => undefined);
        return () => {
            cancelled = true;
        };
    }, [isLoggedIn]);

    return {since, versions, closePopup: () => setVersions([])};
}
