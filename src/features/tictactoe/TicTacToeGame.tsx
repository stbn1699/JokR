import {useCallback, useEffect, useMemo, useState} from "react";
import type {Room, RoomPlayer} from "../rooms/types";
import {fetchMorpionState, playMorpionMove, resetMorpion} from "./api";
import type {MorpionState} from "./types";
import "./TicTacToeGame.css";

interface TicTacToeGameProps {
    room: Room;
    players: RoomPlayer[];
    currentPlayerId?: string;
}

const EMPTY_STATE: MorpionState = {
    board: Array(9).fill(null),
    currentPlayerIndex: 0,
    turnEndsAt: null,
    result: null,
};

export function TicTacToeGame({room, players, currentPlayerId}: TicTacToeGameProps) {
    const [state, setState] = useState<MorpionState>(EMPTY_STATE);
    const [timer, setTimer] = useState(30);
    const [error, setError] = useState<string | null>(null);
    const [isPlayingMove, setIsPlayingMove] = useState(false);
    const [isStarted, setIsStarted] = useState(false);

    const activePlayers = useMemo(() => players.slice(0, 2), [players]);
    const playersReady = activePlayers.length >= 2;
    const currentSymbol: "X" | "O" | null = playersReady ? (state.currentPlayerIndex % 2 === 0 ? "X" : "O") : null;
    const activePlayer = playersReady ? activePlayers[state.currentPlayerIndex % 2] : undefined;
    const isCurrentUserTurn = activePlayer?.id === currentPlayerId;

    const shouldStartWithState = useCallback(
        (latest: MorpionState) =>
            playersReady && (latest.turnEndsAt !== null || latest.board.some((cell) => cell !== null) || latest.result !== null),
        [playersReady],
    );

    useEffect(() => {
        if (!playersReady && !isStarted) {
            return undefined;
        }

        let cancelled = false;

        const load = async () => {
            try {
                const latest = await fetchMorpionState(room.id);
                if (!cancelled) {
                    setState(latest);
                    setIsStarted((prev) => prev || shouldStartWithState(latest));
                    setError(null);
                }
            } catch (err) {
                if (!cancelled) {
                    setError((err as Error).message);
                }
            }
        };

        void load();
        const intervalId = window.setInterval(() => {
            void load();
        }, 1500);

        return () => {
            cancelled = true;
            window.clearInterval(intervalId);
        };
    }, [isStarted, playersReady, room.id, shouldStartWithState]);

    useEffect(() => {
        if (!isStarted) {
            setTimer(30);
            return undefined;
        }

        const deadline = state.turnEndsAt ? new Date(state.turnEndsAt).getTime() : null;
        if (!deadline) {
            setTimer(30);
            return undefined;
        }

        const update = () => {
            const remainingMs = Math.max(0, deadline - Date.now());
            setTimer(Math.max(0, Math.ceil(remainingMs / 1000)));
        };

        update();
        const intervalId = window.setInterval(update, 200);
        return () => window.clearInterval(intervalId);
    }, [isStarted, state.turnEndsAt]);

    useEffect(() => {
        if (!isStarted || !state.result) {
            return undefined;
        }

        const timeout = window.setTimeout(() => {
            setIsStarted(false);
        }, 2000);

        return () => window.clearTimeout(timeout);
    }, [isStarted, state.result]);

    const startGame = async () => {
        try {
            const nextState = await resetMorpion(room.id);
            setState(nextState);
            setIsStarted(shouldStartWithState(nextState));
            setError(null);
        } catch (err) {
            setError((err as Error).message);
        }
    };

    const exitGameSurface = () => {
        setIsStarted(false);
        setState(EMPTY_STATE);
        setError(null);
    };

    const handleMove = async (index: number) => {
        if (!isStarted || !playersReady || state.result || !isCurrentUserTurn || isPlayingMove) {
            return;
        }

        if (!currentPlayerId) {
            setError("Identifiant joueur manquant.");
            return;
        }

        setIsPlayingMove(true);
        setError(null);
        try {
            const nextState = await playMorpionMove(room.id, currentPlayerId, index);
            setState(nextState);
            setIsStarted(shouldStartWithState(nextState));
        } catch (err) {
            setError((err as Error).message);
        } finally {
            setIsPlayingMove(false);
        }
    };

    const resetBoard = async () => {
        try {
            const nextState = await resetMorpion(room.id);
            setState(nextState);
            setIsStarted(shouldStartWithState(nextState));
            setError(null);
        } catch (err) {
            setError((err as Error).message);
        }
    };

    const statusLabel = useMemo(() => {
        if (!playersReady) {
            return "En attente de deux joueurs";
        }
        if (state.result?.type === "draw") {
            return "Match nul";
        }
        if (state.result?.type === "win") {
            const winner = activePlayers.find((player) => player.id === state.result?.playerId);
            return winner ? `${winner.username} remporte la partie !` : "Victoire";
        }
        if (!activePlayer) {
            return "En attente des joueurs";
        }
        return `${activePlayer.username} joue (${currentSymbol ?? "?"})`;
    }, [activePlayer, activePlayers, currentSymbol, playersReady, state.result]);

    const timerWidth = Math.max(5, (timer / 30) * 100);

    if (!isStarted) {
        return (
            <div className="tictactoe tictactoe--idle">
                <div className="tictactoe__intro">
                    <div>
                        <p className="tictactoe__label">Morpion</p>
                        <h3 className="tictactoe__intro-title">Lance une partie</h3>
                        <p className="tictactoe__intro-text">
                            Invite un deuxième joueur et démarre quand vous êtes prêts. La grille se mettra à jour en direct dès que
                            la partie commence.
                        </p>
                    </div>
                    <div className="tictactoe__rules">
                        <p className="tictactoe__rules-title">Infos rapides</p>
                        <ul>
                            <li>Aligne 3 symboles pour gagner.</li>
                            <li>30 secondes par tour avant placement automatique.</li>
                            <li>Fin de partie : retour automatique à l'accueil de jeu.</li>
                        </ul>
                    </div>
                    <div className="tictactoe__actions">
                        <button
                            className="room-view__button"
                            type="button"
                            onClick={startGame}
                            disabled={!playersReady}
                        >
                            {playersReady ? "Lancer la partie" : "En attente d'un deuxième joueur"}
                        </button>
                        <p className="tictactoe__intro-helper">
                            Joueurs détectés : {players.length} / 2 (les deux premiers rejoindront la grille)
                        </p>
                    </div>
                    {error && <p className="tictactoe__result-text">{error}</p>}
                </div>
            </div>
        );
    }

    return (
        <div className="tictactoe">
            <div className="tictactoe__top">
                <div>
                    <p className="tictactoe__label">Salon</p>
                    <p className="tictactoe__value">{room.id}</p>
                </div>
                <div className="tictactoe__status">{statusLabel}</div>
                <button className="room-view__button room-view__button--ghost" type="button" onClick={exitGameSurface}>
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
                    {playersReady && !state.result && activePlayer && (
                        <p className="tictactoe__timer-hint">
                            Tour de {activePlayer.username} ({currentSymbol}) — le coup sera joué automatiquement si le temps
                            est écoulé.
                        </p>
                    )}
                </div>

                <div className="tictactoe__board">
                    {state.board.map((cell, index) => {
                        const isWinningCell = state.result?.type === "win" && state.result.line.includes(index);
                        return (
                            <button
                                key={index}
                                type="button"
                                className={`tictactoe__cell${cell ? " tictactoe__cell--filled" : ""}${
                                    isWinningCell ? " tictactoe__cell--win" : ""
                                }`}
                                onClick={() => handleMove(index)}
                                disabled={!playersReady || !!state.result || !isCurrentUserTurn || isPlayingMove}
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
                                ? `${activePlayers[0].username} (X) · ${activePlayers[1].username} (O)`
                                : "En attente d'un deuxième joueur"}
                        </p>
                    </div>
                    <div className="tictactoe__actions">
                        <button className="room-view__button room-view__button--ghost" type="button" onClick={resetBoard}>
                            Réinitialiser
                        </button>
                    </div>
                </div>

                {error && <p className="tictactoe__result-text">{error}</p>}

                {state.result && (
                    <div className="tictactoe__result">
                        <div className="tictactoe__result-title">
                            {state.result.type === "win"
                                ? `${activePlayers.find((p) => p.id === state.result?.playerId)?.username ?? "Joueur"} gagne !`
                                : "Match nul"}
                        </div>
                        <p className="tictactoe__result-text">
                            Retour au salon dans quelques instants…
                        </p>
                        <button className="room-view__button" type="button" onClick={exitGameSurface}>
                            Retour au salon maintenant
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
