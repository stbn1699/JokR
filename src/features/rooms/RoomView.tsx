import type {Room} from "./types";
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

    return (
        <div className={`room-view${fullPage ? " room-view--full" : ""}`}>
            <div className="room-view__header">
                <div>
                    <p className="room-view__label">Salon</p>
                    <div className="room-view__id">{room.id}</div>
                </div>
                <div className="room-view__actions">
                    {onClose && (
                        <button className="room-view__button room-view__button--ghost" type="button" onClick={onClose}>
                            Retour au menu
                        </button>
                    )}
                </div>
            </div>

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
}
