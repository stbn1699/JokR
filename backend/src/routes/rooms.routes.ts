import { Router } from "express";
import { RoomsController } from "../controllers/rooms.controller";
import { MorpionController } from "../controllers/morpion.controller";

const router = Router();

// créer une room
router.post("/rooms", RoomsController.createRoom);

// rejoindre une room
router.post("/rooms/:roomId/join", RoomsController.joinRoom);

// quitter une room
router.post("/rooms/:roomId/leave", RoomsController.leaveRoom);

// retirer un joueur (maître du jeu)
router.post("/rooms/:roomId/kick", RoomsController.kickPlayer);

// fermer une room
router.delete("/rooms/:roomId", RoomsController.closeRoom);

// récupérer une room
router.get("/rooms/:roomId", RoomsController.getRoom);

// lister les rooms (debug/admin)
router.get("/rooms", RoomsController.listRooms);

// Morpion state
router.get("/rooms/:roomId/morpion", MorpionController.getState);
router.post("/rooms/:roomId/morpion/move", MorpionController.playMove);
router.post("/rooms/:roomId/morpion/reset", MorpionController.reset);

export default router;
