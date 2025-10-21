export type MorpionSymbol = "X" | "O";

export type MorpionStatus = "waiting" | "playing" | "won" | "draw";

export type MorpionSettings = {
    symbols: Record<string, MorpionSymbol>;
};

export type MorpionState = {
    board: (MorpionSymbol | null)[];
    currentPlayerId: string | null;
    symbols: Record<string, MorpionSymbol>;
    status: MorpionStatus;
    winnerId: string | null;
    winningLine: number[] | null;
    turnExpiresAt: number | null;
};

export type MorpionPlayerRef = {
    id: string;
    joinedAt: number;
};
