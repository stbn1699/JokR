import {api} from "../api/api.ts";

type BaseNotification = {
    id: string;
    createdAt: string;
    // null tant que le joueur ne l'a pas vue
    readAt: string | null;
};

// Places finales aux défis d'un jour (envoyée à la clôture des défis, à minuit)
export interface DailyResultsNotification extends BaseNotification {
    kind: "daily_results";
    data: {
        date: string;
        // Meilleure place d'abord ; xp : gagnée grâce à cette place (absente des anciennes notifications)
        games: { code: string; name: string; rank: number; total: number; durationMs: number; xp?: number }[];
        // XP gagnée au total, déjà ajoutée au joueur (0 au-delà de la 50e place partout)
        xp?: number;
    };
}

// Demande d'ami reçue, ou demande envoyée acceptée : le joueur concerné
export interface FriendNotification extends BaseNotification {
    kind: "friend_request" | "friend_accepted";
    data: { username: string; avatar: string; level: number };
}

export type AppNotification = DailyResultsNotification | FriendNotification;

export const isDailyResults = (n: AppNotification): n is DailyResultsNotification => n.kind === "daily_results";

// XP rapportée par une notification (résultats des défis seulement)
export const notificationXp = (n: AppNotification) => (isDailyResults(n) ? n.data.xp ?? 0 : 0);

export interface NotificationList {
    items: AppNotification[];
    unread: number;
}

export const notificationService = {
    list(signal?: AbortSignal): Promise<NotificationList> {
        return api<NotificationList>("/notifications", {method: "GET"}, signal);
    },

    // Marquées comme vues : toutes, ou seulement celles de `ids`
    async markRead(ids?: string[]): Promise<void> {
        await api("/notifications/read", {
            method: "POST",
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify(ids ? {ids} : {}),
        });
    },
};
