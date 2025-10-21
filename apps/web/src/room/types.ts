import type {MorpionSettings, MorpionState} from "../games/morpion";

export type PlayerStatus = "ready" | "waiting";

export type RoomPlayer = {
    id: string;
    name: string;
    status: PlayerStatus;
    avatarColor: string;
    joinedAt: number;
};

export type RoomStatus = "lobby" | "started";

export type RoomSnapshot = {
    id: string;
    gameId: string | null;
    hostId: string | null;
    players: RoomPlayer[];
    status: RoomStatus;
    morpion: MorpionState | null;
    morpionSettings: MorpionSettings;
};

export type ChatMessage = {
    id: string;
    author: string;
    body: string;
    timestamp: string;
    type?: "system";
};

export type RoomInitPayload = {
    selfId: string;
    room: RoomSnapshot;
    messages: ChatMessage[];
};
