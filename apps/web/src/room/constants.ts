import type {PlayerStatus} from "./types";

export const MAX_PLAYERS = 2;

export const statusLabel: Record<PlayerStatus, string> = {
    ready: "Prêt",
    waiting: "En attente",
};
