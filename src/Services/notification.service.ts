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
    data: { challengeId: string; from: NotifPlayer; gameCode: string; gameName: string; gridSize: number; emptyCells: number;
        // null pour un duel (onglet Social) : pas encore de temps à battre
        senderMs: number | null; difficulty?: string };
}

// Un·e ami·e te défie au défi du jour
export interface DailyChallengeNotification extends BaseNotification {
    kind: "daily_challenge";
    data: { from: NotifPlayer; gameCode: string; gameName: string; date: string; senderMs: number };
}

// Un·e ami·e a fait la grille que tu lui as envoyée
export interface ChallengeResultNotification extends BaseNotification {
    kind: "challenge_result";
    data: {
        challengeId: string; by: NotifPlayer; gameCode: string; gameName: string;
        // ton temps ; null : duel que tu n'as pas encore joué
        senderMs: number | null; playerMs: number; difficulty?: string | null;
    };
}

// Quizz : un·e ami·e te défie en duel, en direct (il t'attend dans le salon) ou chacun son tour (score : ses points)
export interface QuizzDuelNotification extends BaseNotification {
    kind: "quizz_duel";
    data: { duelId: string; from: NotifPlayer; topicId: string; topicName: string; live: boolean; score: number | null };
}

// Quizz : ton adversaire a joué votre duel chacun son tour
export interface QuizzDuelResultNotification extends BaseNotification {
    kind: "quizz_duel_result";
    data: { duelId: string; by: NotifPlayer; topicId: string; topicName: string; myScore: number; theirScore: number };
}

export type ChallengeNotification = FriendChallengeNotification | DailyChallengeNotification | ChallengeResultNotification
    | QuizzDuelNotification | QuizzDuelResultNotification;

// Loterie du Hasard gagnée (jour, semaine ou mois) : la cagnotte est déjà ajoutée aux crédits
export interface LotteryWinNotification extends BaseNotification {
    kind: "lottery_win";
    data: { kind: "day" | "week" | "month"; date: string; prize: number; tickets: number; totalTickets: number; totalBet: number };
}

// Cadeau de bienvenue (création du compte) : les crédits sont déjà ajoutés ; annoncé par une popup à la première connexion
export interface WelcomeNotification extends BaseNotification {
    kind: "welcome";
    data: { credits: number };
}

// Question du Quizz proposée par le joueur et validée : les crédits sont déjà ajoutés
export interface QuizzApprovedNotification extends BaseNotification {
    kind: "quizz_approved";
    data: { topicId: string; topicName: string; question: string; credits: number };
}

// Thème du Quizz créé par le joueur : validé (jouable) ou refusé (à reprendre)
export interface QuizzThemeNotification extends BaseNotification {
    kind: "quizz_theme_approved" | "quizz_theme_rejected";
    data: { name: string; slug?: string; themeId?: string };
}

// Question contestée par le joueur : décision de l'administrateur (corrigée, ou la réponse était juste)
export interface QuizzReportNotification extends BaseNotification {
    kind: "quizz_report_reviewed";
    data: { topicId: string; topicName: string; question: string; status: "fixed" | "dismissed" };
}

// Rappel de 17 h 30 : pas encore joué aujourd'hui (days : série à sauver, 0 s'il n'y en a pas)
export interface StreakReminderNotification extends BaseNotification {
    kind: "streak_reminder";
    data: { date: string; days: number };
}

export type AppNotification = DailyResultsNotification | FriendNotification | ChallengeNotification | LotteryWinNotification | WelcomeNotification | StreakReminderNotification | QuizzApprovedNotification | QuizzThemeNotification | QuizzReportNotification;

export const isStreakReminder = (n: AppNotification): n is StreakReminderNotification => n.kind === "streak_reminder";

// Texte du rappel de la flamme
export const streakReminderText = (days: number) => days > 0
    ? {title: `Ta flamme de ${days.toLocaleString("fr-FR")} jour${days > 1 ? "s" : ""} va s'éteindre`, body: "Joue avant minuit (grille, quizz, mise…) pour la garder !"}
    : {title: "Allume ta flamme", body: "Joue aujourd'hui et gagne un peu plus d'XP et de crédits chaque jour."};

export const isFriendNotification = (n: AppNotification): n is FriendNotification =>
    n.kind === "friend_request" || n.kind === "friend_accepted";

export const isDailyResults = (n: AppNotification): n is DailyResultsNotification => n.kind === "daily_results";

export const isLotteryWin = (n: AppNotification): n is LotteryWinNotification => n.kind === "lottery_win";

export const isWelcome = (n: AppNotification): n is WelcomeNotification => n.kind === "welcome";

export const isQuizzApproved = (n: AppNotification): n is QuizzApprovedNotification => n.kind === "quizz_approved";

export const isQuizzTheme = (n: AppNotification): n is QuizzThemeNotification =>
    n.kind === "quizz_theme_approved" || n.kind === "quizz_theme_rejected";

export const isQuizzReport = (n: AppNotification): n is QuizzReportNotification => n.kind === "quizz_report_reviewed";

export const quizzReportText = (n: QuizzReportNotification) => ({
    title: n.data.status === "fixed" ? "Question corrigée, merci !" : "Question contestée : la réponse est juste",
    body: `${n.data.topicName} : « ${n.data.question} »`,
});

// Texte d'une notification de thème (cloche et toast) et la page où elle mène
export const quizzThemeText = (n: QuizzThemeNotification) => n.kind === "quizz_theme_approved"
    ? {title: "Ton thème est validé !", body: `« ${n.data.name} » est maintenant dans le Quizz.`, to: `/quizz/${n.data.slug}`}
    : {title: "Ton thème n'a pas été validé", body: `Reprends « ${n.data.name} » pour le corriger.`, to: `/quizz/creer/${n.data.themeId}`};

// « la loterie du jour », « de la semaine », « du mois »
export const lotteryName = (kind: LotteryWinNotification["data"]["kind"]) =>
    kind === "day" ? "la loterie du jour" : kind === "week" ? "la loterie de la semaine" : "la loterie du mois";

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
