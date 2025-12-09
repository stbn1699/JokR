import { Request, Response } from "express";
import { morpionService } from "../services/morpion.service";
import { roomsService } from "../services/rooms.service";

function serializeState(state: ReturnType<typeof morpionService.getState>) {
    return {
        ...state,
        turnEndsAt: state.turnEndsAt ? state.turnEndsAt.toISOString() : null,
    };
}

export class MorpionController {
    static getState(req: Request, res: Response) {
        const { roomId } = req.params;
        const room = roomsService.getRoom(roomId);
        if (!room) {
            return res.status(404).json({ error: "Salon introuvable." });
        }

        const state = morpionService.getState(room);
        return res.status(200).json({ state: serializeState(state) });
    }

    static playMove(req: Request, res: Response) {
        const { roomId } = req.params;
        const { playerId, cellIndex } = req.body as { playerId: string; cellIndex: number };
        const room = roomsService.getRoom(roomId);
        if (!room) {
            return res.status(404).json({ error: "Salon introuvable." });
        }

        try {
            const state = morpionService.playMove(room, playerId, cellIndex);
            return res.status(200).json({ state: serializeState(state) });
        } catch (err) {
            return res.status(400).json({ error: (err as Error).message });
        }
    }

    static reset(req: Request, res: Response) {
        const { roomId } = req.params;
        const { masterId } = req.body as { masterId?: string };
        const room = roomsService.getRoom(roomId);
        if (!room) {
            return res.status(404).json({ error: "Salon introuvable." });
        }

        if (!masterId) {
            return res.status(400).json({ error: "Champ requis : masterId." });
        }

        if (room.masterId !== masterId) {
            return res.status(403).json({ error: "Seul le maître du jeu peut lancer ou réinitialiser la partie." });
        }

        const state = morpionService.reset(room);
        return res.status(200).json({ state: serializeState(state) });
    }
}
