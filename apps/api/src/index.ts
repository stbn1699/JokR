import express from "express";
import cors from "cors";
import {createServer} from "http";
import {Server} from "socket.io";
import {randomUUID} from "node:crypto";

const PORT = Number(process.env.PORT) || 3001;
const FRONT_ORIGIN = process.env.FRONT_ORIGIN || "http://localhost:5173";
const MAX_PLAYERS = 8;

type PlayerStatus = "ready" | "waiting";

type RoomPlayer = {
    id: string;
    name: string;
    status: PlayerStatus;
    avatarColor: string;
    joinedAt: number;
};

type ChatMessage = {
    id: string;
    author: string;
    body: string;
    timestamp: string;
    type?: "system";
};

type RoomSnapshot = {
    id: string;
    gameId: string | null;
    hostId: string | null;
    players: RoomPlayer[];
};

type RoomData = {
    id: string;
    gameId: string | null;
    hostId: string | null;
    players: Map<string, RoomPlayer>;
    messages: ChatMessage[];
};

type JoinPayload = {
    roomId?: string;
    playerName?: string;
    gameId?: string;
};

type MessagePayload = {
    body?: string;
};

const AVATAR_COLORS = [
    "#6366f1",
    "#f97316",
    "#22d3ee",
    "#84cc16",
    "#facc15",
    "#e879f9",
    "#f472b6",
    "#38bdf8",
];

const rooms = new Map<string, RoomData>();
const socketRooms = new Map<string, string>();

const app = express();
app.use(cors({origin: FRONT_ORIGIN}));
app.use(express.json());

// Healthcheck simple
app.get("/ping", (_req, res) => res.json({ok: true, name: "JokR API"}));

// HTTP server + Socket.IO
const httpServer = createServer(app);
const io = new Server(httpServer, {
    cors: {origin: FRONT_ORIGIN},
});

const assignAvatarColor = (room: RoomData): string => {
    const usedColors = new Set(Array.from(room.players.values(), (player) => player.avatarColor));
    for (const color of AVATAR_COLORS) {
        if (!usedColors.has(color)) {
            return color;
        }
    }

    return AVATAR_COLORS[room.players.size % AVATAR_COLORS.length];
};

const createSystemMessage = (body: string): ChatMessage => ({
    id: randomUUID(),
    author: "Système",
    body,
    timestamp: new Date().toISOString(),
    type: "system",
});

const serializeRoom = (room: RoomData): RoomSnapshot => ({
    id: room.id,
    gameId: room.gameId,
    hostId: room.hostId,
    players: Array.from(room.players.values()).sort((a, b) => a.joinedAt - b.joinedAt),
});

const broadcastRoomState = (roomId: string) => {
    const room = rooms.get(roomId);
    if (!room) {
        return;
    }

    io.to(roomId).emit("room:state", serializeRoom(room));
};

const removePlayerFromRoom = (roomId: string, socketId: string) => {
    const room = rooms.get(roomId);
    if (!room) {
        return null;
    }

    const player = room.players.get(socketId);
    if (!player) {
        return null;
    }

    room.players.delete(socketId);
    socketRooms.delete(socketId);

    if (room.hostId === socketId) {
        const [nextHost] = Array.from(room.players.values()).sort((a, b) => a.joinedAt - b.joinedAt);
        room.hostId = nextHost?.id ?? null;
    }

    if (room.players.size === 0) {
        rooms.delete(roomId);
    }

    return {room, player};
};

io.on("connection", (socket) => {
    console.log("✅ client connecté:", socket.id);

    const handleJoin = ({roomId, playerName, gameId}: JoinPayload) => {
        const trimmedRoomId = roomId?.trim();
        const trimmedName = playerName?.trim();

        if (!trimmedRoomId || !trimmedName) {
            socket.emit("room:error", {
                message: "Impossible de rejoindre le salon. Vérifiez l'identifiant et votre pseudo.",
            });
            return;
        }

        const safeName = trimmedName.slice(0, 40);
        const existingRoomId = socketRooms.get(socket.id);
        if (existingRoomId && existingRoomId !== trimmedRoomId) {
            const result = removePlayerFromRoom(existingRoomId, socket.id);
            if (result) {
                const {room: previousRoom, player} = result;
                const leaveMessage = createSystemMessage(`${player.name} a quitté le salon.`);
                previousRoom.messages.push(leaveMessage);
                previousRoom.messages = previousRoom.messages.slice(-100);
                socket.to(existingRoomId).emit("room:message", leaveMessage);
                if (previousRoom.players.size > 0) {
                    broadcastRoomState(existingRoomId);
                }
            }
        }

        let room = rooms.get(trimmedRoomId);
        if (!room) {
            room = {
                id: trimmedRoomId,
                gameId: gameId?.trim() || null,
                hostId: socket.id,
                players: new Map<string, RoomPlayer>(),
                messages: [],
            };
            rooms.set(trimmedRoomId, room);
        }

        if (room.players.size >= MAX_PLAYERS) {
            socket.emit("room:error", {message: "Le salon est complet."});
            return;
        }

        if (!room.gameId && gameId) {
            room.gameId = gameId.trim();
        }

        if (!room.hostId) {
            room.hostId = socket.id;
        }

        const existingPlayer = room.players.get(socket.id);
        if (existingPlayer) {
            existingPlayer.name = safeName;
            socket.emit("room:init", {
                selfId: socket.id,
                room: serializeRoom(room),
                messages: room.messages,
            });
            broadcastRoomState(trimmedRoomId);
            return;
        }

        const player: RoomPlayer = {
            id: socket.id,
            name: safeName,
            status: "waiting",
            avatarColor: assignAvatarColor(room),
            joinedAt: Date.now(),
        };

        if (room.players.size === 0) {
            room.hostId = socket.id;
        }

        room.players.set(socket.id, player);
        socketRooms.set(socket.id, trimmedRoomId);
        socket.join(trimmedRoomId);

        const joinMessage = createSystemMessage(`${player.name} a rejoint le salon.`);
        room.messages.push(joinMessage);
        room.messages = room.messages.slice(-100);

        socket.emit("room:init", {
            selfId: socket.id,
            room: serializeRoom(room),
            messages: room.messages,
        });

        socket.to(trimmedRoomId).emit("room:message", joinMessage);
        broadcastRoomState(trimmedRoomId);
    };

    const handleToggleReady = () => {
        const roomId = socketRooms.get(socket.id);
        if (!roomId) {
            return;
        }

        const room = rooms.get(roomId);
        if (!room) {
            return;
        }

        const player = room.players.get(socket.id);
        if (!player) {
            return;
        }

        player.status = player.status === "ready" ? "waiting" : "ready";
        broadcastRoomState(roomId);
    };

    const handleMessage = ({body}: MessagePayload) => {
        const trimmed = body?.trim();
        if (!trimmed) {
            return;
        }

        const roomId = socketRooms.get(socket.id);
        if (!roomId) {
            return;
        }

        const room = rooms.get(roomId);
        if (!room) {
            return;
        }

        const author = room.players.get(socket.id);
        if (!author) {
            return;
        }

        const message: ChatMessage = {
            id: randomUUID(),
            author: author.name,
            body: trimmed.slice(0, 500),
            timestamp: new Date().toISOString(),
        };

        room.messages.push(message);
        room.messages = room.messages.slice(-100);

        io.to(roomId).emit("room:message", message);
    };

    const handleLeave = () => {
        const roomId = socketRooms.get(socket.id);
        if (!roomId) {
            return;
        }

        const result = removePlayerFromRoom(roomId, socket.id);
        if (!result) {
            return;
        }

        const {room, player} = result;
        const leaveMessage = createSystemMessage(`${player.name} a quitté le salon.`);
        room.messages.push(leaveMessage);
        room.messages = room.messages.slice(-100);

        socket.leave(roomId);

        io.to(roomId).emit("room:message", leaveMessage);
        if (room.players.size > 0) {
            broadcastRoomState(roomId);
        }
    };

    socket.on("room:join", handleJoin);
    socket.on("room:toggleReady", handleToggleReady);
    socket.on("room:message", handleMessage);
    socket.on("room:leave", handleLeave);

    socket.on("disconnect", (reason) => {
        const roomId = socketRooms.get(socket.id);
        if (roomId) {
            const result = removePlayerFromRoom(roomId, socket.id);
            if (result) {
                const {room, player} = result;
                const leaveMessage = createSystemMessage(`${player.name} a quitté le salon (${reason}).`);
                room.messages.push(leaveMessage);
                room.messages = room.messages.slice(-100);
                socket.to(roomId).emit("room:message", leaveMessage);
                if (room.players.size > 0) {
                    broadcastRoomState(roomId);
                }
            }
        }

        console.log("👋 client déconnecté:", socket.id, reason);
    });
});

httpServer.listen(PORT, () => {
    console.log(`API OK → http://localhost:${PORT}`);
    console.log(`CORS autorisé depuis: ${FRONT_ORIGIN}`);
});
