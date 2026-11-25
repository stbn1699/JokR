/*
 * Pubs récompensées (bouton « Obtenir plus de crédits » sous le solde du header) : une pub regardée
 * jusqu'au bout rapporte AD_REWARD_CREDITS crédits, AD_REWARDS_PER_DAY fois par jour (le jour change à minuit,
 * heure de Paris). La pub vient de Google H5 Games Ads (adBreak de type « reward »), qui ne prévient pas le serveur :
 * le serveur ouvre un ticket juste avant la pub et ne paie qu'un ticket ouvert depuis au moins AD_MIN_WATCH_MS
 * (une pub récompensée ne se termine pas plus vite) et depuis moins de AD_TICKET_TTL_MS.
 */

export const AD_REWARD_CREDITS = 50;
export const AD_REWARDS_PER_DAY = 3;
export const AD_MIN_WATCH_MS = 5_000;
export const AD_TICKET_TTL_MS = 10 * 60_000;

// Pubs encore possibles aujourd'hui, `claimed` déjà regardées
export function adRewardsLeft(claimed: number): number {
    return Math.max(0, AD_REWARDS_PER_DAY - claimed);
}

export type AdTicketCheck = "ok" | "too-soon" | "expired";

// Le ticket ouvert à `startedAt` peut-il être payé à `now` ?
export function checkAdTicket(startedAt: Date, now: Date = new Date()): AdTicketCheck {
    const elapsed = now.getTime() - startedAt.getTime();
    if (elapsed < AD_MIN_WATCH_MS) return "too-soon";
    if (elapsed > AD_TICKET_TTL_MS) return "expired";
    return "ok";
}
