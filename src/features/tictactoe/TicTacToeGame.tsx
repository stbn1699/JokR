import {useCallback, useEffect, useMemo, useState} from "react";
import type {Room, RoomPlayer} from "../rooms/types";
import "./TicTacToeGame.css";

type CellSymbol = "X" | "O" | null;

type GameResult =
    | {type: "win"; player: RoomPlayer; symbol: Exclude<CellSymbol, null>; line: number[]}
    | {type: "draw"};

interface TicTacToeGameProps {
    room: Room;
    players: RoomPlayer[];
    onExit: () => void;
}

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

function findWinningLine(board: CellSymbol[]): number[] | null {
    for (const line of WINNING_LINES) {
        const [a, b, c] = line;
        if (board[a] && board[a] === board[b] && board[a] === board[c]) {
            return line;
        }
    }
    return null;
}

export function TicTacToeGame({room, players, onExit}: TicTacToeGameProps) {
    const [board, setBoard] = useState<CellSymbol[]>(Array(9).fill(null));
    const [currentPlayerIndex, setCurrentPlayerIndex] = useState(0);
    const [timer, setTimer] = useState(30);
    const [result, setResult] = useState<GameResult | null>(null);

    const availableCells = useMemo(
        () => board.map((cell, index) => (cell ? null : index)).filter((index): index is number => index !== null),
        [board],
    );

    const activePlayer = players[currentPlayerIndex % players.length];
    const currentSymbol: Exclude<CellSymbol, null> = currentPlayerIndex % 2 === 0 ? "X" : "O";
    const playersReady = players.length >= 2;

    const handleMove = useCallback(
        (index: number) => {
            if (!playersReady || result) {
                return;
            }

        let moveApplied = false;
        setBoard((prevBoard) => {
            if (prevBoard[index]) {
                return prevBoard;
            }

            const updatedBoard = [...prevBoard];
            updatedBoard[index] = currentSymbol;
            moveApplied = true;

            const winningLine = findWinningLine(updatedBoard);
            if (winningLine) {
                setResult({type: "win", player: activePlayer, symbol: currentSymbol, line: winningLine});
            } else if (updatedBoard.every((cell) => cell !== null)) {
                setResult({type: "draw"});
            } else {
                setCurrentPlayerIndex((prevIndex) => (prevIndex + 1) % players.length);
            }

            return updatedBoard;
        });

        if (moveApplied) {
            setTimer(30);
        }
        },
        [activePlayer, currentSymbol, players, playersReady, result],
    );

    useEffect(() => {
        if (result || !playersReady) {
            return undefined;
        }

        const intervalId = window.setInterval(() => {
            setTimer((prev) => {
                if (prev <= 1) {
                    const randomIndex = availableCells[Math.floor(Math.random() * availableCells.length)] ?? null;
                    if (randomIndex !== null) {
                        handleMove(randomIndex);
                    }
                    return 30;
                }
                return prev - 1;
            });
        }, 1000);

        return () => window.clearInterval(intervalId);
    }, [result, playersReady, availableCells, handleMove]);

    useEffect(() => {
        if (!result) {
            return undefined;
        }

        const timeout = window.setTimeout(() => {
            onExit();
        }, 2000);

        return () => window.clearTimeout(timeout);
    }, [result, onExit]);

    const resetBoard = () => {
        setBoard(Array(9).fill(null));
        setCurrentPlayerIndex(0);
        setTimer(30);
        setResult(null);
    };

    const statusLabel = useMemo(() => {
        if (!playersReady) {
            return "En attente de deux joueurs";
        }
        if (result?.type === "draw") {
            return "Match nul";
        }
        if (result?.type === "win") {
            return `${result.player.username} remporte la partie !`;
        }
        return `${activePlayer.username} joue (${currentSymbol})`;
    }, [activePlayer?.username, currentSymbol, playersReady, result]);

    const timerWidth = Math.max(5, (timer / 30) * 100);

    return (
        <div className="tictactoe">
            <div className="tictactoe__top">
                <div>
                    <p className="tictactoe__label">Salon</p>
                    <p className="tictactoe__value">{room.id}</p>
                </div>
                <div className="tictactoe__status">{statusLabel}</div>
                <button className="room-view__button room-view__button--ghost" type="button" onClick={onExit}>
                    Quitter la grille
                </button>
            </div>

            <div className="tictactoe__panel">
                <div className="tictactoe__timer">
                    <div className="tictactoe__timer-head">
                        <span>Temps restant</span>
                        <strong>{timer}s</strong>
                    </div>
                    <div className="tictactoe__timer-bar">
                        <div className="tictactoe__timer-fill" style={{width: `${timerWidth}%`}} />
                    </div>
                    {playersReady && !result && (
                        <p className="tictactoe__timer-hint">
                            Tour de {activePlayer.username} ({currentSymbol}) — le coup sera joué automatiquement si le temps est
                            écoulé.
                        </p>
                    )}
                </div>

                <div className="tictactoe__board">
                    {board.map((cell, index) => {
                        const isWinningCell = result?.type === "win" && result.line.includes(index);
                        return (
                            <button
                                key={index}
                                type="button"
                                className={`tictactoe__cell${cell ? " tictactoe__cell--filled" : ""}${
                                    isWinningCell ? " tictactoe__cell--win" : ""
                                }`}
                                onClick={() => handleMove(index)}
                                disabled={!playersReady || !!result}
                            >
                                {cell && <span className={`tictactoe__symbol tictactoe__symbol--${cell.toLowerCase()}`}>{cell}</span>}
                            </button>
                        );
                    })}
                </div>

                <div className="tictactoe__footer">
                    <div>
                        <p className="tictactoe__label">Joueurs</p>
                        <p className="tictactoe__value">
                            {playersReady
                                ? `${players[0].username} (X) · ${players[1].username} (O)`
                                : "En attente d'un deuxième joueur"}
                        </p>
                    </div>
                    <div className="tictactoe__actions">
                        <button className="room-view__button room-view__button--ghost" type="button" onClick={resetBoard}>
                            Réinitialiser
                        </button>
                    </div>
                </div>

                {result && (
                    <div className="tictactoe__result">
                        <div className="tictactoe__result-title">
                            {result.type === "win" ? `${result.player.username} gagne !` : "Match nul"}
                        </div>
                        <p className="tictactoe__result-text">
                            Retour au salon dans quelques instants…
                        </p>
                        <button className="room-view__button" type="button" onClick={onExit}>
                            Retour au salon maintenant
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
