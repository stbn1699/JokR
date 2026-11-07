import {useEffect, useState, useSyncExternalStore} from "react";
import {levelTierIndex} from "../../Services/leveling.ts";
import {rewardFx} from "../../Services/rewardFx.ts";
import {useWhatsNewOpen} from "../../Services/popupQueue.ts";

// Dernier palier de couleur vu par le joueur (dans le navigateur, par compte)
const key = (userId: string) => `jokr:tier:${userId}`;

function readTier(userId: string): number | null {
    try {
        const value = localStorage.getItem(key(userId));
        return value === null ? null : Number(value);
    } catch {
        return null;
    }
}

function writeTier(userId: string, tier: number) {
    try {
        localStorage.setItem(key(userId), String(tier));
    } catch {
        // stockage indisponible : la popup pourra revenir, sans gravité
    }
}

// Attente après la fin de l'animation du header (barre d'XP, niveau qui rebondit)
const AFTER_HEADER_MS = 1200;

/**
 * Changement de couleur de contour : le niveau affiché par le header passe un palier.
 * La popup attend que le header ait fini d'animer le gain (rewardFx) et que la popup des nouveautés soit fermée.
 * Première visite sur ce navigateur : le palier actuel est simplement retenu, sans popup.
 */
export function useTierUp(userId: string | null, level: number, ready: boolean) {
    const [popup, setPopup] = useState<{ fromIndex: number; toIndex: number; level: number } | null>(null);
    const fx = useSyncExternalStore(rewardFx.subscribe, rewardFx.getState);
    const whatsNewOpen = useWhatsNewOpen();

    useEffect(() => {
        if (!userId || !ready || fx.held || whatsNewOpen || popup) return;
        const current = levelTierIndex(level);
        const seen = readTier(userId);
        if (seen === null || seen > current || Number.isNaN(seen)) {
            writeTier(userId, current);
            return;
        }
        if (current === seen) return;
        const timer = window.setTimeout(() => setPopup({fromIndex: seen, toIndex: current, level}), AFTER_HEADER_MS);
        return () => window.clearTimeout(timer);
    }, [userId, level, ready, fx.held, whatsNewOpen, popup]);

    const close = () => {
        if (userId && popup) writeTier(userId, popup.toIndex);
        setPopup(null);
    };

    return {popup, close};
}
