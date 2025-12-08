import {type FormEvent, useCallback, useEffect, useMemo, useState} from "react";
import {API_URL} from "../../config/api";
import type {Room} from "../rooms/types";
import "./AdminPage.css";

const ADMIN_PASSWORD = import.meta.env.VITE_ADMIN_PASSWORD;

interface ListRoomsResponse {
    rooms: Room[];
}

export function AdminPage() {
    const [inputPassword, setInputPassword] = useState("");
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [authError, setAuthError] = useState<string | null>(null);
    const [rooms, setRooms] = useState<Room[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [fetchError, setFetchError] = useState<string | null>(null);
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
    const [now, setNow] = useState(() => Date.now());
    const [expandedRooms, setExpandedRooms] = useState<Set<string>>(new Set());
    const [actionLoading, setActionLoading] = useState<string | null>(null);

    const passwordConfigured = useMemo(() => Boolean(ADMIN_PASSWORD), []);

    useEffect(() => {
        if (!isAuthenticated) return;

        const interval = setInterval(() => {
            setNow(Date.now());
        }, 1000);

        return () => clearInterval(interval);
    }, [isAuthenticated]);

    const formatElapsedSeconds = useCallback((dateString: string | Date) => {
        const timestamp = typeof dateString === "string" ? new Date(dateString).getTime() : dateString.getTime();
        const seconds = Math.max(0, Math.floor((now - timestamp) / 1000));
        return `${seconds} s`;
    }, [now]);

    const refreshRooms = useCallback(async () => {
        setIsLoading(true);
        setFetchError(null);
        try {
            const response = await fetch(`${API_URL}/rooms`);
            if (!response.ok) {
                throw new Error("Impossible de récupérer les salons.");
            }
            const data = (await response.json()) as ListRoomsResponse;
            setRooms(data.rooms ?? []);
            setExpandedRooms((previous) => {
                const next = new Set<string>();
                const roomIds = new Set((data.rooms ?? []).map((room) => room.id));
                previous.forEach((id) => {
                    if (roomIds.has(id)) {
                        next.add(id);
                    }
                });
                return next;
            });
            setLastUpdated(new Date());
        } catch (error) {
            const message = (error as Error).message || "Erreur inconnue";
            setFetchError(message);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        if (!isAuthenticated) return;
        void refreshRooms();
    }, [isAuthenticated, refreshRooms]);

    useEffect(() => {
        if (!isAuthenticated) return;
        const interval = setInterval(() => {
            void refreshRooms();
        }, 5000);

        return () => clearInterval(interval);
    }, [isAuthenticated, refreshRooms]);

    const toggleRoom = useCallback((roomId: string) => {
        setExpandedRooms((previous) => {
            const next = new Set(previous);
            if (next.has(roomId)) {
                next.delete(roomId);
            } else {
                next.add(roomId);
            }
            return next;
        });
    }, []);

    const handleKick = useCallback(async (roomId: string, masterId: string, playerId: string) => {
        setActionLoading(`${roomId}:${playerId}`);
        setFetchError(null);
        try {
            const response = await fetch(`${API_URL}/rooms/${roomId}/kick`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({masterId, playerId}),
            });

            if (!response.ok) {
                throw new Error("Impossible d'exclure le joueur.");
            }

            await refreshRooms();
        } catch (error) {
            const message = (error as Error).message || "Erreur inconnue";
            setFetchError(message);
        } finally {
            setActionLoading(null);
        }
    }, [refreshRooms]);

    const handleCloseRoom = useCallback(async (roomId: string) => {
        setActionLoading(`close:${roomId}`);
        setFetchError(null);
        try {
            const response = await fetch(`${API_URL}/rooms/${roomId}`, {
                method: "DELETE",
            });

            if (!response.ok) {
                throw new Error("Impossible de fermer la room.");
            }

            await refreshRooms();
        } catch (error) {
            const message = (error as Error).message || "Erreur inconnue";
            setFetchError(message);
        } finally {
            setActionLoading(null);
        }
    }, [refreshRooms]);

    function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setAuthError(null);

        if (!passwordConfigured) {
            setAuthError("Aucun mot de passe configuré (VITE_ADMIN_PASSWORD).");
            return;
        }

        if (inputPassword.trim() !== ADMIN_PASSWORD) {
            setAuthError("Mot de passe incorrect.");
            return;
        }

        setIsAuthenticated(true);
    }

    return (
        <div className="admin-page">
            <div className="admin-panel">
                <div className="admin-header">
                    <img src="/logo.png" alt="JokR" className="admin-logo"/>
                    <div>
                        <p className="admin-title">Espace administrateur</p>
                        <p className="admin-subtitle">Visualisez les salons en ligne en temps réel.</p>
                    </div>
                </div>

                {!isAuthenticated ? (
                    <form className="admin-form" onSubmit={handleSubmit}>
                        <label className="admin-label">
                            Mot de passe admin
                            <input
                                type="password"
                                value={inputPassword}
                                onChange={(event) => setInputPassword(event.target.value)}
                                className="admin-input"
                                placeholder="••••••"
                            />
                        </label>
                        {authError && <p className="admin-error">{authError}</p>}
                        {!passwordConfigured && (
                            <p className="admin-warning">
                                Définissez la variable VITE_ADMIN_PASSWORD dans votre fichier .env.
                            </p>
                        )}
                        <button type="submit" className="admin-button" disabled={!passwordConfigured}>
                            Accéder au panneau
                        </button>
                    </form>
                ) : (
                    <div className="admin-content">
                        <div className="admin-toolbar">
                            <button type="button" className="admin-button" onClick={() => void refreshRooms()} disabled={isLoading}>
                                {isLoading ? "Actualisation..." : "Actualiser la liste"}
                            </button>
                            {lastUpdated && (
                                <span className="admin-updated">
                                    Dernière mise à jour : il y a {formatElapsedSeconds(lastUpdated)}
                                </span>
                            )}
                        </div>

                        {fetchError && <p className="admin-error">{fetchError}</p>}

                        <div className="rooms-grid">
                            {rooms.length === 0 ? (
                                <p className="admin-empty">Aucune room en ligne pour le moment.</p>
                            ) : (
                                rooms.map((room) => (
                                    <article key={room.id} className="room-card">
                                        <header className="room-card__header">
                                            <div className="room-card__title">
                                                <div>
                                                    <p className="room-id">Salon #{room.id}</p>
                                                    <p className="room-game">Jeu : {room.gameId}</p>
                                                </div>
                                                <p className="room-summary">{room.players.length} / {room.maxPlayers} joueurs</p>
                                            </div>
                                            <div className="room-card__actions">
                                                <p className="room-created">Créé depuis {formatElapsedSeconds(room.createdAt)}</p>
                                                <div className="room-actions__buttons">
                                                    <button
                                                        type="button"
                                                        className="admin-button admin-button--ghost"
                                                        onClick={() => toggleRoom(room.id)}
                                                    >
                                                        {expandedRooms.has(room.id) ? "Masquer" : "Afficher"} les détails
                                                    </button>
                                                    <button
                                                        type="button"
                                                        className="admin-button admin-button--danger"
                                                        disabled={actionLoading === `close:${room.id}`}
                                                        onClick={() => void handleCloseRoom(room.id)}
                                                    >
                                                        {actionLoading === `close:${room.id}` ? "Fermeture..." : "Fermer la room"}
                                                    </button>
                                                </div>
                                            </div>
                                        </header>
                                        {expandedRooms.has(room.id) && (
                                            <div className="room-card__body">
                                                <p className="room-meta">
                                                    Maître du jeu : <span className="room-highlight">{room.masterId}</span>
                                                </p>
                                                <p className="room-meta">
                                                    Joueurs connectés : {room.players.length} / {room.maxPlayers}
                                                </p>
                                                <ul className="room-players">
                                                    {room.players.map((player) => (
                                                        <li key={player.id} className="room-player">
                                                            <div className="room-player__info">
                                                                <span className="room-player__name">{player.username}</span>
                                                                <span className="room-player__id">({player.id})</span>
                                                                <span className="room-player__timer">Connecté depuis {formatElapsedSeconds(player.joinedAt)}</span>
                                                            </div>
                                                            <button
                                                                type="button"
                                                                className="admin-button admin-button--ghost"
                                                                disabled={player.id === room.masterId || actionLoading === `${room.id}:${player.id}`}
                                                                onClick={() => void handleKick(room.id, room.masterId, player.id)}
                                                            >
                                                                {player.id === room.masterId ? "Maître" : actionLoading === `${room.id}:${player.id}` ? "Exclusion..." : "Kick"}
                                                            </button>
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>
                                        )}
                                    </article>
                                ))
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
