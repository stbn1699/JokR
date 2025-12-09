import { Room } from "../models/room";
import { MorpionCell, MorpionState } from "../models/morpion";

const TURN_DURATION_MS = 30_000;
const WINNING_LINES = [
    [0, 1, 2],
    [3, 4, 5],
    [6, 7, 8],
    [0, 3, 6],
    [1, 4, 7],
    [2, 5, 8],
    [0, 4, 8],
    [2, 4, 6],
];

function findWinningLine(board: MorpionCell[]): number[] | null {
    for (const line of WINNING_LINES) {
        const [a, b, c] = line;
        if (board[a] && board[a] === board[b] && board[a] === board[c]) {
            return line;
        }
    }
    return null;
}

export class MorpionService {
    private states: Map<string, MorpionState> = new Map();

    getState(room: Room): MorpionState {
        const state = this.ensureState(room);
        return this.applyExpiredTurns(room, state);
    }

    playMove(room: Room, playerId: string, cellIndex: number): MorpionState {
        if (!this.isReady(room)) {
            throw new Error("Deux joueurs sont nécessaires pour commencer la partie.");
        }

        const state = this.applyExpiredTurns(room, this.ensureState(room));

        const activePlayer = this.getActivePlayer(room, state);
        if (!activePlayer || activePlayer.id !== playerId) {
            throw new Error("Ce n'est pas votre tour de jouer.");
        }

        if (state.result) {
            return state;
        }

        if (cellIndex < 0 || cellIndex >= state.board.length) {
            throw new Error("Case invalide.");
        }

        if (state.board[cellIndex]) {
            throw new Error("Cette case est déjà occupée.");
        }

        this.applyMove(state, room, cellIndex);
        return state;
    }

    reset(room: Room): MorpionState {
        const baseState: MorpionState = {
            board: Array(9).fill(null),
            currentPlayerIndex: 0,
            turnEndsAt: this.isReady(room) ? new Date(Date.now() + TURN_DURATION_MS) : null,
            result: null,
        };
        this.states.set(room.id, baseState);
        return baseState;
    }

    private isReady(room: Room): boolean {
        return room.players.length >= 2;
    }

    private ensureState(room: Room): MorpionState {
        const existing = this.states.get(room.id);
        if (existing) {
            return existing;
        }
        const initialState: MorpionState = {
            board: Array(9).fill(null),
            currentPlayerIndex: 0,
            turnEndsAt: this.isReady(room) ? new Date(Date.now() + TURN_DURATION_MS) : null,
            result: null,
        };
        this.states.set(room.id, initialState);
        return initialState;
    }

    private getActivePlayer(room: Room, state: MorpionState) {
        if (!this.isReady(room)) {
            return null;
        }
        const index = state.currentPlayerIndex % 2;
        return room.players[index];
    }

    private applyMove(state: MorpionState, room: Room, cellIndex: number) {
        const activePlayer = this.getActivePlayer(room, state);
        const symbol: Exclude<MorpionCell, null> = state.currentPlayerIndex % 2 === 0 ? "X" : "O";
        state.board[cellIndex] = symbol;

        const winningLine = findWinningLine(state.board);
        if (winningLine && activePlayer) {
            state.result = {type: "win", playerId: activePlayer.id, symbol, line: winningLine};
        } else if (state.board.every((cell) => cell !== null)) {
            state.result = {type: "draw"};
        } else {
            state.currentPlayerIndex = (state.currentPlayerIndex + 1) % 2;
            state.turnEndsAt = new Date(Date.now() + TURN_DURATION_MS);
        }
    }

    private applyExpiredTurns(room: Room, state: MorpionState): MorpionState {
        if (!this.isReady(room)) {
            state.turnEndsAt = null;
            return state;
        }

        while (!state.result && state.turnEndsAt && Date.now() > state.turnEndsAt.getTime()) {
            const availableCells = state.board
                .map((cell, index) => (cell ? null : index))
                .filter((index): index is number => index !== null);

            if (availableCells.length === 0) {
                state.result = {type: "draw"};
                break;
            }

            const randomIndex = availableCells[Math.floor(Math.random() * availableCells.length)];
            this.applyMove(state, room, randomIndex);
        }

        if (!state.result && !state.turnEndsAt) {
            state.turnEndsAt = new Date(Date.now() + TURN_DURATION_MS);
        }

        return state;
    }
}

export const morpionService = new MorpionService();
