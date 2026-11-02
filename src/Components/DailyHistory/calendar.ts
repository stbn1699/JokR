/*
 * Petits calculs de calendrier pour la page des défis (dates au format AAAA-MM-JJ, mois AAAA-MM).
 * Tout est fait en UTC : on manipule des jours du calendrier, pas des instants.
 */

const capitalize = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

const monthDate = (month: string) => {
    const [year, index] = month.split("-").map(Number);
    return new Date(Date.UTC(year!, index! - 1, 1));
};

const toMonthKey = (d: Date) => `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;

// "2026-11" → "Novembre 2026"
export function monthLabel(month: string): string {
    return capitalize(monthDate(month).toLocaleDateString("fr-FR", {month: "long", year: "numeric", timeZone: "UTC"}));
}

// Mois précédent / suivant : "2026-01" → "2025-12"
export function shiftMonth(month: string, delta: number): string {
    const d = monthDate(month);
    d.setUTCMonth(d.getUTCMonth() + delta);
    return toMonthKey(d);
}

// Tous les mois de `from` à `to` inclus, du plus récent au plus ancien
export function monthsBetween(from: string, to: string): string[] {
    const months: string[] = [];
    for (let m = to; m >= from; m = shiftMonth(m, -1)) months.push(m);
    return months;
}

// Jours d'un mois : "2026-11-01" … "2026-11-30"
export function daysOfMonth(month: string): string[] {
    const d = monthDate(month);
    const count = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate();
    return Array.from({length: count}, (_, i) => `${month}-${String(i + 1).padStart(2, "0")}`);
}

// "2026-11-02" → "lun."
export function weekdayShort(date: string): string {
    const [year, month, day] = date.split("-").map(Number);
    return new Date(Date.UTC(year!, month! - 1, day!)).toLocaleDateString("fr-FR", {weekday: "short", timeZone: "UTC"});
}

// "2026-11-02" → "Lundi 2 novembre 2026"
export function longDate(date: string): string {
    const [year, month, day] = date.split("-").map(Number);
    const label = new Date(Date.UTC(year!, month! - 1, day!))
        .toLocaleDateString("fr-FR", {weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "UTC"});
    return capitalize(day === 1 ? label.replace(/ 1 /, " 1er ") : label);
}
