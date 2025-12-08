import { randomUUID } from "crypto";
import { Room, RoomId, Player, PlayerId } from "../models/room";

class RoomsService {
    private rooms: Map<RoomId, Room> = new Map();

    // Génère un ID de room, pour l’instant un UUID raccourci
    private generateRoomId(): RoomId {
        return randomUUID().slice(0, 8); // ex: "a3f29b1c"
    }

    private generatePlayerId(): PlayerId {
        return randomUUID();
    }

    createRoom(gameId: string, username: string): { room: Room; player: Player } {
        const roomId = this.generateRoomId();
        const player: Player = {
            id: this.generatePlayerId(),
            username,
            joinedAt: new Date(),
        };

        const room: Room = {
            id: roomId,
            gameId,
            createdAt: new Date(),
            players: [player],
            maxPlayers: 8, // valeur arbitraire pour l’instant
        };

        this.rooms.set(roomId, room);

        return { room, player };
    }

    getRoom(roomId: RoomId): Room | undefined {
        return this.rooms.get(roomId);
    }

    joinRoom(roomId: RoomId, username: string): { room: Room; player: Player } {
        const room = this.rooms.get(roomId);
        if (!room) {
            throw new Error("ROOM_NOT_FOUND");
        }

        if (room.players.length >= room.maxPlayers) {
            throw new Error("ROOM_FULL");
        }

        // optionnel : empêcher deux mêmes pseudos
        const existing = room.players.find((p) => p.username === username);
        if (existing) {
            throw new Error("USERNAME_TAKEN");
        }

        const player: Player = {
            id: this.generatePlayerId(),
            username,
            joinedAt: new Date(),
        };

        room.players.push(player);
        return { room, player };
    }

    leaveRoom(roomId: RoomId, playerId: PlayerId): Room | null {
        const room = this.rooms.get(roomId);
        if (!room) {
            throw new Error("ROOM_NOT_FOUND");
        }

        const before = room.players.length;
        room.players = room.players.filter((p) => p.id !== playerId);

        // si plus personne → on supprime la room de la mémoire
        if (room.players.length === 0) {
            this.rooms.delete(roomId);
            return null;
        }

        // si rien n’a changé, playerId inconnu
        if (before === room.players.length) {
            throw new Error("PLAYER_NOT_IN_ROOM");
        }

        return room;
    }

    listRooms(): Room[] {
        return Array.from(this.rooms.values());
    }
}

export const roomsService = new RoomsService();
