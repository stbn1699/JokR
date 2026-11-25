import {api} from "../api/api.ts";
import type {FriendPlayer} from "./friends.service.ts";

// Onglet Social : ami·e·s, discussion, duels (voir backend/src/routes/Social.routes.ts)

export type Presence = "online" | "playing" | "offline";

export interface SocialFriend {
    username: string;
    avatar: string;
    level: number;
    presence: Presence;
    // jeu ouvert (presence = playing)
    gameName: string | null;
    unread: number;
    lastMessageAt: string | null;
    // bilan de vos défis : tes victoires / les siennes
    record: { wins: number; losses: number };
}

export interface DuelGame {
    code: string;
    name: string;
    // Facile… Expert, ou seulement Standard
    difficulties: string[];
}

export interface SocialOverview {
    friends: SocialFriend[];
    incoming: FriendPlayer[];
    outgoing: FriendPlayer[];
    duelGames: DuelGame[];
}

export type SocialMessage =
    | { id: string; from: "me" | "them"; at: string; kind: "text"; text: string }
    | {
    id: string; from: "me" | "them"; at: string; kind: "challenge";
    challengeId: string; gameCode: string; gameName: string; difficulty: string | null;
    // null tant que l'un ou l'autre n'a pas joué
    myMs: number | null; theirMs: number | null;
};

export type ChallengeMessage = Extract<SocialMessage, { kind: "challenge" }>;

// Où en est un défi de la discussion, de ton point de vue
export type ChallengeStatus = "toPlay" | "pending" | "won" | "lost" | "tie";

export function challengeStatus(m: ChallengeMessage): ChallengeStatus {
    if (m.myMs === null) return "toPlay";
    if (m.theirMs === null) return "pending";
    return m.myMs < m.theirMs ? "won" : m.myMs > m.theirMs ? "lost" : "tie";
}

const json = {"Content-Type": "application/json"};
const path = (username: string) => `/social/${encodeURIComponent(username)}`;

// Signalé quand des messages ont été lus (la pastille de l'onglet se relit tout de suite)
export const SOCIAL_READ_EVENT = "jokr:social-read";

export const socialService = {
    overview(signal?: AbortSignal): Promise<SocialOverview> {
        return api<SocialOverview>("/social", {method: "GET"}, signal);
    },

    async unread(signal?: AbortSignal): Promise<number> {
        const {unread} = await api<{ unread: number }>("/social/unread", {method: "GET"}, signal);
        return unread;
    },

    async messages(username: string, signal?: AbortSignal): Promise<SocialMessage[]> {
        const {messages} = await api<{ messages: SocialMessage[] }>(`${path(username)}/messages`, {method: "GET"}, signal);
        window.dispatchEvent(new Event(SOCIAL_READ_EVENT));
        return messages;
    },

    async send(username: string, text: string): Promise<SocialMessage> {
        const {message} = await api<{ message: SocialMessage }>(`${path(username)}/messages`, {
            method: "POST", headers: json, body: JSON.stringify({text}),
        });
        return message;
    },

    // Lance un duel : renvoie l'identifiant du défi (à jouer sur /defi-ami/:id)
    async duel(username: string, gameCode: string, difficulty: string): Promise<string> {
        const {challengeId} = await api<{ challengeId: string }>(`${path(username)}/duels`, {
            method: "POST", headers: json, body: JSON.stringify({gameCode, difficulty}),
        });
        return challengeId;
    },
};
