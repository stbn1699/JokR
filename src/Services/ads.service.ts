import {api} from "../api/api.ts";
import "./ads.scss";

/*
 * Pubs récompensées (voir backend/src/utils/adRewards.ts et routes/Ads.routes.ts) :
 * 1. le serveur ouvre un ticket (start)
 * 2. Google H5 Games Ads montre une pub de type « reward » (adBreak) ; sans identifiant AdSense (dev),
 *    une fausse pub de quelques secondes la remplace
 * 3. pub regardée jusqu'au bout : le serveur paie le ticket (claim) et renvoie le nouveau solde
 */

export interface AdRewardStatus {
    enabled: boolean;
    // identifiant AdSense (ca-pub-…), null : fausse pub (dev)
    client: string | null;
    test: boolean;
    perAd: number;
    perDay: number;
    // pubs encore possibles aujourd'hui
    left: number;
    // minuit (heure de Paris), en ms
    nextAt: number;
}

export interface AdRewardClaim {
    credits: number;
    creditsWon: number;
    left: number;
}

// Fin de la pub : regardée jusqu'au bout, fermée avant, ou pas de pub à montrer
export type AdOutcome = "viewed" | "dismissed" | "unavailable" | "blocked";

export const adsService = {
    status(signal?: AbortSignal): Promise<AdRewardStatus> {
        return api<AdRewardStatus>("/ads/reward", {method: "GET"}, signal);
    },

    start(): Promise<{ ticket: string }> {
        return api<{ ticket: string }>("/ads/reward/start", {method: "POST"});
    },

    claim(ticket: string): Promise<AdRewardClaim> {
        return api<AdRewardClaim>("/ads/reward/claim", {
            method: "POST", headers: {"Content-Type": "application/json"}, body: JSON.stringify({ticket}),
        });
    },

    // Montre une pub récompensée (H5 Games Ads, ou la fausse pub sans identifiant)
    show(status: AdRewardStatus): Promise<AdOutcome> {
        return status.client ? showH5Ad(status.client, status.test) : showFakeAd();
    },
};

// ---------- Bloqueur de pubs

const ADSENSE_SCRIPT = "https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js";

/**
 * Un bloqueur de pubs est-il actif ? Deux indices, l'un suffit :
 * - un appât (élément aux classes de pub) que les bloqueurs masquent
 * - le script AdSense, que les bloqueurs empêchent de télécharger
 */
export async function detectAdBlock(): Promise<boolean> {
    const bait = document.createElement("div");
    bait.className = "adsbox ad-banner ad-placement pub_300x250 adsbygoogle";
    bait.setAttribute("aria-hidden", "true");
    bait.style.cssText = "position:absolute;left:-9999px;top:-9999px;width:1px;height:1px;";
    bait.innerHTML = "&nbsp;";
    document.body.appendChild(bait);
    const script = fetch(ADSENSE_SCRIPT, {method: "HEAD", mode: "no-cors", cache: "no-store"}).then(() => false, () => true);
    await new Promise(r => window.setTimeout(r, 150));
    const style = getComputedStyle(bait);
    const hidden = bait.offsetHeight === 0 || style.display === "none" || style.visibility === "hidden";
    bait.remove();
    // pas de réponse du réseau au bout de 5 s : on ne conclut pas au bloqueur
    const timeout = new Promise<boolean>(r => window.setTimeout(() => r(false), 5000));
    return hidden || await Promise.race([script, timeout]);
}

// ---------- Google H5 Games Ads (https://developers.google.com/ad-placement)

type PlacementInfo = { breakStatus: string };
type AdBreakConfig = {
    type: "reward";
    name: string;
    beforeAd?: () => void;
    afterAd?: () => void;
    beforeReward?: (showAdFn: () => void) => void;
    adDismissed?: () => void;
    adViewed?: () => void;
    adBreakDone?: (info: PlacementInfo) => void;
};

declare global {
    interface Window {
        adsbygoogle?: unknown[];
    }
}

let loading: Promise<void> | null = null;

// Charge le script AdSense une seule fois (un bloqueur de pubs le fait échouer)
function loadAdSense(client: string, test: boolean): Promise<void> {
    loading ??= new Promise<void>((resolve, reject) => {
        window.adsbygoogle = window.adsbygoogle || [];
        const script = document.createElement("script");
        script.async = true;
        script.crossOrigin = "anonymous";
        script.src = `${ADSENSE_SCRIPT}?client=${encodeURIComponent(client)}`;
        if (test) script.dataset.adbreakTest = "on";
        script.onload = () => resolve();
        script.onerror = () => {
            loading = null;
            reject(new Error("blocked"));
        };
        document.head.appendChild(script);
        window.adsbygoogle.push({preloadAdBreaks: "on", sound: "on"});
    });
    return loading;
}

async function showH5Ad(client: string, test: boolean): Promise<AdOutcome> {
    try {
        await loadAdSense(client, test);
    } catch {
        return "blocked";
    }
    return new Promise<AdOutcome>(resolve => {
        let viewed = false;
        let settled = false;
        const done = (outcome: AdOutcome) => {
            if (settled) return;
            settled = true;
            window.clearTimeout(timer);
            resolve(outcome);
        };
        // Ni pub ni réponse au bout de 10 s : pas de pub
        const timer = window.setTimeout(() => done("unavailable"), 10_000);
        const config: AdBreakConfig = {
            type: "reward",
            name: "obtenir-credits",
            beforeReward: showAdFn => {
                window.clearTimeout(timer);
                showAdFn();
            },
            adViewed: () => {
                viewed = true;
            },
            adBreakDone: info => done(viewed ? "viewed" : info.breakStatus === "dismissed" ? "dismissed" : "unavailable"),
        };
        window.adsbygoogle!.push(config);
    });
}

// ---------- Fausse pub (dev, sans identifiant AdSense)

const FAKE_AD_SECONDS = 6;

function showFakeAd(): Promise<AdOutcome> {
    return new Promise<AdOutcome>(resolve => {
        const overlay = document.createElement("div");
        overlay.className = "fake-ad";
        overlay.setAttribute("role", "dialog");
        overlay.setAttribute("aria-modal", "true");
        overlay.innerHTML = `<div class="fake-ad-box"><small>Pub de test (dev)</small><strong>Ta pub ici</strong>
            <span class="fake-ad-count"></span><button type="button">Fermer</button></div>`;
        const count = overlay.querySelector<HTMLElement>(".fake-ad-count")!;
        const button = overlay.querySelector<HTMLButtonElement>("button")!;
        let left = FAKE_AD_SECONDS;
        const tick = () => {
            count.textContent = left > 0 ? `Récompense dans ${left} s` : "Récompense gagnée !";
            button.textContent = left > 0 ? "Fermer (sans récompense)" : "Récupérer";
        };
        tick();
        const timer = window.setInterval(() => {
            left -= 1;
            tick();
            if (left <= 0) window.clearInterval(timer);
        }, 1000);
        button.onclick = () => {
            window.clearInterval(timer);
            overlay.remove();
            resolve(left <= 0 ? "viewed" : "dismissed");
        };
        document.body.appendChild(overlay);
    });
}
