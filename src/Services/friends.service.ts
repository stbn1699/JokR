import {useEffect, useSyncExternalStore} from "react";
import {api} from "../api/api.ts";

// Joueur d'une liste d'amis (et date : amis depuis, ou demande envoyée le)
export interface FriendPlayer {
    username: string;
    avatar: string;
    level: number;
    since: string;
}

export interface FriendLists {
    friends: FriendPlayer[];
    // demandes reçues, à accepter ou refuser
    incoming: FriendPlayer[];
    // demandes envoyées, en attente
    outgoing: FriendPlayer[];
}

// Lien avec un autre joueur
export type Friendship = "friends" | "outgoing" | "incoming" | "none";

export type RequestResult = "requested" | "accepted" | "already_requested" | "already_friends";

const json = {"Content-Type": "application/json"};
const path = (username: string) => encodeURIComponent(username);

export const friendsService = {
    list(signal?: AbortSignal): Promise<FriendLists> {
        return api<FriendLists>("/friends", {method: "GET"}, signal);
    },

    async request(username: string): Promise<RequestResult> {
        const {result} = await api<{ result: RequestResult }>("/friends/requests", {
            method: "POST", headers: json, body: JSON.stringify({username}),
        });
        return result;
    },

    async accept(username: string): Promise<void> {
        await api(`/friends/requests/${path(username)}/accept`, {method: "POST"});
    },

    // Refuser ou annuler une demande, retirer un ami
    async remove(username: string): Promise<void> {
        await api(`/friends/${path(username)}`, {method: "DELETE"});
    },
};

/*
 * Listes d'amis partagées par tout le site (profil, page d'un joueur, classements, cloche) :
 * chargées une fois, rechargées après chaque action et quand une notification d'ami arrive.
 */
const EMPTY: FriendLists = {friends: [], incoming: [], outgoing: []};
let lists = EMPTY;
let loadedFor: string | null = null;
const listeners = new Set<() => void>();

function set(next: FriendLists) {
    lists = next;
    listeners.forEach(l => l());
}

export const friendsStore = {
    async refresh() {
        set(await friendsService.list());
    },

    // Joueur déconnecté : plus d'amis affichés
    clear() {
        loadedFor = null;
        set(EMPTY);
    },

    // Lien avec un joueur d'après les listes chargées
    relation(username: string): Friendship {
        if (lists.friends.some(f => f.username === username)) return "friends";
        if (lists.outgoing.some(f => f.username === username)) return "outgoing";
        if (lists.incoming.some(f => f.username === username)) return "incoming";
        return "none";
    },

    async request(username: string) {
        const result = await friendsService.request(username);
        await friendsStore.refresh();
        return result;
    },

    async accept(username: string) {
        await friendsService.accept(username);
        await friendsStore.refresh();
    },

    async remove(username: string) {
        await friendsService.remove(username);
        await friendsStore.refresh();
    },
};

const subscribe = (listener: () => void) => {
    listeners.add(listener);
    return () => {
        listeners.delete(listener);
    };
};

/**
 * Listes d'amis du joueur connecté (vides pour un invité). Chargées au premier besoin pour ce joueur.
 */
export function useFriends(userId: string | null): FriendLists {
    const current = useSyncExternalStore(subscribe, () => lists);
    useEffect(() => {
        if (!userId) {
            if (loadedFor !== null) friendsStore.clear();
            return;
        }
        if (loadedFor === userId) return;
        loadedFor = userId;
        friendsStore.refresh().catch(() => {
            loadedFor = null;
        });
    }, [userId]);
    return userId ? current : EMPTY;
}
