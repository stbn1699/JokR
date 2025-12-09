export type CellSymbol = "X" | "O" | null;

export type GameResult =
    | {type: "win"; playerId: string; symbol: Exclude<CellSymbol, null>; line: number[]}
    | {type: "draw"};

export interface MorpionState {
    board: CellSymbol[];
    currentPlayerIndex: number;
    turnEndsAt: string | null;
    result: GameResult | null;
}
