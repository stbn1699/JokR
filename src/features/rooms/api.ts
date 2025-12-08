import {API_URL} from "../../config/api";
import type {GameDefinition} from "../../config/games";
import type {Room, RoomPlayer} from "./types";

export interface CreateRoomResponse {
    room: Room;
    player: RoomPlayer;
}

export interface JoinRoomResponse {
    room: Room;
    player: RoomPlayer;
}

export async function kickPlayerFromRoom(
    roomId: string,
    masterId: string,
    playerId: string,
): Promise<Room> {
    const res = await fetch(`${API_URL}/rooms/${roomId}/kick`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({ masterId, playerId }),
    });

    if (!res.ok) {
        const payload = (await res.json().catch(() => null)) as
            | { message?: string; error?: string }
            | null;

        if (payload?.error === "ROOM_NOT_FOUND") {
            throw new Error("Ce salon n'existe pas.");
        }

        if (payload?.error === "NOT_GAME_MASTER") {
            throw new Error("Seul le maître du jeu peut retirer un joueur.");
        }

        if (payload?.error === "PLAYER_NOT_IN_ROOM") {
            throw new Error("Ce joueur n'est plus dans le salon.");
        }

        const message = payload?.message || payload?.error || "Impossible de retirer ce joueur.";
        throw new Error(message);
    }

    const {room} = (await res.json()) as { room: Room };
    return room;
}

export async function leaveRoom(roomId: string, playerId: string, useBeacon = false): Promise<void> {
    if (useBeacon && typeof navigator !== "undefined" && typeof navigator.sendBeacon === "function") {
        const payload = JSON.stringify({playerId});
        const success = navigator.sendBeacon(
            `${API_URL}/rooms/${roomId}/leave`,
            new Blob([payload], {type: "application/json"}),
        );

        if (success) {
            return;
        }
    }

    const res = await fetch(`${API_URL}/rooms/${roomId}/leave`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({playerId}),
        keepalive: true,
    });

    if (!res.ok) {
        const payload = (await res.json().catch(() => null)) as
            | { message?: string; error?: string }
            | null;
        const message = payload?.message || payload?.error || "Impossible de quitter le salon.";
        throw new Error(message);
    }
}

export async function createRoom(game: GameDefinition, username: string): Promise<CreateRoomResponse> {
    const res = await fetch(`${API_URL}/rooms`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({ gameId: game.id, username }),
    });

    if (!res.ok) {
        const payload = (await res.json().catch(() => null)) as
            | { message?: string; error?: string }
            | null;
        const message = payload?.message || payload?.error || "Impossible de créer le salon.";
        throw new Error(message);
    }

    return (await res.json()) as CreateRoomResponse;
}

export async function fetchRoom(roomId: string): Promise<Room> {
    const res = await fetch(`${API_URL}/rooms/${roomId}`);

    if (!res.ok) {
        const payload = (await res.json().catch(() => null)) as
            | { message?: string; error?: string }
            | null;
        const message = payload?.message || payload?.error || "Impossible de récupérer le salon.";
        throw new Error(message);
    }

    const {room} = (await res.json()) as { room: Room };
    return room;
}

export async function joinRoom(roomId: string, username: string): Promise<JoinRoomResponse> {
    const res = await fetch(`${API_URL}/rooms/${roomId}/join`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({username}),
    });

    if (!res.ok) {
        const payload = (await res.json().catch(() => null)) as
            | { message?: string; error?: string }
            | null;

        if (payload?.error === "ROOM_NOT_FOUND") {
            throw new Error("Ce salon n'existe pas.");
        }

        if (payload?.error === "ROOM_FULL") {
            throw new Error("Le salon est plein.");
        }

        if (payload?.error === "USERNAME_TAKEN") {
            throw new Error("Ce pseudo est déjà utilisé dans ce salon.");
        }

        const message = payload?.message || payload?.error || "Impossible de rejoindre le salon.";
        throw new Error(message);
    }

    return (await res.json()) as JoinRoomResponse;
}
