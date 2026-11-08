import {config} from "./config.js"; // en premier : charge le .env et vérifie les secrets
import express from "express";
import cors from "cors";
import {join} from "node:path";
import gamesRoutes from "./routes/Games.routes.js";
import usersRoutes from "./routes/Users.routes.js";
import GameStatsRoutes from "./routes/GameStatsRoutes.js";
import sudokuRoutes from "./routes/Sudoku.routes.js";
import bineroRoutes from "./routes/Binero.routes.js";
import rikudoRoutes from "./routes/Rikudo.routes.js";
import tectonicRoutes from "./routes/Tectonic.routes.js";
import galaxiesRoutes from "./routes/Galaxies.routes.js";
import shikakuRoutes from "./routes/Shikaku.routes.js";
import queensRoutes from "./routes/Queens.routes.js";
import dailyRoutes from "./routes/Daily.routes.js";
import leaderboardRoutes from "./routes/Leaderboard.routes.js";
import statsRoutes from "./routes/Stats.routes.js";
import notificationsRoutes from "./routes/Notifications.routes.js";
import friendsRoutes from "./routes/Friends.routes.js";
import challengesRoutes from "./routes/Challenges.routes.js";
import shopRoutes from "./routes/Shop.routes.js";
import feedbackRoutes from "./routes/Feedback.routes.js";
import {NotificationsRepository} from "./repository/Notifications.repository.js";
import playersRoutes from "./routes/Players.routes.js";
import {tracker} from "./services/tracker.js";
import {pool} from "./db/pool.js";
import {migrate} from "./db/migrate.js";
import {createDb} from "./db/kysely.js";
import {createDailyService} from "./services/daily.js";
import {startDailyScheduler} from "./services/dailyScheduler.js";

/*
 * Point d'entrée de l'API backend
 * - Configure express, CORS et parsing JSON
 * - Monte les routers sous API_PREFIX (vide en dev, /api dans l'image Docker)
 * - Dans l'image Docker : applique les migrations puis sert aussi le front compilé (STATIC_DIR)
 * - Un handler d'erreur global minimal capture et logge les erreurs
 */
const app = express();

app.set("trust proxy", config.trustProxy);
app.disable("x-powered-by");
app.use(express.json()); // parse le JSON des requêtes

// CORS configuré via la variable d'environnement CORS_ORIGIN (ex: http://localhost:5173)
app.use(cors({ origin: config.corsOrigin }));

const api = express.Router();

// Route de healthcheck
api.get("/ping", (_req, res) => {
	res.status(200).json({status: "ok", message: "pong"});
});

// Statistiques : dernière activité des joueurs connectés
api.use(tracker.activity);

// Montage des routes (les routers gèrent leurs propres chemins relatifs)
api.use("/games", gamesRoutes);
api.use("/users", usersRoutes);
api.use("/gameStats", GameStatsRoutes);
api.use("/sudoku", sudokuRoutes);
api.use("/binero", bineroRoutes);
api.use("/rikudo", rikudoRoutes);
api.use("/tectonic", tectonicRoutes);
api.use("/galaxies", galaxiesRoutes);
api.use("/shikaku", shikakuRoutes);
api.use("/queens", queensRoutes);
api.use("/daily", dailyRoutes);
api.use("/leaderboard", leaderboardRoutes);
api.use("/stats", statsRoutes);
api.use("/notifications", notificationsRoutes);
api.use("/friends", friendsRoutes);
api.use("/challenges", challengesRoutes);
api.use("/shop", shopRoutes);
api.use("/feedback", feedbackRoutes);
api.use("/players", playersRoutes);

if (config.apiPrefix) {
	// Route d'API inconnue : réponse JSON plutôt que la page du front
	api.use((_req, res) => {
		res.status(404).json({status: "error", message: "Route introuvable"});
	});
}

app.use(config.apiPrefix || "/", api);

if (config.staticDir) {
	const staticDir = config.staticDir;
	// Fichiers de assets/ : leur nom change à chaque build, ils peuvent être gardés en cache longtemps
	app.use("/assets", express.static(join(staticDir, "assets"), {immutable: true, maxAge: "1y", fallthrough: false}));
	app.use(express.static(staticDir, {index: false, maxAge: "1h"}));
	// Toutes les autres pages : l'application React (React Router gère l'adresse)
	app.get("/{*page}", (_req, res) => {
		res.setHeader("Cache-Control", "no-cache");
		res.sendFile(join(staticDir, "index.html"));
	});
}

// error handler minimal — capture les erreurs qui remontent via next(err)
app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    void _next; // explicit mark as used to satisfy linters
	// Fichier statique introuvable (ex: ancien /assets après une mise à jour)
	if (typeof err === "object" && err !== null && "status" in err && err.status === 404) {
		res.status(404).end();
		return;
	}
	console.error(err);
	// renvoie une réponse standardisée
	res.status(500).json({status: "error", message: "Erreur interne du serveur, réessaie plus tard"});
});

if (config.migrationsDir) {
	await migrate(pool, config.migrationsDir);
}

const server = app.listen(config.port, () => {
	console.log(`🚀 Server running on http://localhost:${config.port}`);
});

// Défis du jour : générés au démarrage s'ils manquent, puis chaque nuit à minuit (heure de Paris)
// À minuit, les défis de la veille se terminent : chaque joueur reçoit ses places finales en notification
const notifications = new NotificationsRepository(createDb(pool));
startDailyScheduler(createDailyService(createDb(pool)), console.log, date => notifications.createDailyResults(date));

// Arrêt propre (docker stop envoie SIGTERM)
for (const signal of ["SIGTERM", "SIGINT"] as const) {
	process.on(signal, () => {
		console.log(`${signal} reçu, arrêt du serveur`);
		server.close(() => void pool.end().finally(() => process.exit(0)));
		setTimeout(() => process.exit(0), 5000).unref();
	});
}
