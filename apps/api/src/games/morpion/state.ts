import {MORPION_CONFIG} from "./config";
import {sanitizeMorpionSymbols} from "./settings";
import type {MorpionPlayerRef, MorpionSettings, MorpionState, MorpionSymbol} from "./types";

const WINNING_LINES: number[][] = [
    [0, 1, 2],
    [3, 4, 5],
    [6, 7, 8],
    [0, 3, 6],
    [1, 4, 7],
    [2, 5, 8],
    [0, 4, 8],
    [2, 4, 6],
];

export const createInitialMorpionState = (
    players: MorpionPlayerRef[],
    settings: MorpionSettings,
    now: number = Date.now()
): MorpionState => {
    const orderedPlayers = [...players].sort((a, b) => a.joinedAt - b.joinedAt);
    const symbols = sanitizeMorpionSymbols(orderedPlayers, settings.symbols);
    const firstPlayerId = orderedPlayers.find((player) => symbols[player.id] === "X")?.id ?? null;

    return {
        board: Array(MORPION_CONFIG.gridSize).fill(null),
        currentPlayerId: firstPlayerId,
        symbols,
        status: "playing",
        winnerId: null,
        winningLine: null,
        turnExpiresAt: firstPlayerId ? now + MORPION_CONFIG.turnDurationMs : null,
    };
};

export const evaluateMorpionBoard = (board: (MorpionSymbol | null)[]) => {
    for (const line of WINNING_LINES) {
        const [a, b, c] = line;
        const value = board[a];
        if (value && value === board[b] && value === board[c]) {
            return {symbol: value, winningLine: line, isFull: false};
        }
    }

    const isFull = board.every((cell) => cell !== null);
    return {symbol: null, winningLine: null, isFull};
};

export const getNextMorpionPlayerId = (
    symbols: Record<string, MorpionSymbol>,
    currentPlayerId: string
): string | null => {
    const playerIds = Object.keys(symbols);
    if (playerIds.length <= 1) {
        return null;
    }

    for (const playerId of playerIds) {
        if (playerId !== currentPlayerId) {
            return playerId;
        }
    }

    return null;
};

export const findMorpionWinnerId = (
    symbols: Record<string, MorpionSymbol>,
    winningSymbol: MorpionSymbol,
    fallbackPlayerId: string
): string => {
    const entry = Object.entries(symbols).find(([, value]) => value === winningSymbol);
    return entry ? entry[0] : fallbackPlayerId;
};
