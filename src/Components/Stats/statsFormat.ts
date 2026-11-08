import {formatDuration} from "../../Services/format.ts";

// Formats des nombres et des dates de la page Statistiques
export const fmt = (n: number) => Math.round(n).toLocaleString("fr-FR");
export const pct = (part: number, total: number) => (total > 0 ? `${Math.round((part / total) * 100)} %` : "–");
// pourcentage avec une décimale (taux de retour)
export const pct1 = (part: number, total: number) => (total > 0 ? `${((part / total) * 100).toFixed(1).replace(".", ",")} %` : "–");
export const duration = (ms: number | null) => (ms === null ? "–" : formatDuration(ms));
export const dateTime = (iso: string | null) => (iso ? new Date(iso).toLocaleString("fr-FR", {dateStyle: "short", timeStyle: "short"}) : "–");
export const shortDay = (day: string) => `${day.slice(8, 10)}/${day.slice(5, 7)}`;
export const longDay = (day: string) => new Date(day).toLocaleDateString("fr-FR", {weekday: "long", day: "numeric", month: "long"});
