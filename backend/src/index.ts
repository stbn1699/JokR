import express from "express";
import cors from "cors";
import gamesRoutes from "./routes/Games.routes.js";
import usersRoutes from "./routes/Users.routes.js";
import "dotenv/config";
import GameStatsRoutes from "./routes/GameStatsRoutes.js";

/*
 * Point d'entrée de l'API backend
 * - Configure express, CORS et parsing JSON
 * - Monte les routers pour /games, /users, /gameStats
 * - Fournit une route /ping pour la vérification de santé
 * - Un handler d'erreur global minimal capture et logge les erreurs
 */
const app = express();
const PORT = Number(process.env.PORT ?? 3000);

app.use(express.json()); // parse le JSON des requêtes

// CORS configuré via la variable d'environnement CORS_ORIGIN (ex: http://localhost:5173)
app.use(cors({ origin: process.env.CORS_ORIGIN }));

// Route de healthcheck
app.get("/ping", (_req, res) => {
	res.status(200).json({status: "ok", message: "pong"});
});

// Montage des routes (les routers gèrent leurs propres chemins relatifs)
app.use("/games", gamesRoutes);
app.use("/users", usersRoutes);
app.use("/gameStats", GameStatsRoutes);

// error handler minimal — capture les erreurs qui remontent via next(err)
app.use((err: unknown, _req: express.Request, res: express.Response) => {
	console.error(err);
	res.status(500).json({status: "error", message: "Internal server error"});
});

app.listen(PORT, () => {
	console.log(`🚀 Server running on http://localhost:${PORT}`);
});
