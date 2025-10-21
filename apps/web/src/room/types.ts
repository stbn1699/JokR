export type PlayerStatus = "ready" | "waiting";

export type RoomPlayer = {
    id: string;
    name: string;
    status: PlayerStatus;
    avatarColor: string;
    joinedAt: number;
};

export type RoomStatus = "lobby" | "started";

export type MorpionSymbol = "X" | "O";

export type MorpionStatus = "waiting" | "playing" | "won" | "draw";

export type MorpionSettings = {
    symbols: Record<string, MorpionSymbol | undefined>;
};

export type MorpionState = {
    board: (MorpionSymbol | null)[];
    currentPlayerId: string | null;
    symbols: Record<string, MorpionSymbol | undefined>;
    status: MorpionStatus;
    winnerId: string | null;
    winningLine: number[] | null;
    turnExpiresAt: number | null;
};

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
