/**
 * Notifications push de cet appareil : activation (autorisation du navigateur + abonnement enregistré sur le serveur),
 * désactivation, et oubli de l'abonnement à la déconnexion (le téléphone ne reçoit plus rien du compte précédent).
 */

import {useCallback, useEffect, useState} from "react";
import {api} from "../api/api.ts";

// unavailable : serveur sans clés, ou service worker absent (mode développement)
export type PushStatus = "loading" | "unsupported" | "unavailable" | "blocked" | "off" | "on";

const supported = () => "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;

const publicKey = async () => (await api<{ publicKey: string | null }>("/notifications/push", {method: "GET"})).publicKey;

const saveSubscription = (subscription: PushSubscription) => api("/notifications/push", {
    method: "POST",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify(subscription.toJSON()),
});

// Clé en base64url → octets attendus par le navigateur
function keyBytes(key: string) {
    const binary = atob(key.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(key.length / 4) * 4, "="));
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return bytes;
}

/** Déconnexion volontaire : l'appareil se désabonne (le serveur oublie l'adresse au prochain envoi refusé) */
export async function dropPushSubscription(): Promise<void> {
    if (!supported()) return;
    try {
        const registration = await navigator.serviceWorker.getRegistration();
        const subscription = await registration?.pushManager.getSubscription();
        await subscription?.unsubscribe();
    } catch {
        // rien à désabonner
    }
}

export function usePush(enabled: boolean) {
    const [status, setStatus] = useState<PushStatus>("loading");
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // À la connexion : état de l'appareil, et abonnement existant rattaché au joueur connecté
    useEffect(() => {
        if (!enabled) return;
        let cancelled = false;
        const check = async (): Promise<PushStatus> => {
            if (!supported()) return "unsupported";
            const [registration, key] = await Promise.all([navigator.serviceWorker.getRegistration(), publicKey()]);
            if (!registration || !key) return "unavailable";
            if (Notification.permission === "denied") return "blocked";
            const subscription = await registration.pushManager.getSubscription();
            if (!subscription) return "off";
            await saveSubscription(subscription);
            return "on";
        };
        check().then(next => {
            if (!cancelled) setStatus(next);
        }).catch(() => {
            if (!cancelled) setStatus("unavailable");
        });
        return () => {
            cancelled = true;
        };
    }, [enabled]);

    const enable = useCallback(async () => {
        setBusy(true);
        setError(null);
        try {
            const permission = await Notification.requestPermission();
            if (permission !== "granted") {
                setStatus(permission === "denied" ? "blocked" : "off");
                return;
            }
            const key = await publicKey();
            if (!key) {
                setStatus("unavailable");
                return;
            }
            const registration = await navigator.serviceWorker.ready;
            const subscription = await registration.pushManager.subscribe({userVisibleOnly: true, applicationServerKey: keyBytes(key)});
            await saveSubscription(subscription);
            setStatus("on");
        } catch {
            setError("Impossible d'activer les notifications, réessaie.");
        } finally {
            setBusy(false);
        }
    }, []);

    const disable = useCallback(async () => {
        setBusy(true);
        setError(null);
        try {
            const registration = await navigator.serviceWorker.getRegistration();
            const subscription = await registration?.pushManager.getSubscription();
            if (subscription) {
                await api("/notifications/push", {
                    method: "DELETE",
                    headers: {"Content-Type": "application/json"},
                    body: JSON.stringify({endpoint: subscription.endpoint}),
                });
                await subscription.unsubscribe();
            }
            setStatus("off");
        } catch {
            setError("Impossible de désactiver les notifications, réessaie.");
        } finally {
            setBusy(false);
        }
    }, []);

    return {status, busy, error, enable, disable};
}
