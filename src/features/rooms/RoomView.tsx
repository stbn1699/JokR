import {useMemo, useState} from "react";
import type {Room} from "./types";
import {TicTacToeGame} from "../tictactoe/TicTacToeGame";
import "./RoomView.css";

interface RoomViewProps {
    room: Room;
    onClose?: () => void;
    fullPage?: boolean;
    currentPlayerId?: string;
    onKickPlayer?: (playerId: string) => void;
}

export function RoomView({room, onClose, fullPage = false, currentPlayerId, onKickPlayer}: RoomViewProps) {
    const isGameMaster = currentPlayerId === room.masterId;
    const [isGameStarted, setIsGameStarted] = useState(false);
    const isMorpion = room.gameId === "morpion";

    const morpionPlayers = useMemo(() => room.players.slice(0, 2), [room.players]);
    const canStartMorpion = isMorpion && room.players.length >= 2;
    const showMorpionGame = (isGameStarted || canStartMorpion) && isMorpion;

    const renderRoomHeader = () => (
        <div className="room-view__header">
            <div>
                <p className="room-view__label">Salon</p>
                <div className="room-view__id">{room.id}</div>
                <p className="room-view__game-label">Jeu : {room.gameId === "morpion" ? "Morpion" : room.gameId}</p>
            </div>
            <div className="room-view__actions">
                {onClose && (
                    <button className="room-view__button room-view__button--ghost" type="button" onClick={onClose}>
                        Retour au menu
                    </button>
                )}
                {isMorpion && (
                    <button
                        className="room-view__button"
                        type="button"
                        disabled={!canStartMorpion}
                        onClick={() => setIsGameStarted(true)}
                    >
                        {canStartMorpion ? "Lancer la partie" : "En attente d'un deuxième joueur"}
                    </button>
                )}
            </div>
        </div>
    );

    const renderPlayersList = () => (
        <div>
            <p className="room-view__subtitle">
                Utilisateurs connectés ({room.players.length})
            </p>
            <ul className="room-view__players">
                {room.players.map((player) => (
                    <li key={player.id} className="room-view__player">
                        <div className="room-view__player-info">
                            <span className="room-view__player-name">{player.username}</span>
                            {player.id === room.masterId && (
                                <span className="room-view__badge">Maître du jeu</span>
                            )}
                        </div>
                        {isGameMaster && player.id !== currentPlayerId && (
                            <button
                                className="room-view__button room-view__kick"
                                type="button"
                                onClick={() => onKickPlayer?.(player.id)}
                            >
                                Retirer
                            </button>
                        )}
                    </li>
                ))}
            </ul>
        </div>
    );

    if (showMorpionGame && isMorpion) {
        return (
            <div className={`room-view${fullPage ? " room-view--full" : ""}`}>
                <div className="room-view__game-layout">
                    <aside className="room-view__sidebar">
                        {renderRoomHeader()}
                        <div className="room-view__sidebar-card">
                            <p className="room-view__hint-title">Infos rapides</p>
                            <ul className="room-view__hint-list">
                                <li>3 symboles alignés pour gagner.</li>
                                <li>30 secondes par tour avant placement aléatoire.</li>
                                <li>Fin de partie : retour automatique au salon.</li>
                            </ul>
                        </div>
                        {renderPlayersList()}
                    </aside>
                    <div className="room-view__game-surface">
                        <TicTacToeGame
                            room={room}
                            players={morpionPlayers}
                            onExit={() => setIsGameStarted(false)}
                        />
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className={`room-view${fullPage ? " room-view--full" : ""}`}>
            {renderRoomHeader()}

            {isMorpion && (
                <div className="room-view__cta">
                    <div>
                        <p className="room-view__cta-title">Morpion</p>
                        <p className="room-view__cta-text">
                            Appuie sur « Lancer la partie » dès que vous êtes deux dans le salon pour voir la grille en plein écran.
                        </p>
                    </div>
                    <button
                        className="room-view__button"
                        type="button"
                        disabled={!canStartMorpion}
                        onClick={() => setIsGameStarted(true)}
                    >
                        {canStartMorpion ? "Lancer la partie" : "En attente d'un deuxième joueur"}
                    </button>
                </div>
            )}

            {renderPlayersList()}
        </div>
    );
}
