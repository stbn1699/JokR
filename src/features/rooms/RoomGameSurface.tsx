import {TicTacToeGame} from "../tictactoe/TicTacToeGame";
import type {Room, RoomPlayer} from "./types";

interface RoomGameSurfaceProps {
    room: Room;
    players: RoomPlayer[];
    currentPlayerId?: string;
}

export function RoomGameSurface({room, players, currentPlayerId}: RoomGameSurfaceProps) {
    if (room.gameId === "morpion") {
        return <TicTacToeGame room={room} players={players} currentPlayerId={currentPlayerId}/>;
    }

    return (
        <div className="room-view__game-placeholder">
            <p className="room-view__game-placeholder-title">Jeu en attente</p>
            <p className="room-view__game-placeholder-text">
                Le jeu {room.gameId} n'est pas encore prêt à être lancé depuis ce salon.
            </p>
        </div>
    );
}
