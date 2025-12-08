export interface RoomPlayer {
    id: string;
    username: string;
    joinedAt: string;
}

export interface Room {
    id: string;
    gameId: string;
    createdAt: string;
    players: RoomPlayer[];
    maxPlayers: number;
}
