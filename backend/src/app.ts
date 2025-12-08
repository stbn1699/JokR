import express from "express";
import cors from "cors";
import roomsRouter from "./routes/rooms.routes";

export function createApp() {
    const app = express();

    app.use(cors());
    app.use(express.json());

    app.get("/health", (_req, res) => {
        res.json({ status: "ok", service: "jokr-back" });
    });

    app.use("/api", roomsRouter);

    return app;
}
