import express from "express";
import cors from "cors";
import {createServer} from "http";
import {Server} from "socket.io";
import {randomUUID} from "node:crypto";
import {
    MORPION_CONFIG,
    MORPION_MESSAGES,
    createDefaultMorpionSettings,
    createInitialMorpionState,
    ensureMorpionSettingsForPlayers,
    evaluateMorpionBoard,
    findMorpionWinnerId,
    getNextMorpionPlayerId,
    type MorpionSettings,
    type MorpionState,
    type MorpionSymbol,
} from "./games/morpion";

const PORT = Number(process.env.PORT) || 3001;
const FRONT_ORIGIN = process.env.FRONT_ORIGIN || "http://localhost:5173";

type PlayerStatus = "ready" | "waiting";

type RoomStatus = "lobby" | "started";

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
    status: RoomStatus;
    morpion: MorpionState | null;
    morpionSettings: MorpionSettings;
};

type RoomData = {
    id: string;
    gameId: string | null;
    hostId: string | null;
    players: Map<string, RoomPlayer>;
    messages: ChatMessage[];
    status: RoomStatus;
    morpion: MorpionState | null;
    morpionSettings: MorpionSettings;
};

type JoinPayload = {
    roomId?: string;
    playerName?: string;
    gameId?: string;
};

type MessagePayload = {
    body?: string;
};

type UpdateMorpionSettingsPayload = {
    crossPlayerId?: string | null;
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

const getMorpionPlayerRefs = (room: RoomData) =>
    Array.from(room.players.values(), (player) => ({id: player.id, joinedAt: player.joinedAt}));

const syncMorpionSettings = (room: RoomData): MorpionSettings => {
    const settings = ensureMorpionSettingsForPlayers(getMorpionPlayerRefs(room), room.morpionSettings);
    room.morpionSettings = settings;
    return settings;
};

const serializeRoom = (room: RoomData): RoomSnapshot => ({
    id: room.id,
    gameId: room.gameId,
    hostId: room.hostId,
    players: Array.from(room.players.values()).sort((a, b) => a.joinedAt - b.joinedAt),
    status: room.status,
    morpion: room.morpion,
    morpionSettings: syncMorpionSettings(room),
});

const broadcastRoomState = (roomId: string) => {
    const room = rooms.get(roomId);
    if (!room) {
        return;
    }

    io.to(roomId).emit("room:state", serializeRoom(room));
};

const transitionMorpionRoomToLobby = (roomId: string, room: RoomData) => {
    room.status = "lobby";
    room.morpion = null;
    room.players.forEach((player) => {
        player.status = "waiting";
    });

    const returnMessage = createSystemMessage(MORPION_MESSAGES.returnToLobby);
    room.messages.push(returnMessage);
    room.messages = room.messages.slice(-100);

    io.to(roomId).emit("room:message", returnMessage);
    syncMorpionSettings(room);
    broadcastRoomState(roomId);
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

    if (room.status === "started") {
        room.status = "lobby";
        room.players.forEach((player) => {
            player.status = "waiting";
        });
        room.morpion = null;
    }

    if (room.players.size === 0) {
        rooms.delete(roomId);
    } else {
        syncMorpionSettings(room);
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
                status: "lobby",
                morpion: null,
                morpionSettings: createDefaultMorpionSettings(),
            };
            rooms.set(trimmedRoomId, room);
        }

        if (room.players.size >= MORPION_CONFIG.maxPlayers) {
            socket.emit("room:error", {message: MORPION_MESSAGES.roomFull});
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
            syncMorpionSettings(room);
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

        syncMorpionSettings(room);

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

        if (room.status === "started") {
            return;
        }

        const player = room.players.get(socket.id);
        if (!player) {
            return;
        }

        player.status = player.status === "ready" ? "waiting" : "ready";
        broadcastRoomState(roomId);
    };

    const handleStartGame = () => {
        const roomId = socketRooms.get(socket.id);
        if (!roomId) {
            return;
        }

        const room = rooms.get(roomId);
        if (!room) {
            return;
        }

        if (room.hostId !== socket.id) {
            socket.emit("room:error", {message: "Seul l'organisateur peut lancer la partie."});
            return;
        }

        if (room.status === "started") {
            socket.emit("room:error", {message: "La partie est déjà en cours."});
            return;
        }

        if (room.players.size < MORPION_CONFIG.maxPlayers) {
            socket.emit("room:error", {message: MORPION_MESSAGES.notEnoughPlayersToStart});
            return;
        }

        const everyoneReady = Array.from(room.players.values()).every((player) => player.status === "ready");
        if (!everyoneReady) {
            socket.emit("room:error", {message: MORPION_MESSAGES.notEveryoneReady});
            return;
        }

        room.status = "started";
        const playersList = Array.from(room.players.values());
        const settings = syncMorpionSettings(room);
        room.morpion = createInitialMorpionState(playersList, settings);

        const startMessage = createSystemMessage(MORPION_MESSAGES.startAnnouncement);
        room.messages.push(startMessage);
        room.messages = room.messages.slice(-100);

        io.to(roomId).emit("room:message", startMessage);
        broadcastRoomState(roomId);
    };

    const handleMorpionMove = ({cellIndex}: {cellIndex?: number}) => {
        if (typeof cellIndex !== "number" || Number.isNaN(cellIndex)) {
            return;
        }

        const roomId = socketRooms.get(socket.id);
        if (!roomId) {
            return;
        }

        const room = rooms.get(roomId);
        if (!room || room.status !== "started" || !room.morpion) {
            return;
        }

        const state = room.morpion;
        if (state.status !== "playing") {
            return;
        }

        if (socket.id !== state.currentPlayerId) {
            return;
        }

        if (cellIndex < 0 || cellIndex >= state.board.length) {
            return;
        }

        if (state.board[cellIndex] !== null) {
            return;
        }

        const symbol = state.symbols[socket.id];
        if (!symbol) {
            return;
        }

        state.board = state.board.slice();
        state.board[cellIndex] = symbol;

        const {symbol: winningSymbol, winningLine, isFull} = evaluateMorpionBoard(state.board);

        if (winningSymbol) {
            const winnerId = findMorpionWinnerId(state.symbols, winningSymbol, socket.id);
            state.status = "won";
            state.winnerId = winnerId;
            state.winningLine = winningLine;
            state.currentPlayerId = null;
            state.turnExpiresAt = null;

            const winner = room.players.get(winnerId);
            const victoryMessage = createSystemMessage(MORPION_MESSAGES.victory(winner?.name));
            room.messages.push(victoryMessage);
            room.messages = room.messages.slice(-100);
            io.to(roomId).emit("room:message", victoryMessage);
            io.to(roomId).emit("morpion:finished", {reason: "win", winnerId});
            transitionMorpionRoomToLobby(roomId, room);
            return;
        }

        if (isFull) {
            state.status = "draw";
            state.winnerId = null;
            state.winningLine = null;
            state.currentPlayerId = null;
            state.turnExpiresAt = null;

            const drawMessage = createSystemMessage(MORPION_MESSAGES.draw);
            room.messages.push(drawMessage);
            room.messages = room.messages.slice(-100);
            io.to(roomId).emit("room:message", drawMessage);
            io.to(roomId).emit("morpion:finished", {reason: "draw", winnerId: null});
            transitionMorpionRoomToLobby(roomId, room);
            return;
        }

        const nextPlayerId = getNextMorpionPlayerId(state.symbols, socket.id);
        state.currentPlayerId = nextPlayerId;
        state.turnExpiresAt = nextPlayerId ? Date.now() + MORPION_CONFIG.turnDurationMs : null;

        broadcastRoomState(roomId);
    };

    const handleSyncState = () => {
        const roomId = socketRooms.get(socket.id);
        if (!roomId) {
            return;
        }

        const room = rooms.get(roomId);
        if (!room) {
            return;
        }

        socket.emit("room:state", serializeRoom(room));
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

    const handleUpdateMorpionSettings = ({crossPlayerId}: UpdateMorpionSettingsPayload = {}) => {
        const roomId = socketRooms.get(socket.id);
        if (!roomId) {
            return;
        }

        const room = rooms.get(roomId);
        if (!room) {
            return;
        }

        if (room.hostId !== socket.id) {
            socket.emit("room:error", {
                message: MORPION_MESSAGES.hostOnlySettings,
            });
            return;
        }

        if (room.status !== "lobby") {
            socket.emit("room:error", {
                message: MORPION_MESSAGES.settingsLocked,
            });
            return;
        }

        const players = Array.from(room.players.values());
        const sortedPlayers = [...players].sort((a, b) => a.joinedAt - b.joinedAt);
        const hasTarget = crossPlayerId ? sortedPlayers.some((player) => player.id === crossPlayerId) : false;
        const preferredCrossId = hasTarget ? crossPlayerId : sortedPlayers[0]?.id;
        const baseSymbols: Record<string, MorpionSymbol> = {};

        if (preferredCrossId) {
            baseSymbols[preferredCrossId] = "X";
        }

        room.morpionSettings = ensureMorpionSettingsForPlayers(sortedPlayers, {symbols: baseSymbols});
        broadcastRoomState(roomId);
    };

    const handleReturnToLobby = () => {
        const roomId = socketRooms.get(socket.id);
        if (!roomId) {
            return;
        }

        const room = rooms.get(roomId);
        if (!room) {
            return;
        }

        if (room.status !== "started" || !room.morpion) {
            return;
        }

        if (room.morpion.status === "playing") {
            return;
        }

        transitionMorpionRoomToLobby(roomId, room);
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
    socket.on("room:start", handleStartGame);
    socket.on("room:message", handleMessage);
    socket.on("room:leave", handleLeave);
    socket.on("room:returnToLobby", handleReturnToLobby);
    socket.on("room:sync", handleSyncState);
    socket.on("morpion:move", handleMorpionMove);
    socket.on("morpion:updateSettings", handleUpdateMorpionSettings);

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
