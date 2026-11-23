/*
 * Notifications push (sans base ni réseau, pour être testé) : abonnement reçu du navigateur, et texte de chaque sorte
 * de notification. Le texte reprend celui de la cloche (src/Components/Notifications/NotificationBell.tsx).
 */

export type PushKeys = { endpoint: string; p256dh: string; auth: string };
export type PushMessage = { title: string; body: string; url: string; tag: string };

// Le serveur envoie une requête à cette adresse, fournie par le client : seulement les services de push connus
const PUSH_HOSTS = ["fcm.googleapis.com", "updates.push.services.mozilla.com", "web.push.apple.com"];
const PUSH_HOST_SUFFIXES = [".push.apple.com", ".notify.windows.com"];
const BASE64URL = /^[A-Za-z0-9_-]+$/;

export function isPushEndpoint(value: unknown): value is string {
    if (typeof value !== "string" || value.length > 1024) return false;
    try {
        const url = new URL(value);
        if (url.protocol !== "https:" || url.port !== "" || url.username !== "" || url.password !== "") return false;
        return PUSH_HOSTS.includes(url.hostname) || PUSH_HOST_SUFFIXES.some(s => url.hostname.endsWith(s));
    } catch {
        return false;
    }
}

const isKey = (value: unknown, max: number): value is string =>
    typeof value === "string" && value.length > 0 && value.length <= max && BASE64URL.test(value);

// Abonnement envoyé par le navigateur (PushSubscription.toJSON()), ou null s'il n'est pas valable
export function parsePushSubscription(body: unknown): PushKeys | null {
    if (typeof body !== "object" || body === null) return null;
    const {endpoint, keys} = body as { endpoint?: unknown; keys?: { p256dh?: unknown; auth?: unknown } | null };
    if (!isPushEndpoint(endpoint) || !isKey(keys?.p256dh, 128) || !isKey(keys?.auth, 64)) return null;
    return {endpoint, p256dh: keys.p256dh, auth: keys.auth};
}

// Annonces automatiques de la nuit (loteries à 23 h 59, défis à minuit) : gardées de 22 h à 9 h, heure de Paris.
// Les demandes d'ami·e et les défis viennent d'une vraie personne : ils partent tout de suite.
export const NIGHT_HELD_KINDS = ["daily_results", "lottery_win"];
const NIGHT_START_HOUR = 22;
const NIGHT_END_HOUR = 9;

export function isPushNight(now: Date): boolean {
    const hour = Number(new Intl.DateTimeFormat("en-GB", {timeZone: "Europe/Paris", hour: "2-digit", hourCycle: "h23"}).format(now));
    return hour >= NIGHT_START_HOUR || hour < NIGHT_END_HOUR;
}

type Player = { username: string };

const fr = (n: number) => n.toLocaleString("fr-FR");
const playerUrl = (username: string) => `/joueur/${encodeURIComponent(username)}`;
const LOTTERY_NAMES: Record<string, string> = {day: "la loterie du jour", week: "la loterie de la semaine", month: "la loterie du mois"};

function challengeOutcome(by: string, playerMs: number, senderMs: number) {
    if (playerMs < senderMs) return `${by} te bat`;
    return playerMs > senderMs ? "tu restes devant" : "égalité";
}

// Message d'une notification ; null pour celles qui ne partent pas en push (bienvenue, sorte inconnue)
export function pushMessage(n: { id: string; kind: string; data: unknown }): PushMessage | null {
    const data = n.data as Record<string, unknown>;
    const tag = `${n.kind}:${n.id}`;
    switch (n.kind) {
        case "friend_request": {
            const username = data.username as string;
            return {title: "Demande d'ami·e", body: `${username} veut être ton ami·e`, url: playerUrl(username), tag};
        }
        case "friend_accepted": {
            const username = data.username as string;
            return {title: "Nouvel·le ami·e", body: `${username} a accepté ta demande`, url: playerUrl(username), tag};
        }
        case "friend_challenge": {
            const from = data.from as Player;
            return {title: `${from.username} te défie`, body: `Sa grille de ${data.gameName as string} t'attend. À toi !`,
                url: `/defi-ami/${encodeURIComponent(data.challengeId as string)}`, tag};
        }
        case "daily_challenge": {
            const from = data.from as Player;
            return {title: `${from.username} te défie`, body: `Bats son temps au ${data.gameName as string} du jour !`,
                url: `/defi/${encodeURIComponent(data.gameCode as string)}`, tag};
        }
        case "challenge_result": {
            const by = data.by as Player;
            return {title: `${by.username} a relevé ton défi`,
                body: `${data.gameName as string} : ${challengeOutcome(by.username, data.playerMs as number, data.senderMs as number)}`,
                url: playerUrl(by.username), tag};
        }
        case "lottery_win": {
            const tickets = data.tickets as number;
            return {title: `Tu as gagné ${LOTTERY_NAMES[data.kind as string] ?? "la loterie"} !`,
                body: `+${fr(data.prize as number)} crédits avec ${fr(tickets)} ticket${tickets > 1 ? "s" : ""} sur ${fr(data.totalTickets as number)}`,
                url: "/hasard/loterie", tag};
        }
        case "daily_results": {
            const games = data.games as { name: string; rank: number; total: number }[];
            const best = games[0];
            if (!best) return null;
            const others = games.length - 1;
            return {title: "Défis du jour terminés",
                body: `Tu termines ${best.rank}${best.rank === 1 ? "er" : "e"} sur ${best.total} au ${best.name}${others > 0 ? ` (et ${others} autre${others > 1 ? "s" : ""} défi${others > 1 ? "s" : ""})` : ""}`,
                url: "/defi", tag};
        }
        default:
            return null;
    }
}
