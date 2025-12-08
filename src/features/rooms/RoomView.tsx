import type {Room} from "./types";
import "./RoomView.css";

interface RoomViewProps {
    room: Room;
    onRefresh?: () => Promise<void> | void;
    isRefreshing?: boolean;
    onClose?: () => void;
    fullPage?: boolean;
}

export function RoomView({room, onRefresh, isRefreshing = false, onClose, fullPage = false}: RoomViewProps) {
    return (
        <div className={`room-view${fullPage ? " room-view--full" : ""}`}>
            <div className="room-view__header">
                <div>
                    <p className="room-view__label">Salon</p>
                    <div className="room-view__id">{room.id}</div>
                </div>
                <div className="room-view__actions">
                    {onRefresh && (
                        <button
                            className="room-view__button"
                            type="button"
                            onClick={() => void onRefresh()}
                            disabled={isRefreshing}
                        >
                            {isRefreshing ? "Actualisation…" : "Actualiser"}
                        </button>
                    )}
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
                        <span className="room-view__player-name">{player.username}</span>
                    </li>
                ))}
            </ul>
        </div>
    );
}
