/*
 * Versions du site (format 1.7.0) : comparaison et nouveautés depuis une version donnée.
 */

// Version du site en cours (package.json, injectée au build)
export const APP_VERSION = __APP_VERSION__;

const parts = (v: string) => v.split(".").map(n => Number.parseInt(n, 10) || 0);

// < 0 si a est plus ancienne que b, 0 si égales, > 0 si a est plus récente
export function compareVersions(a: string, b: string): number {
    const [pa, pb] = [parts(a), parts(b)];
    for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
        const diff = (pa[i] ?? 0) - (pb[i] ?? 0);
        if (diff !== 0) return diff;
    }
    return 0;
}

// Versions sorties après `since`, jusqu'à `current` comprise (dans l'ordre reçu, la plus récente d'abord)
export function versionsSince<T extends { version: string }>(versions: T[], since: string, current: string): T[] {
    return versions.filter(v => compareVersions(v.version, since) > 0 && compareVersions(v.version, current) <= 0);
}

// Le 3e chiffre est réservé aux petits correctifs : ils ne déclenchent pas la popup des nouveautés
const isPatch = (v: string) => (parts(v)[2] ?? 0) !== 0;
const withoutPatch = (v: string) => parts(v).slice(0, 2).join(".");

// Vraie nouvelle version depuis `since` (le 1er ou le 2e chiffre a augmenté) : 4.0.0 → 4.1.0 oui, 4.0.0 → 4.0.1 non
export const hasNewRelease = (since: string, current: string) =>
    compareVersions(withoutPatch(since), withoutPatch(current)) < 0;

// Versions à présenter dans la popup : celles sorties depuis `since`, sans les petits correctifs
export const releasesSince = <T extends { version: string }>(versions: T[], since: string, current: string): T[] =>
    versionsSince(versions, since, current).filter(v => !isPatch(v.version));

// Apparu après la dernière visite (`since` = version vue la dernière fois, null = pas de nouveautés à montrer)
export const isNewSince = (addedIn: string | undefined, since: string | null) =>
    since !== null && addedIn !== undefined && compareVersions(addedIn, since) > 0;
