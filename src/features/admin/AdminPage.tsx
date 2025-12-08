import {type FormEvent, useCallback, useEffect, useMemo, useState} from "react";
import {API_URL} from "../../config/api";
import type {Room} from "../rooms/types";
import "./AdminPage.css";

const ADMIN_PASSWORD = import.meta.env.VITE_ADMIN_PASSWORD;

interface ListRoomsResponse {
    rooms: Room[];
}

function formatDate(dateString: string) {
    const date = new Date(dateString);
    return date.toLocaleString();
}

export function AdminPage() {
    const [inputPassword, setInputPassword] = useState("");
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [authError, setAuthError] = useState<string | null>(null);
    const [rooms, setRooms] = useState<Room[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [fetchError, setFetchError] = useState<string | null>(null);
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

    const passwordConfigured = useMemo(() => Boolean(ADMIN_PASSWORD), []);

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
                                    Dernière mise à jour : {lastUpdated.toLocaleTimeString()}
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
                                            <div>
                                                <p className="room-id">Salon #{room.id}</p>
                                                <p className="room-game">Jeu : {room.gameId}</p>
                                            </div>
                                            <p className="room-created">Créé le {formatDate(room.createdAt)}</p>
                                        </header>
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
                                                        <span className="room-player__name">{player.username}</span>
                                                        <span className="room-player__id">({player.id})</span>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
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
