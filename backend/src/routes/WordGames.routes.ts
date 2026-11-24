import {Router} from "express";
import {pool} from "../db/pool.js";
import {createDb} from "../db/kysely.js";
import {createWordGamesController} from "../controllers/WordGames.controller.js";
import {ProgressionService} from "../services/Progression.service.js";
import {GamesService} from "../services/Games.service.js";
import {GamesRepository} from "../repository/Games.repository.js";
import {createDailyService} from "../services/daily.js";
import {optionalAuth} from "../middleware/auth.js";

const db = createDb(pool);
const controller = createWordGamesController(new ProgressionService(db), new GamesService(new GamesRepository(db)), createDailyService(db));

// /devimot : settings, generate { size, amount }, games/:gameId, guess { gameId, word }
export const devimotRoutes = Router();
devimotRoutes.get("/settings", controller.devimot.settings);
devimotRoutes.post("/generate", controller.devimot.generate);
devimotRoutes.get("/games/:gameId", controller.devimot.status);
devimotRoutes.post("/guess", optionalAuth, controller.devimot.guess);

// /echelle : settings, generate { size, amount }, games/:gameId, check { from, word }, validate { gameId, path }
export const echelleRoutes = Router();
echelleRoutes.get("/settings", controller.echelle.settings);
echelleRoutes.post("/generate", controller.echelle.generate);
echelleRoutes.get("/games/:gameId", controller.echelle.status);
echelleRoutes.post("/check", controller.echelle.check);
echelleRoutes.post("/validate", optionalAuth, controller.echelle.validate);

// /mots-meles : settings, generate { size, amount }, games/:gameId, validate { gameId, found }
export const motsMelesRoutes = Router();
motsMelesRoutes.get("/settings", controller.motsMeles.settings);
motsMelesRoutes.post("/generate", controller.motsMeles.generate);
motsMelesRoutes.get("/games/:gameId", controller.motsMeles.status);
motsMelesRoutes.post("/validate", optionalAuth, controller.motsMeles.validate);

// /mots-a-caser : settings, generate { size, amount }, games/:gameId, validate { gameId, grid }
export const motsACaserRoutes = Router();
motsACaserRoutes.get("/settings", controller.motsACaser.settings);
motsACaserRoutes.post("/generate", controller.motsACaser.generate);
motsACaserRoutes.get("/games/:gameId", controller.motsACaser.status);
motsACaserRoutes.post("/validate", optionalAuth, controller.motsACaser.validate);
