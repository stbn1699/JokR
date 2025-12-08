import {type FormEvent, useState} from "react";
import {GAMES} from "../../config/games";
import {RoomView} from "../rooms/RoomView";
import {useRoomSession} from "../rooms/hooks/useRoomSession";
import {formatPlayerNumbers} from "./utils";
import "./GamesList.css";

interface GamesListProps {
    username: string;
}

export function GamesList({username}: GamesListProps) {
    const [joinRoomId, setJoinRoomId] = useState("");
    const {
        activeRoom,
        activePlayer,
        error,
        creatingGameId,
        isJoiningRoom,
        createRoom,
        joinRoom,
        closeRoom,
        kickPlayer,
        setError,
    } = useRoomSession(username);

    const handleJoinRoom = async (event: FormEvent) => {
        event.preventDefault();
        const trimmedRoomId = joinRoomId.trim();

        if (!trimmedRoomId) {
            setError("Merci d'indiquer l'identifiant du salon.");
            return;
        }

        await joinRoom(trimmedRoomId);
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
                    onClose={closeRoom}
                    fullPage
                    currentPlayerId={activePlayer?.id}
                    onKickPlayer={kickPlayer}
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
                        onClick={() => createRoom(game)}
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
