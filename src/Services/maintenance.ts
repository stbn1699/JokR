import {useSyncExternalStore} from "react";
import {ApiError} from "../api/api.ts";
import {maintenanceService, type PresenceBody} from "./maintenance.service.ts";

/*
 * Mise à jour du site vue par cet onglet, partagée par toutes les pages.
 *
 * L'onglet dit au serveur où il est (POST /maintenance/presence) toutes les 15 s, toutes les 5 s pendant une
 * mise à jour ou quand le serveur ne répond plus ; la réponse donne l'état de la mise à jour.
 * Les pages de jeu déclarent ce qu'elles font (useActivity) :
 * - puzzle : partie en cours ou non
 * - roulette : dernier tour pas encore fini (busy)
 * - plinko : billes encore en l'air (busy)
 * - slots : rouleaux en train de tourner (busy)
 *
 * Mise à jour activée : l'onglet passe sur l'écran « Mise à jour en cours » (App.tsx) dès qu'il n'a plus rien
 * en cours — tout de suite hors des pages de jeu, à la dernière bille, à la fin du dernier tour de roulette,
 * à la grille validée (ou au bout du temps laissé pour finir un puzzle). Il y reste ensuite.
 * Serveur coupé (redémarrage) : même écran. À la fin (serveur revenu, ou mise à jour désactivée), retour à
 * l'accueil, rechargé pour avoir la nouvelle version du site.
 */

export type Activity =
    | { page: "puzzle"; gameCode: string; challenge: boolean; startedAt: number | null }
    | { page: "roulette" | "plinko" | "slots"; busy: boolean };

export type SiteMaintenance = {
    on: boolean;
    since: number | null;
    // dernier tour de roulette où l'on peut miser
    lastRound: number | null;
    // serveur injoignable
    down: boolean;
    // fin du temps laissé pour finir un puzzle (heure du navigateur), et temps écoulé
    deadline: number | null;
    expired: boolean;
    activity: Activity | null;
    // onglet passé sur l'écran de mise à jour
    sent: boolean;
};

const POLL_MS = 15_000;
const POLL_FAST_MS = 5_000;
// échecs de suite avant l'écran (un raté réseau isolé ne compte pas)
const DOWN_AFTER = 2;

const tabKey = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;

let state: SiteMaintenance = {on: false, since: null, lastRound: null, down: false, deadline: null, expired: false, activity: null, sent: false};
let failures = 0;
let timer: number | null = null;
let deadlineTimer: number | null = null;
const listeners = new Set<() => void>();

function update(patch: Partial<SiteMaintenance>) {
    const next = {...state, ...patch};
    const changed = (Object.keys(patch) as (keyof SiteMaintenance)[]).some(k => next[k] !== state[k]);
    if (!changed) return;
    state = next;
    listeners.forEach(l => l());
}

// Fin du temps laissé pour finir un puzzle : l'onglet est prévenu à l'heure dite
function scheduleDeadline(deadline: number | null) {
    if (deadlineTimer !== null) window.clearTimeout(deadlineTimer);
    deadlineTimer = null;
    if (deadline === null) return;
    deadlineTimer = window.setTimeout(() => update({expired: true}), Math.max(0, deadline - Date.now()));
}

function presenceBody(): PresenceBody {
    const a = state.activity;
    return {
        key: tabKey,
        page: a?.page ?? "site",
        gameCode: a?.page === "puzzle" ? a.gameCode : null,
        challenge: a?.page === "puzzle" && a.challenge,
        elapsedMs: a?.page === "puzzle" && a.startedAt !== null ? Math.max(0, Date.now() - a.startedAt) : null,
        closed: state.sent || state.down,
    };
}

async function poll() {
    timer = null;
    try {
        const s = await maintenanceService.presence(presenceBody());
        // fin de la mise à jour (serveur revenu, ou mise à jour désactivée) : l'onglet qui était sur l'écran
        // revient à l'accueil, rechargé ; celui qui jouait encore (ou l'administrateur) reste où il est
        if (state.down || (state.on && !s.on && state.sent)) {
            window.location.replace("/");
            return;
        }
        failures = 0;
        // temps pour finir un puzzle, compté depuis l'activation (heure du serveur ramenée à celle du navigateur)
        const deadline = s.on && s.since !== null ? (state.deadline ?? Date.now() + s.since + s.puzzleGraceMs - s.now) : null;
        if (deadline !== state.deadline) scheduleDeadline(deadline);
        update({on: s.on, since: s.since, lastRound: s.lastRound, down: false, deadline});
    } catch (err) {
        // injoignable, erreur du serveur, ou page du NAS à la place de l'API pendant le redémarrage (pas du JSON)
        if (!(err instanceof ApiError) || err.status === 0 || err.status >= 500) {
            failures += 1;
            if (failures >= DOWN_AFTER) update({down: true});
        }
    }
    if (listeners.size > 0) timer = window.setTimeout(() => void poll(), state.on || failures > 0 ? POLL_FAST_MS : POLL_MS);
}

// Redemande l'état tout de suite (après avoir activé la mise à jour soi-même, ou passé sur l'écran)
export function refreshMaintenance(): void {
    if (timer !== null) window.clearTimeout(timer);
    void poll();
}

// Mise à jour activée (lu sur le moment, hors affichage : redirection après une connexion)
export const isUpdating = (): boolean => state.on;

export function setActivity(activity: Activity | null): void {
    update({activity});
}

// L'onglet passe sur l'écran de mise à jour : le serveur le note tout de suite (journal de l'administrateur)
export function markSent(): void {
    if (state.sent) return;
    update({sent: true});
    refreshMaintenance();
}

/*
 * L'onglet doit-il afficher l'écran de mise à jour ?
 * adminOnStats : page gardée pendant une mise à jour — /stats pour un administrateur (rouvrir le site sans
 * redémarrer) et la page de connexion (pour s'y reconnecter).
 */
export function showsUpdateScreen(s: SiteMaintenance, adminOnStats: boolean): boolean {
    if (s.down) return true;
    if (!s.on) return false;
    if (adminOnStats) return false;
    if (s.sent) return true;
    const a = s.activity;
    if (!a) return true;
    if (a.page === "puzzle") return a.startedAt === null || s.expired;
    return !a.busy;
}

function subscribe(listener: () => void) {
    listeners.add(listener);
    if (listeners.size === 1 && timer === null) {
        void poll();
        window.addEventListener("pagehide", leave);
    }
    return () => {
        listeners.delete(listener);
        if (listeners.size === 0 && timer !== null) {
            window.clearTimeout(timer);
            timer = null;
        }
    };
}

// onglet fermé : le serveur l'oublie tout de suite
function leave() {
    maintenanceService.leave(tabKey);
}

export const useMaintenance = (): SiteMaintenance => useSyncExternalStore(subscribe, () => state, () => state);
