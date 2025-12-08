import {useState} from "react";
import {API_URL} from "../../config/api";
import {GAMES, type GameDefinition} from "../../config/games";
import type {Room} from "../rooms/types";
import {RoomView} from "../rooms/RoomView";
import "./GamesList.css";

interface GamesListProps {
    username: string;
}

interface CreateRoomResponse {
    room: Room;
    player: Room["players"][number];
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

export function GamesList({username}: GamesListProps) {
    const [creatingGameId, setCreatingGameId] = useState<string | null>(null);
    const [activeRoom, setActiveRoom] = useState<Room | null>(null);
    const [refreshingRoomId, setRefreshingRoomId] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const handleCreateRoom = async (game: GameDefinition) => {
        setCreatingGameId(game.id);
        setError(null);

        try {
            const {room} = await createRoom(game, username);
            setActiveRoom(room);
        } catch (err) {
            setError((err as Error).message);
            setActiveRoom(null);
        } finally {
            setCreatingGameId(null);
        }
    };

    const handleRefreshRoom = async (roomId: string) => {
        setRefreshingRoomId(roomId);
        setError(null);

        try {
            const room = await fetchRoom(roomId);
            setActiveRoom(room);
        } catch (err) {
            setError((err as Error).message);
        } finally {
            setRefreshingRoomId(null);
        }
    };

    const handleCloseRoom = () => {
        setActiveRoom(null);
        setError(null);
    };

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
                    onRefresh={() => handleRefreshRoom(activeRoom.id)}
                    isRefreshing={refreshingRoomId === activeRoom.id}
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
