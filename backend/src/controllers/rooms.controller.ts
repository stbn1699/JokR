import { Request, Response } from "express";
import { roomsService } from "../services/rooms.service";

export const RoomsController = {
    // POST /rooms
    createRoom(req: Request, res: Response) {
        const { gameId, username } = req.body as {
            gameId?: string;
            username?: string;
        };

        if (!gameId || !username) {
            return res.status(400).json({
                error: "MISSING_FIELDS",
                message: "Required fields: gameId, username",
            });
        }

        const { room, player } = roomsService.createRoom(gameId, username);

        return res.status(201).json({
            room,
            player,
        });
    },

    // POST /rooms/:roomId/join
    joinRoom(req: Request, res: Response) {
        const { roomId } = req.params;
        const { username } = req.body as { username?: string };

        if (!username) {
            return res.status(400).json({
                error: "MISSING_FIELDS",
                message: "Required field: username",
            });
        }

        try {
            const { room, player } = roomsService.joinRoom(roomId, username);
            return res.status(200).json({ room, player });
        } catch (err) {
            const message = (err as Error).message;
            if (message === "ROOM_NOT_FOUND") {
                return res.status(404).json({ error: "ROOM_NOT_FOUND" });
            }
            if (message === "ROOM_FULL") {
                return res.status(409).json({ error: "ROOM_FULL" });
            }
            if (message === "USERNAME_TAKEN") {
                return res.status(409).json({ error: "USERNAME_TAKEN" });
            }
            console.error(err);
            return res.status(500).json({ error: "UNKNOWN_ERROR" });
        }
    },

    // POST /rooms/:roomId/leave
    leaveRoom(req: Request, res: Response) {
        const { roomId } = req.params;
        const { playerId } = req.body as { playerId?: string };

        if (!playerId) {
            return res.status(400).json({
                error: "MISSING_FIELDS",
                message: "Required field: playerId",
            });
        }

        try {
            const room = roomsService.leaveRoom(roomId, playerId);
            // room == null => salle détruite
            return res.status(200).json({ room });
        } catch (err) {
            const message = (err as Error).message;
            if (message === "ROOM_NOT_FOUND") {
                return res.status(404).json({ error: "ROOM_NOT_FOUND" });
            }
            if (message === "PLAYER_NOT_IN_ROOM") {
                return res.status(404).json({ error: "PLAYER_NOT_IN_ROOM" });
            }
            console.error(err);
            return res.status(500).json({ error: "UNKNOWN_ERROR" });
        }
    },

    // GET /rooms/:roomId
    getRoom(req: Request, res: Response) {
        const { roomId } = req.params;
        const room = roomsService.getRoom(roomId);
        if (!room) {
            return res.status(404).json({ error: "ROOM_NOT_FOUND" });
        }
        return res.status(200).json({ room });
    },

    // GET /rooms (debug)
    listRooms(_req: Request, res: Response) {
        const rooms = roomsService.listRooms();
        return res.status(200).json({ rooms });
    },
};
