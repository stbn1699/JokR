import {type FormEvent, useState} from "react";
import "./JoinRoomCard.css";

type JoinRoomCardProps = {
    onJoin: (roomId: string) => Promise<void> | void;
    isJoining: boolean;
    onMissingRoomId: (message: string) => void;
};

export function JoinRoomCard({onJoin, isJoining, onMissingRoomId}: JoinRoomCardProps) {
    const [roomId, setRoomId] = useState("");

    const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const trimmed = roomId.trim();

        if (!trimmed) {
            onMissingRoomId("Merci d'indiquer l'identifiant du salon.");
            return;
        }

        await onJoin(trimmed);
    };

    return (
        <div className="join-room-card">
            <div>
                <h3 className="join-room-title">Rejoindre un salon existant</h3>
                <p className="join-room-description">
                    Entre le code du salon pour t'y connecter et voir les autres joueurs.
                </p>
            </div>
            <form className="join-room-form" onSubmit={handleSubmit}>
                <label className="join-room-label" htmlFor="join-room-id">
                    Identifiant du salon
                </label>
                <div className="join-room-row">
                    <input
                        id="join-room-id"
                        className="join-room-input"
                        value={roomId}
                        onChange={(event) => setRoomId(event.target.value)}
                        placeholder="Ex. a3f29b1c"
                        maxLength={16}
                    />
                    <button className="join-room-button" type="submit" disabled={isJoining}>
                        {isJoining ? "Connexion…" : "Rejoindre"}
                    </button>
                </div>
            </form>
        </div>
    );
}
