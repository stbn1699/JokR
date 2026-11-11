import {api} from "../api/api.ts";

// État de la mise à jour (now : heure du serveur ; puzzleGraceMs : temps laissé pour finir un puzzle)
export interface MaintenanceState {
    on: boolean;
    since: number | null;
    lastRound: number | null;
    now: number;
    puzzleGraceMs: number;
}

export type PresencePage = "site" | "puzzle" | "roulette" | "plinko";

// Où est un onglet (envoyé toutes les 15 s, 5 s pendant une mise à jour)
export interface PresenceBody {
    key: string;
    page: PresencePage;
    gameCode: string | null;
    challenge: boolean;
    elapsedMs: number | null;
    closed: boolean;
}

// Ce qui se joue encore (onglet « En direct » des Statistiques, administrateur)
export interface MaintenanceLive {
    now: number;
    maintenance: MaintenanceState;
    // joueurs page par page : encore sur la page, ou déjà sur l'écran de mise à jour
    pages: Record<PresencePage, { here: number; sent: number }>;
    // onglets passés sur l'écran depuis l'activation, et leur page
    events: { at: number; page: PresencePage }[];
    puzzles: { key: string; gameCode: string | null; challenge: boolean; startedAt: number | null; lastSeen: number; username: string | null }[];
    roulette: { round: number; open: boolean; closesAt: number; endsAt: number; players: number; total: number; busy: boolean; lastRoundEndsAt: number | null };
    plinko: { inFlight: number };
    // plus personne en jeu : la mise à jour peut se faire
    ready: boolean;
}

const json = {"Content-Type": "application/json"};

export const maintenanceService = {
    presence(body: PresenceBody): Promise<MaintenanceState> {
        return api<MaintenanceState>("/maintenance/presence", {method: "POST", headers: json, body: JSON.stringify(body)});
    },

    // onglet fermé (envoyé même si la page se ferme)
    leave(key: string): void {
        void fetch(`${import.meta.env.VITE_API_URL}/maintenance/presence/${encodeURIComponent(key)}`, {method: "DELETE", keepalive: true})
            .catch(() => undefined);
    },

    set(on: boolean): Promise<MaintenanceState> {
        return api<MaintenanceState>("/maintenance", {method: "PUT", headers: json, body: JSON.stringify({on})});
    },

    live(signal?: AbortSignal): Promise<MaintenanceLive> {
        return api<MaintenanceLive>("/maintenance/live", {method: "GET"}, signal);
    },
};
