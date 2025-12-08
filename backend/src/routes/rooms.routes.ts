import { Router } from "express";
import { RoomsController } from "../controllers/rooms.controller";

const router = Router();

// créer une room
router.post("/rooms", RoomsController.createRoom);

// rejoindre une room
router.post("/rooms/:roomId/join", RoomsController.joinRoom);

// quitter une room
router.post("/rooms/:roomId/leave", RoomsController.leaveRoom);

// retirer un joueur (maître du jeu)
router.post("/rooms/:roomId/kick", RoomsController.kickPlayer);

// récupérer une room
router.get("/rooms/:roomId", RoomsController.getRoom);

// lister les rooms (debug/admin)
router.get("/rooms", RoomsController.listRooms);

export default router;
