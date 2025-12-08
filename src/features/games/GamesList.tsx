import {type FormEvent, useEffect, useRef, useState} from "react";
import {API_URL} from "../../config/api";
import {GAMES, type GameDefinition} from "../../config/games";
import type {Room} from "../rooms/types";
import {RoomView} from "../rooms/RoomView";
import "./GamesList.css";

interface GamesListProps {
    username: string;
}

type RoomPlayer = Room["players"][number];

interface CreateRoomResponse {
    room: Room;
    player: RoomPlayer;
}

interface JoinRoomResponse {
    room: Room;
    player: RoomPlayer;
}

async function leaveRoom(roomId: string, playerId: string, useBeacon = false): Promise<void> {
    if (useBeacon && typeof navigator !== "undefined" && typeof navigator.sendBeacon === "function") {
        const payload = JSON.stringify({playerId});
        const success = navigator.sendBeacon(
            `${API_URL}/rooms/${roomId}/leave`,
            new Blob([payload], {type: "application/json"}),
        );

        if (success) {
            return;
        }
    }

    const res = await fetch(`${API_URL}/rooms/${roomId}/leave`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({playerId}),
        keepalive: true,
    });

    if (!res.ok) {
        const payload = (await res.json().catch(() => null)) as
            | { message?: string; error?: string }
            | null;
        const message = payload?.message || payload?.error || "Impossible de quitter le salon.";
        throw new Error(message);
    }
}

function formatPlayerNumbers(nums?: number[]): string {
    if (!nums || nums.length === 0) return "";

    const sorted = Array.from(new Set(nums)).sort((a, b) => a - b);

    const parts: string[] = [];
    let start = sorted[0];
    let end = sorted[0];

    for (let i = 1; i < sorted.length; i++) {
        const n = sorted[i];
        if (n === end + 1) {
            end = n;
        } else {
            parts.push(start === end ? `${start}` : `${start}-${end}`);
            start = end = n;
        }
    }
    parts.push(start === end ? `${start}` : `${start}-${end}`);

    const joined = parts.join(" ou ");
    // gestion du singulier/pluriel : singulier uniquement si l'unique option est 1
    const totalUnique = sorted.length;
    if (totalUnique === 1 && sorted[0] === 1) {
        return `${joined} joueur`;
    }
    return `${joined} joueurs`;
}

async function createRoom(game: GameDefinition, username: string): Promise<CreateRoomResponse> {
    const res = await fetch(`${API_URL}/rooms`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({ gameId: game.id, username }),
    });

    if (!res.ok) {
        const payload = (await res.json().catch(() => null)) as
            | { message?: string; error?: string }
            | null;
        const message = payload?.message || payload?.error || "Impossible de créer le salon.";
        throw new Error(message);
    }

    return (await res.json()) as CreateRoomResponse;
}

async function fetchRoom(roomId: string): Promise<Room> {
    const res = await fetch(`${API_URL}/rooms/${roomId}`);

    if (!res.ok) {
        const payload = (await res.json().catch(() => null)) as
            | { message?: string; error?: string }
            | null;
        const message = payload?.message || payload?.error || "Impossible de récupérer le salon.";
        throw new Error(message);
    }

    const {room} = (await res.json()) as { room: Room };
    return room;
}

async function joinRoom(roomId: string, username: string): Promise<JoinRoomResponse> {
    const res = await fetch(`${API_URL}/rooms/${roomId}/join`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({username}),
    });

    if (!res.ok) {
        const payload = (await res.json().catch(() => null)) as
            | { message?: string; error?: string }
            | null;

        if (payload?.error === "ROOM_NOT_FOUND") {
            throw new Error("Ce salon n'existe pas.");
        }

        if (payload?.error === "ROOM_FULL") {
            throw new Error("Le salon est plein.");
        }

        if (payload?.error === "USERNAME_TAKEN") {
            throw new Error("Ce pseudo est déjà utilisé dans ce salon.");
        }

        const message = payload?.message || payload?.error || "Impossible de rejoindre le salon.";
        throw new Error(message);
    }

    return (await res.json()) as JoinRoomResponse;
}

export function GamesList({username}: GamesListProps) {
    const [creatingGameId, setCreatingGameId] = useState<string | null>(null);
    const [activeRoom, setActiveRoom] = useState<Room | null>(null);
    const [activePlayer, setActivePlayer] = useState<RoomPlayer | null>(null);
    const [joinRoomId, setJoinRoomId] = useState("");
    const [isJoiningRoom, setIsJoiningRoom] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const activeRoomRef = useRef<Room | null>(null);
    const activePlayerRef = useRef<RoomPlayer | null>(null);

    useEffect(() => {
        activeRoomRef.current = activeRoom;
    }, [activeRoom]);

    useEffect(() => {
        activePlayerRef.current = activePlayer;
    }, [activePlayer]);

    useEffect(() => {
        const handleBeforeUnload = () => {
            const room = activeRoomRef.current;
            const player = activePlayerRef.current;

            if (room && player) {
                void leaveRoom(room.id, player.id, true);
            }
        };

        window.addEventListener("beforeunload", handleBeforeUnload);

        return () => {
            window.removeEventListener("beforeunload", handleBeforeUnload);
            handleBeforeUnload();
        };
    }, []);

    const handleCreateRoom = async (game: GameDefinition) => {
        setCreatingGameId(game.id);
        setError(null);

        try {
            const {room, player} = await createRoom(game, username);
            setActiveRoom(room);
            setActivePlayer(player);
        } catch (err) {
            setError((err as Error).message);
            setActiveRoom(null);
            setActivePlayer(null);
        } finally {
            setCreatingGameId(null);
        }
    };

    const handleJoinRoom = async (event: FormEvent) => {
        event.preventDefault();
        const trimmedRoomId = joinRoomId.trim();

        if (!trimmedRoomId) {
            setError("Merci d'indiquer l'identifiant du salon.");
            return;
        }

        setIsJoiningRoom(true);
        setError(null);

        try {
            const {room, player} = await joinRoom(trimmedRoomId, username);
            setActiveRoom(room);
            setActivePlayer(player);
        } catch (err) {
            setError((err as Error).message);
            setActiveRoom(null);
            setActivePlayer(null);
        } finally {
            setIsJoiningRoom(false);
        }
    };

    const handleCloseRoom = () => {
        const room = activeRoom;
        const player = activePlayer;

        if (room && player) {
            void leaveRoom(room.id, player.id).catch((err: unknown) => {
                setError((err as Error).message);
            });
        }

        setActiveRoom(null);
        setActivePlayer(null);
        setError(null);
    };

    useEffect(() => {
        if (!activeRoom) {
            return undefined;
        }

        let cancelled = false;

        const refreshRoom = async () => {
            try {
                const room = await fetchRoom(activeRoom.id);
                if (!cancelled) {
                    setActiveRoom(room);
                    setError(null);
                }
            } catch (err) {
                if (!cancelled) {
                    setError((err as Error).message);
                }
            }
        };

        void refreshRoom();
        const intervalId = window.setInterval(() => {
            void refreshRoom();
        }, 2000);

        return () => {
            cancelled = true;
            window.clearInterval(intervalId);
        };
    }, [activeRoom]);

    if (activeRoom) {
        return (
            <section className="room-page">
                {error && (
                    <div className="room-banner error">
                        Erreur : {error}
                    </div>
                )}
                <RoomView
                    room={activeRoom}
                    onClose={handleCloseRoom}
                    fullPage
                />
            </section>
        );
    }

    return (
        <section>
            <h2 className="section-title">Choisis un jeu</h2>
            {error && (
                <div className="room-banner error">
                    Erreur : {error}
                </div>
            )}
            <div className="join-room-card">
                <div>
                    <h3 className="join-room-title">Rejoindre un salon existant</h3>
                    <p className="join-room-description">Entre le code du salon pour t'y connecter et voir les autres joueurs.</p>
                </div>
                <form className="join-room-form" onSubmit={handleJoinRoom}>
                    <label className="join-room-label" htmlFor="join-room-id">
                        Identifiant du salon
                    </label>
                    <div className="join-room-row">
                        <input
                            id="join-room-id"
                            className="join-room-input"
                            value={joinRoomId}
                            onChange={(event) => setJoinRoomId(event.target.value)}
                            placeholder="Ex. a3f29b1c"
                            maxLength={16}
                        />
                        <button className="join-room-button" type="submit" disabled={isJoiningRoom}>
                            {isJoiningRoom ? "Connexion…" : "Rejoindre"}
                        </button>
                    </div>
                </form>
            </div>
            <div className="games-list">
                {GAMES.map((game) => (
                    <button
                        key={game.id}
                        className="game-button"
                        disabled={creatingGameId === game.id}
                        onClick={() => handleCreateRoom(game)}
                    >
                        <img
                            src={`public/gameIcons/${game.id}.png`}
                            alt="game icon"
                            className="game-button-icon">
                        </img>
                        <div className="game-button-title">{game.name}</div>
                        <div className="game-button-description">{game.description}</div>
                        <div className="game-button-players">{formatPlayerNumbers(game.playerNumbers)}</div>
                        <div className="game-button-start">
                            {creatingGameId === game.id ? "Création…" : "Créer un salon"}
                        </div>
                    </button>
                ))}
            </div>
        </section>
    );
}
