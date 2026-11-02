import type {Device} from "../db/schema.js";

/*
 * Type d'appareil lu dans le User-Agent du navigateur (statistiques uniquement).
 * Approximatif : un iPad récent se présente comme un Mac et compte donc comme un ordinateur.
 */
export function deviceFromUserAgent(userAgent: string | undefined): Device | null {
    if (!userAgent) return null;
    if (/iPad|Tablet|PlayBook|Silk|Kindle/i.test(userAgent)) return "tablet";
    // Android sans "Mobile" : tablette
    if (/Android/i.test(userAgent) && !/Mobile/i.test(userAgent)) return "tablet";
    if (/Mobi|iPhone|iPod|Android|Windows Phone/i.test(userAgent)) return "mobile";
    return "desktop";
}
