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

/**
 * Instant du prochain changement de jour à Paris (minuit), à la seconde près.
 * Recherche par dichotomie plutôt que calcul : juste même les jours de changement d'heure.
 */
export function nextDailyChange(now: Date = new Date()): Date {
    const today = dailyDate(now);
    let low = now.getTime();
    let high = low + 26 * 60 * 60 * 1000;
    while (high - low > 1000) {
        const mid = Math.floor((low + high) / 2);
        if (dailyDate(new Date(mid)) === today) low = mid;
        else high = mid;
    }
    // Le changement tombe sur une seconde pile, entre low (exclu) et high
    const second = Math.ceil(low / 1000) * 1000;
    return new Date(dailyDate(new Date(second)) === today ? second + 1000 : second);
}
