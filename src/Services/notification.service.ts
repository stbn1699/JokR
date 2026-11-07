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

type NotifPlayer = { username: string; avatar: string; level: number };

// Un·e ami·e t'envoie la grille d'une de ses parties gagnées
export interface FriendChallengeNotification extends BaseNotification {
    kind: "friend_challenge";
    data: { challengeId: string; from: NotifPlayer; gameCode: string; gameName: string; gridSize: number; emptyCells: number; senderMs: number };
}

// Un·e ami·e te défie au défi du jour
export interface DailyChallengeNotification extends BaseNotification {
    kind: "daily_challenge";
    data: { from: NotifPlayer; gameCode: string; gameName: string; date: string; senderMs: number };
}

// Un·e ami·e a fait la grille que tu lui as envoyée
export interface ChallengeResultNotification extends BaseNotification {
    kind: "challenge_result";
    data: { challengeId: string; by: NotifPlayer; gameCode: string; gameName: string; senderMs: number; playerMs: number };
}

export type ChallengeNotification = FriendChallengeNotification | DailyChallengeNotification | ChallengeResultNotification;

export type AppNotification = DailyResultsNotification | FriendNotification | ChallengeNotification;

export const isFriendNotification = (n: AppNotification): n is FriendNotification =>
    n.kind === "friend_request" || n.kind === "friend_accepted";

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
