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

// Apparu après la dernière visite (`since` = version vue la dernière fois, null = pas de nouveautés à montrer)
export const isNewSince = (addedIn: string | undefined, since: string | null) =>
    since !== null && addedIn !== undefined && compareVersions(addedIn, since) > 0;
