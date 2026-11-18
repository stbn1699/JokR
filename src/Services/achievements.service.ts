import {api} from "../api/api.ts";

/*
 * Succès (liste : backend/src/utils/achievements.ts, partagée avec le serveur qui les débloque).
 * - overview : débloqués et statistiques du joueur (page /succes)
 * - unseen / markSeen : débloqués pas encore montrés (popups, voir Components/Achievements/AchievementToasts.tsx)
 * - report : ce que seul le site voit (visite de l'interface, nouveautés, règles d'un jeu), sans attendre la réponse
 */

export type UnlockedAchievement = { id: string; reward: number; unlockedAt: string };

export type AchievementsOverview = { unlocked: UnlockedAchievement[]; stats: Record<string, number> };

export type ClientAchievementEvent = "tour" | "changelog" | "rules";

export const achievementsService = {
    overview: () => api<AchievementsOverview>("/achievements"),
    unseen: () => api<{ unlocked: UnlockedAchievement[]; credits: number }>("/achievements/unseen"),
    async markSeen(ids: string[]) {
        await api("/achievements/seen", {method: "POST", headers: {"Content-Type": "application/json"}, body: JSON.stringify({ids})});
    },
    report(kind: ClientAchievementEvent, game?: string) {
        if (!localStorage.getItem("auth_token")) return;
        void api("/achievements/event", {method: "POST", headers: {"Content-Type": "application/json"}, body: JSON.stringify({kind, game})})
            .then(() => window.dispatchEvent(new Event(ACHIEVEMENTS_CHECK_EVENT)))
            .catch(() => undefined);
    },
};

// Demande aux popups de regarder tout de suite s'il y a un succès à montrer
export const ACHIEVEMENTS_CHECK_EVENT = "achievements:check";
