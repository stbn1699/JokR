import express from "express";
import cors from "cors";
import gamesRoutes from "./routes/Games.routes.js";
import usersRoutes from "./routes/Users.routes.js";
import "dotenv/config";
import GameStatsRoutes from "./routes/GameStatsRoutes.js";

const app = express();
const PORT = Number(process.env.PORT ?? 3000);

app.use(express.json());

app.use(cors({ origin: process.env.CORS_ORIGIN }));

app.get("/ping", (_req, res) => {
	res.status(200).json({status: "ok", message: "pong"});
});

app.use("/games", gamesRoutes);
app.use("/users", usersRoutes);
app.use("/gameStats", GameStatsRoutes);

// error handler minimal
app.use((err: unknown, _req: express.Request, res: express.Response) => {
	console.error(err);
	res.status(500).json({status: "error", message: "Internal server error"});
});

app.listen(PORT, () => {
	console.log(`🚀 Server running on http://localhost:${PORT}`);
});
