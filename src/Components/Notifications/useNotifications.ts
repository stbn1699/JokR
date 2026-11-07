import {useCallback, useEffect, useState} from "react";
import {type AppNotification, type DailyResultsNotification, isDailyResults, notificationService, notificationXp} from "../../Services/notification.service.ts";
import {friendsStore} from "../../Services/friends.service.ts";

// Nouvelles notifications : vérifiées toutes les 3 minutes, et en revenant sur l'onglet
const POLL_MS = 3 * 60 * 1000;
// Notifications déjà annoncées par un toast pendant cette visite
const TOASTED_KEY = "jokr:toastedNotifications";

function toasted(): string[] {
    try {
        return JSON.parse(sessionStorage.getItem(TOASTED_KEY) ?? "[]") as string[];
    } catch {
        return [];
    }
}

function rememberToasted(ids: string[]) {
    try {
        sessionStorage.setItem(TOASTED_KEY, JSON.stringify(ids.slice(-50)));
    } catch {
        // stockage indisponible : le toast pourra revenir, sans gravité
    }
}

/**
 * Notifications du joueur connecté (cloche du header).
 * - Rechargées à l'ouverture du site, toutes les 3 minutes et en revenant sur l'onglet
 * - `toast` : la plus récente des notifications non lues pas encore annoncées pendant cette visite
 *   (sauf celles qui rapportent de l'XP : elles ont leur propre popup, voir `rewards`)
 * - `rewards` : résultats des défis non vus qui rapportent de l'XP
 * - markAllRead : appelée à l'ouverture du panneau (le compteur retombe à 0)
 */
export function useNotifications(enabled: boolean) {
    const [items, setItems] = useState<AppNotification[]>([]);
    const [unread, setUnread] = useState(0);
    const [toast, setToast] = useState<AppNotification | null>(null);

    const load = useCallback(async () => {
        const list = await notificationService.list();
        setItems(list.items);
        setUnread(list.unread);
        const seen = toasted();
        const fresh = list.items.find(n => n.readAt === null && !seen.includes(n.id) && notificationXp(n) === 0);
        // Nouvelle demande ou amitié acceptée : les listes d'amis changent
        if (list.items.some(n => !isDailyResults(n) && n.readAt === null)) friendsStore.refresh().catch(() => undefined);
        if (fresh) {
            setToast(fresh);
            rememberToasted([...seen, ...list.items.filter(n => n.readAt === null).map(n => n.id)]);
        }
    }, []);

    useEffect(() => {
        if (!enabled) return;
        const refresh = () => {
            if (!document.hidden) load().catch(() => undefined);
        };
        const first = window.setTimeout(refresh, 0);
        const timer = window.setInterval(refresh, POLL_MS);
        document.addEventListener("visibilitychange", refresh);
        return () => {
            window.clearTimeout(first);
            window.clearInterval(timer);
            document.removeEventListener("visibilitychange", refresh);
        };
    }, [enabled, load]);

    const markAllRead = useCallback(() => {
        if (unread === 0) return;
        setUnread(0);
        notificationService.markRead().catch(() => undefined);
    }, [unread]);

    // Seulement certaines (popup des XP fermée : les demandes d'ami restent à voir)
    const markRead = useCallback((ids: string[]) => {
        const marked = items.filter(n => ids.includes(n.id) && n.readAt === null).length;
        if (marked === 0) return;
        setUnread(u => Math.max(0, u - marked));
        notificationService.markRead(ids).catch(() => undefined);
    }, [items]);

    return {
        // Déconnecté : rien (sans attendre le prochain rechargement)
        items: enabled ? items : [],
        rewards: enabled
            ? items.filter((n): n is DailyResultsNotification => isDailyResults(n) && n.readAt === null && notificationXp(n) > 0)
            : [],
        unread: enabled ? unread : 0,
        toast: enabled ? toast : null,
        closeToast: () => setToast(null),
        markAllRead,
        markRead,
    };
}
