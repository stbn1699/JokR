/*
 * Qui est où sur le site, onglet par onglet : chaque onglet ouvert envoie sa page toutes les 15 secondes
 * (toutes les 5 s pendant une mise à jour) avec POST /maintenance/presence. Sans nouvelles depuis TIMEOUT_MS,
 * l'onglet est oublié (fermé, ordinateur en veille).
 * - page : site (pages sans partie), puzzle, roulette, plinko ou slots (machines à sous) ; un puzzle donne aussi son jeu et le début
 *   de la partie s'il y en a une en cours
 * - closed : l'onglet affiche l'écran « Mise à jour en cours »
 * Pendant une mise à jour, chaque onglet qui passe sur l'écran est noté (journal) : l'onglet « En direct »
 * des Statistiques prévient l'administrateur et compte les joueurs envoyés, page par page.
 */

export const PAGES = ["site", "puzzle", "roulette", "plinko", "slots"] as const;
export type Page = typeof PAGES[number];
export const isPage = (v: unknown): v is Page => typeof v === "string" && (PAGES as readonly string[]).includes(v);

export const TIMEOUT_MS = 40_000;
const MAX_TABS = 20_000;

export type Presence = {
    key: string;
    page: Page;
    gameCode: string | null;
    challenge: boolean;
    userId: string | null;
    // début de la partie de puzzle en cours (heure du serveur), null sans partie
    startedAt: number | null;
    closed: boolean;
    lastSeen: number;
};

// Onglet envoyé sur l'écran de mise à jour : quand, et depuis quelle page
export type SentEvent = { at: number; page: Page };

const tabs = new Map<string, Presence>();
let events: SentEvent[] = [];

function purge(now: number): void {
    for (const [key, p] of tabs) if (now - p.lastSeen > TIMEOUT_MS) tabs.delete(key);
}

export const presence = {
    // `recording` : mise à jour en cours, les passages sur l'écran sont notés
    update(p: Omit<Presence, "lastSeen">, recording: boolean, now = Date.now()): void {
        purge(now);
        const prev = tabs.get(p.key);
        if (!prev && tabs.size >= MAX_TABS) return;
        // page d'avant l'écran : l'onglet qui y passe n'a plus de page de jeu ouverte
        if (recording && p.closed && prev && !prev.closed) events.push({at: now, page: prev.page});
        tabs.set(p.key, {...p, page: p.closed && prev ? prev.page : p.page, lastSeen: now});
    },

    remove(key: string): void {
        tabs.delete(key);
    },

    list(now = Date.now()): Presence[] {
        purge(now);
        return [...tabs.values()];
    },

    // nouvelle mise à jour (ou réouverture) : journal remis à zéro
    clearEvents(): void {
        events = [];
    },

    events: (): SentEvent[] => events,
};
