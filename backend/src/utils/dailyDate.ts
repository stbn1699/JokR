// Fuseau de référence du défi du jour : il change à minuit, heure de Paris
const DAILY_TIME_ZONE = "Europe/Paris";

// Date du jour à Paris, au format AAAA-MM-JJ
export function dailyDate(now: Date = new Date()): string {
    // en-CA formate les dates en AAAA-MM-JJ
    return new Intl.DateTimeFormat("en-CA", {
        timeZone: DAILY_TIME_ZONE,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    }).format(now);
}
