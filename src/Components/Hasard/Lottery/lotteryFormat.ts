import type {LotteryInfo} from "../../../Services/casino.service.ts";

// Textes et nombres des loteries, partagés par le bandeau du Hasard et la page de détail

export const LOTTERY_NAMES: Record<LotteryInfo["kind"], string> = {day: "Loterie du jour", week: "Loterie de la semaine", month: "Loterie du mois"};
export const LOTTERY_SHORT: Record<LotteryInfo["kind"], string> = {day: "Jour", week: "Semaine", month: "Mois"};

export const fmt = (n: number) => Math.round(n).toLocaleString("fr-FR");

// « ce soir à 23 h 59 », « dimanche 15 novembre à 23 h 59 »
export function drawLabel(kind: LotteryInfo["kind"], at: number) {
    if (kind === "day") return "ce soir à 23 h 59";
    return `${new Date(at).toLocaleDateString("fr-FR", {weekday: "long", day: "numeric", month: "long", timeZone: "Europe/Paris"})} à 23 h 59`;
}

// « 5 h 12 min », « 3 j 4 h », « 42 s »
export function countdown(ms: number) {
    const s = Math.max(0, Math.floor(ms / 1000));
    const d = Math.floor(s / 86400), h = Math.floor((s % 86400) / 3600), m = Math.floor((s % 3600) / 60);
    if (d > 0) return `${d} j ${h} h`;
    if (h > 0) return `${h} h ${String(m).padStart(2, "0")} min`;
    if (m > 0) return `${m} min ${String(s % 60).padStart(2, "0")} s`;
    return `${s} s`;
}

// Chances de gagner, en pourcentage lisible
export function chance(mine: number, total: number) {
    if (mine === 0 || total === 0) return "0 %";
    const p = mine / total * 100;
    if (p >= 99.95) return "100 %";
    if (p < 0.1) return "moins de 0,1 %";
    return `${p.toLocaleString("fr-FR", {maximumFractionDigits: p < 10 ? 1 : 0})} %`;
}

export const shortDate = (date: string) => new Date(`${date}T12:00:00`).toLocaleDateString("fr-FR", {day: "numeric", month: "short"});
