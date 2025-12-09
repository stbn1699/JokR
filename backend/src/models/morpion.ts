export type MorpionCell = "X" | "O" | null;

export interface MorpionResultWin {
    type: "win";
    playerId: string;
    symbol: Exclude<MorpionCell, null>;
    line: number[];
}

export interface MorpionResultDraw {
    type: "draw";
}

export type MorpionResult = MorpionResultWin | MorpionResultDraw;

export interface MorpionState {
    board: MorpionCell[];
    currentPlayerIndex: number;
    turnEndsAt: Date | null;
    result: MorpionResult | null;
}
