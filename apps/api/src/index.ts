import express from "express";
import cors from "cors";
import { createServer } from "http";
import { Server } from "socket.io";

const PORT = Number(process.env.PORT) || 3001;
const FRONT_ORIGIN = process.env.FRONT_ORIGIN || "http://localhost:5173";

const app = express();
app.use(cors({ origin: FRONT_ORIGIN }));
app.use(express.json());

// Healthcheck simple
app.get("/ping", (_req, res) => res.json({ ok: true, name: "JokR API" }));

// HTTP server + Socket.IO
const httpServer = createServer(app);
const io = new Server(httpServer, {
    cors: { origin: FRONT_ORIGIN }
});

io.on("connection", (socket) => {
    console.log("✅ client connecté:", socket.id);

    // message de bienvenue
    socket.emit("hello", { msg: "Bienvenue sur JokR!" });

    // echo de test
    socket.on("ping", (payload) => {
        socket.emit("pong", { at: Date.now(), payload });
    });

    socket.on("disconnect", (reason) => {
        console.log("👋 client déconnecté:", socket.id, reason);
    });
});

httpServer.listen(PORT, () => {
    console.log(`API OK → http://localhost:${PORT}`);
    console.log(`CORS autorisé depuis: ${FRONT_ORIGIN}`);
});
