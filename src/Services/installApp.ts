/**
 * Application installée (PWA, puis APK) : sur téléphone et tablette, on joue dans l'app, pas dans le navigateur.
 */

import {useSyncExternalStore} from "react";

export type ScreenAccess = "site" | "small" | "install";

/** Ce que voit le joueur : le site, l'écran « fenêtre trop petite » ou la page d'installation */
export function screenAccess(small: boolean, touch: boolean, installed: boolean): ScreenAccess {
    if (!small) return "site";
    if (!touch) return "small";
    return installed ? "site" : "install";
}

/** Lancé depuis l'icône de l'app (Android, ordinateur) ou depuis l'écran d'accueil (iPhone, iPad) */
export function isInstalledApp(): boolean {
    return window.matchMedia("(display-mode: standalone), (display-mode: fullscreen)").matches
        || (navigator as Navigator & {standalone?: boolean}).standalone === true;
}

export type InstallTarget = "android" | "ios" | "in-app";

// Navigateurs intégrés aux applis (lien ouvert depuis Discord, Instagram…) : on ne peut pas y installer de PWA
const IN_APP_BROWSER = /FBAN|FBAV|FB_IAB|Instagram|Discord|Snapchat|TikTok|musical_ly|BytedanceWebview|LinkedInApp|MicroMessenger|Line\/|; wv\)/i;

/** Parcours d'installation selon l'appareil ("android" sert aussi aux autres navigateurs tactiles) */
export function installTarget(userAgent: string, maxTouchPoints: number): InstallTarget {
    if (IN_APP_BROWSER.test(userAgent)) return "in-app";
    // l'iPad se présente comme un Mac, mais un Mac n'a pas d'écran tactile
    if (/iPhone|iPad|iPod/.test(userAgent) || (/Macintosh/.test(userAgent) && maxTouchPoints > 1)) return "ios";
    return "android";
}

// ---------- fenêtre d'installation du navigateur (Chrome, Edge, Samsung Internet) ----------

type InstallPromptEvent = Event & {
    prompt: () => Promise<unknown>;
    userChoice: Promise<{outcome: "accepted" | "dismissed"}>;
};
type InstallState = {event: InstallPromptEvent | null; installed: boolean};

let state: InstallState = {event: null, installed: false};
const listeners = new Set<() => void>();

const setState = (next: InstallState) => {
    state = next;
    listeners.forEach(listener => listener());
};

// Le navigateur prévient une seule fois, parfois avant l'affichage de la page : on écoute dès le chargement
if (typeof window !== "undefined") {
    window.addEventListener("beforeinstallprompt", event => {
        event.preventDefault();
        setState({...state, event: event as InstallPromptEvent});
    });
    window.addEventListener("appinstalled", () => setState({event: null, installed: true}));
}

const subscribe = (listener: () => void) => {
    listeners.add(listener);
    return () => void listeners.delete(listener);
};

export function useInstallPrompt() {
    const {event, installed} = useSyncExternalStore(subscribe, () => state);
    return {canPrompt: event !== null, installed};
}

/** Ouvre la fenêtre du navigateur. Elle ne sert qu'une fois : si le joueur refuse, on passe aux étapes à la main */
export async function promptInstall(): Promise<void> {
    const {event} = state;
    if (!event) return;
    try {
        await event.prompt();
        const {outcome} = await event.userChoice;
        setState({event: null, installed: outcome === "accepted"});
    } catch {
        setState({event: null, installed: false});
    }
}
