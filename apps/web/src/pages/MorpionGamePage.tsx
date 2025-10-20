import {type FormEvent, type MutableRefObject, useEffect, useMemo, useState} from "react";
import {MAX_PLAYERS} from "../room/constants";
import type {ChatMessage, MorpionState, RoomPlayer, RoomSnapshot} from "../room/types";
import {formatTimestamp} from "../utils/datetime";

type MorpionGamePageProps = {
    room: RoomSnapshot;
    morpion: MorpionState | null;
    selfId: string | null;
    localPlayer: RoomPlayer | null;
    onLeaveRoom: () => void;
    onPlayCell: (index: number) => void;
    messages: ChatMessage[];
    chatEndRef: MutableRefObject<HTMLDivElement | null>;
    onSendMessage: (event: FormEvent<HTMLFormElement>) => void;
    messageDraft: string;
    onMessageDraftChange: (value: string) => void;
};

const EMPTY_BOARD: MorpionState["board"] = Array.from({length: 9}, () => null);

export function MorpionGamePage({
    room,
    morpion,
    selfId,
    localPlayer,
    onLeaveRoom,
    onPlayCell,
    messages,
    chatEndRef,
    onSendMessage,
    messageDraft,
    onMessageDraftChange,
}: MorpionGamePageProps) {
    const players = room.players;
    const playersLength = players.length;
    const board = morpion?.board ?? EMPTY_BOARD;
    const activePlayerId = morpion?.status === "playing" ? morpion.currentPlayerId : null;

    const currentPlayer = useMemo(
        () => players.find((player) => player.id === activePlayerId) ?? null,
        [players, activePlayerId]
    );

    const winnerPlayer = useMemo(
        () => (morpion?.winnerId ? players.find((player) => player.id === morpion.winnerId) ?? null : null),
        [players, morpion?.winnerId]
    );

    const winningCells = useMemo(() => new Set(morpion?.winningLine ?? []), [morpion?.winningLine]);

    const [timeLeft, setTimeLeft] = useState<number | null>(null);

    useEffect(() => {
        if (!morpion || morpion.status !== "playing" || !morpion.turnExpiresAt) {
            setTimeLeft(null);
            return;
        }

        const deadline = morpion.turnExpiresAt;

        const updateTimeLeft = () => {
            const remaining = Math.ceil((deadline - Date.now()) / 1000);
            setTimeLeft(remaining > 0 ? remaining : 0);
        };

        updateTimeLeft();
        const interval = window.setInterval(updateTimeLeft, 250);

        return () => {
            window.clearInterval(interval);
        };
    }, [morpion?.turnExpiresAt, morpion?.status]);

    const isYourTurn = morpion?.status === "playing" && activePlayerId === selfId;
    const localPlayerName = localPlayer?.name;
    const localSymbol = selfId && morpion ? morpion.symbols[selfId] : undefined;

    const gameStatus = useMemo(() => {
        if (!morpion) {
            return "Synchronisation du plateau…";
        }

        if (morpion.status === "won") {
            const winnerName = winnerPlayer?.name ?? "Un joueur";
            const winnerSymbol = morpion.winnerId ? morpion.symbols[morpion.winnerId] : undefined;
            return `Victoire de ${winnerName}${winnerSymbol ? ` (${winnerSymbol})` : ""}`;
        }

        if (morpion.status === "draw") {
            return "Match nul";
        }

        if (morpion.status === "playing" && currentPlayer) {
            const symbol = activePlayerId ? morpion.symbols[activePlayerId] : undefined;
            return `Tour de ${currentPlayer.name}${symbol ? ` (${symbol})` : ""}`;
        }

        return "Préparation de la partie…";
    }, [morpion, winnerPlayer, currentPlayer, activePlayerId]);

    const headerStatus = useMemo(() => {
        const base = `${playersLength}/${MAX_PLAYERS} joueurs connectés`;
        return gameStatus ? `${base} • ${gameStatus}` : base;
    }, [playersLength, gameStatus]);

    const turnMessage = useMemo(() => {
        if (!morpion) {
            return "Initialisation du duel…";
        }

        if (morpion.status === "won" || morpion.status === "draw") {
            return "La partie est terminée. Retour au menu principal…";
        }

        if (morpion.status === "playing") {
            if (isYourTurn) {
                return "C'est à vous de jouer !";
            }

            if (currentPlayer) {
                return `En attente du coup de ${currentPlayer.name}…`;
            }

            return "En attente du prochain coup…";
        }

        return null;
    }, [morpion, isYourTurn, currentPlayer]);

    const isCriticalTimer = typeof timeLeft === "number" && timeLeft <= 5;

    const handleCellClick = (index: number) => {
        if (!morpion || morpion.status !== "playing") {
            return;
        }

        if (!isYourTurn) {
            return;
        }

        if (board[index]) {
            return;
        }

        onPlayCell(index);
    };

    return (
        <>
            <div className="top-bar">
                <button className="ghost back-button" type="button" onClick={onLeaveRoom}>
                    ← Retour à l'accueil
                </button>
                {localPlayerName && (
                    <span className="player-identity">
                        Vous jouez en tant que {localPlayerName}
                        {localSymbol ? ` (${localSymbol})` : ""}
                    </span>
                )}
            </div>

            <header className="room-header">
                <div className="room-info">
                    <p className="room-code">Duel Morpion</p>
                    <h1>La partie a commencé !</h1>
                    <p className="room-status">{headerStatus}</p>
                </div>
                <div className="room-actions">
                    {morpion?.status === "playing" && typeof timeLeft === "number" ? (
                        <div className={`turn-timer${isCriticalTimer ? " critical" : ""}`}>
                            Temps restant : <span>{timeLeft}s</span>
                        </div>
                    ) : null}
                </div>
            </header>

            <main className="room-main">
                <aside className="player-panel">
                    <div className="panel-header">
                        <h2>Participants</h2>
                        <span className="player-count">
                            {playersLength}/{MAX_PLAYERS}
                        </span>
                    </div>
                    <div className="player-list">
                        {players.map((player) => {
                            const isYou = player.id === selfId;
                            const isHostPlayer = player.id === room.hostId;
                            const isActiveTurn = morpion?.status === "playing" && player.id === activePlayerId;
                            const isWinner = morpion?.status === "won" && player.id === morpion.winnerId;
                            const playerSymbol = morpion?.symbols[player.id];

                            const cardClassName = [
                                "player-card",
                                isActiveTurn ? "active-turn" : "",
                                isWinner ? "winner" : "",
                            ]
                                .filter(Boolean)
                                .join(" ");

                            return (
                                <article key={player.id} className={cardClassName}>
                                    <div className="player-avatar" style={{backgroundColor: player.avatarColor}}>
                                        {player.name.slice(0, 1).toUpperCase()}
                                    </div>
                                    <div className="player-details">
                                        <div className="player-name-row">
                                            <span className="player-name">{player.name}</span>
                                            {playerSymbol && <span className="player-symbol">{playerSymbol}</span>}
                                        </div>
                                        <div className="player-tags-row">
                                            {isActiveTurn && morpion?.status === "playing" && (
                                                <span className="player-tag turn">À ton tour</span>
                                            )}
                                            {isWinner && <span className="player-tag winner">Vainqueur</span>}
                                            {isYou && <span className="player-tag">Vous</span>}
                                            {isHostPlayer && <span className="player-tag host">Organisateur</span>}
                                        </div>
                                    </div>
                                </article>
                            );
                        })}
                    </div>
                </aside>

                <section className="game-panel">
                    <div className="morpion-board" role="grid" aria-label="Grille de morpion">
                        {board.map((value, index) => {
                            const isWinningCell = winningCells.has(index);
                            const isDisabled =
                                !morpion ||
                                morpion.status !== "playing" ||
                                Boolean(value) ||
                                !isYourTurn;

                            const cellClassName = [
                                "morpion-cell",
                                isWinningCell ? "winning" : "",
                                !isYourTurn && morpion?.status === "playing" ? "locked" : "",
                                value ? "filled" : "",
                            ]
                                .filter(Boolean)
                                .join(" ");

                            return (
                                <button
                                    key={index}
                                    type="button"
                                    className={cellClassName}
                                    disabled={isDisabled}
                                    onClick={() => handleCellClick(index)}
                                    aria-label={`Case ${index + 1}`}
                                >
                                    {value ?? ""}
                                </button>
                            );
                        })}
                    </div>
                    <p className="game-status">{gameStatus}</p>
                    {turnMessage && (
                        <p className={`turn-hint${isYourTurn ? " self" : ""}`}>{turnMessage}</p>
                    )}
                </section>

                <section className="chat-panel">
                    <div className="chat-header">
                        <h2>Chat de la partie</h2>
                        <p>Continuez à discuter pendant la confrontation.</p>
                    </div>
                    <div className="chat-messages">
                        {messages.map((message) => (
                            <div
                                key={message.id}
                                className={`chat-message ${
                                    message.type === "system"
                                        ? "system"
                                        : message.author === localPlayer?.name
                                          ? "self"
                                          : ""
                                }`}
                            >
                                <div className="chat-meta">
                                    <span className="chat-author">{message.author}</span>
                                    <span className="chat-time">{formatTimestamp(message.timestamp)}</span>
                                </div>
                                <p className="chat-body">{message.body}</p>
                            </div>
                        ))}
                        <div ref={chatEndRef} />
                    </div>
                    <form className="chat-form" onSubmit={onSendMessage}>
                        <input
                            type="text"
                            name="message"
                            aria-label="Votre message"
                            placeholder="Écrire un message..."
                            value={messageDraft}
                            onChange={(event) => onMessageDraftChange(event.target.value)}
                            autoComplete="off"
                            disabled={!localPlayer}
                        />
                        <button className="primary" type="submit" disabled={!localPlayer}>
                            Envoyer
                        </button>
                    </form>
                </section>
            </main>
        </>
    );
}
