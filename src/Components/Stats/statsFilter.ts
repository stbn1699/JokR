/*
 * Filtres de la page Statistiques, gardés dans l'adresse de la page (lien partageable, gardé au rafraîchissement) :
 * - periode=24h | 7j | 30j : période glissante jusqu'à maintenant (recalculée à chaque chargement)
 * - de=…&a=… : période choisie à la minute près (dates ISO) ; l'un des deux peut manquer
 * - jeu=… : un seul jeu (code d'un puzzle, ou plinko / roulette)
 * Le serveur reçoit toujours ?de=…&a=…&jeu=… (voir backend/src/utils/statsFilter.ts).
 */

export const PRESETS = {
    "24h": {label: "24 h", ms: 24 * 3600 * 1000},
    "7j": {label: "7 jours", ms: 7 * 24 * 3600 * 1000},
    "30j": {label: "30 jours", ms: 30 * 24 * 3600 * 1000},
} as const;
export type Preset = keyof typeof PRESETS;

export type StatsFilter = { preset: Preset | null; from: string | null; to: string | null; game: string | null };

const isPreset = (v: string | null): v is Preset => v !== null && v in PRESETS;
const validDate = (v: string | null) => (v && !Number.isNaN(new Date(v).getTime()) ? v : null);

export function filterFromParams(params: URLSearchParams): StatsFilter {
    const preset = params.get("periode");
    return {
        preset: isPreset(preset) ? preset : null,
        from: isPreset(preset) ? null : validDate(params.get("de")),
        to: isPreset(preset) ? null : validDate(params.get("a")),
        game: params.get("jeu") || null,
    };
}

// Paramètres d'adresse de la page pour ces filtres (sans l'onglet)
export function filterParams(f: StatsFilter): Record<string, string> {
    const out: Record<string, string> = {};
    if (f.preset) out.periode = f.preset;
    else {
        if (f.from) out.de = f.from;
        if (f.to) out.a = f.to;
    }
    if (f.game) out.jeu = f.game;
    return out;
}

// Requête envoyée au serveur (« ?de=…&a=…&jeu=… », ou une chaîne vide sans filtre)
export function filterQuery(f: StatsFilter): string {
    const q = new URLSearchParams();
    if (f.preset) q.set("de", new Date(Date.now() - PRESETS[f.preset].ms).toISOString());
    else {
        if (f.from) q.set("de", f.from);
        if (f.to) q.set("a", f.to);
    }
    if (f.game) q.set("jeu", f.game);
    return q.size > 0 ? `?${q}` : "";
}

export const hasPeriod = (f: StatsFilter) => f.preset !== null || f.from !== null || f.to !== null;

// Titre des frises jour par jour : les 30 derniers jours, ou la période choisie
export const timelineTitle = (f: StatsFilter) => (hasPeriod(f) ? "sur la période" : "30 derniers jours");

// Champ <input type="datetime-local"> (heure de l'ordinateur) ↔ date ISO
export function toLocalInput(iso: string | null): string {
    if (!iso) return "";
    const d = new Date(iso);
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export const fromLocalInput = (value: string): string | null => (value ? new Date(value).toISOString() : null);
