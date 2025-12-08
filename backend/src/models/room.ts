export type RoomId = string;
export type PlayerId = string;

export interface Player {
    id: PlayerId;
    username: string;
    joinedAt: Date;
}

export interface Room {
    id: RoomId;
    gameId: string;
    createdAt: Date;
    players: Player[];
    maxPlayers: number;
}
