import type {Room} from "./types";
import {RoomGameSurface} from "./RoomGameSurface";
import "./RoomView.css";

interface RoomViewProps {
    room: Room;
    fullPage?: boolean;
    currentPlayerId?: string;
    onKickPlayer?: (playerId: string) => void;
}

export function RoomView({room, fullPage = false, currentPlayerId, onKickPlayer}: RoomViewProps) {
    const isGameMaster = currentPlayerId === room.masterId;

    function returnToHome() {
        window.location.href = "/";
    }

    const renderRoomHeader = () => (
        <div className="room-view__header">
            <div>
                <p className="room-view__label">Salon</p>
                <div className="room-view__id">{room.id}</div>
                <p className="room-view__game-label">Jeu : {room.gameId === "morpion" ? "Morpion" : room.gameId}</p>
            </div>
            <div className="room-view__actions">
                <button className="room-view__button room-view__button--ghost" type="button" onClick={returnToHome}>
                    Retour au menu
                </button>
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

    return (
        <div className={`room-view${fullPage ? " room-view--full" : ""}`}>
            <div className="room-view__game-layout">
                <aside className="room-view__sidebar">
                    {renderRoomHeader()}
                    {renderPlayersList()}
                </aside>
                <div className="room-view__game-surface">
                    <RoomGameSurface room={room} players={room.players} currentPlayerId={currentPlayerId}/>
                </div>
            </div>
        </div>
    );
}
