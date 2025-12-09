import {API_URL} from "../../config/api";
import type {Room} from "../rooms/types";
import type {MorpionState} from "./types";

export async function fetchMorpionState(roomId: Room["id"]): Promise<MorpionState> {
    const res = await fetch(`${API_URL}/rooms/${roomId}/morpion`);
    if (!res.ok) {
        const {error} = (await res.json()) as {error?: string};
        throw new Error(error ?? "Impossible de récupérer la partie.");
    }
    const body = (await res.json()) as {state: MorpionState};
    return body.state;
}

export async function playMorpionMove(
    roomId: Room["id"],
    playerId: string,
    cellIndex: number,
): Promise<MorpionState> {
    const res = await fetch(`${API_URL}/rooms/${roomId}/morpion/move`, {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({playerId, cellIndex}),
    });
    if (!res.ok) {
        const {error} = (await res.json()) as {error?: string};
        throw new Error(error ?? "Impossible de jouer ce coup.");
    }
    const body = (await res.json()) as {state: MorpionState};
    return body.state;
}

export async function resetMorpion(roomId: Room["id"]): Promise<MorpionState> {
    const res = await fetch(`${API_URL}/rooms/${roomId}/morpion/reset`, {method: "POST"});
    if (!res.ok) {
        const {error} = (await res.json()) as {error?: string};
        throw new Error(error ?? "Impossible de réinitialiser la partie.");
    }
    const body = (await res.json()) as {state: MorpionState};
    return body.state;
}
