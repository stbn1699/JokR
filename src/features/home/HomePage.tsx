import type {useRoomSession} from "../rooms/hooks/useRoomSession";
import {GAMES} from "../../config/games";
import {GamesList} from "../games/GamesList";
import {JoinRoomCard} from "./JoinRoomCard";
import {AlertBanner} from "../../components/AlertBanner/AlertBanner";
import "./HomePage.css";

type RoomSession = ReturnType<typeof useRoomSession>;

type HomePageProps = {
    session: RoomSession;
};

export function HomePage({session}: HomePageProps) {
    const {error, setError, creatingGameId, createRoom, isJoiningRoom, joinRoom} = session;

    const handleCreateRoom = (game: (typeof GAMES)[number]) => {
        setError(null);
        void createRoom(game);
    };

    const handleJoinRoom = async (roomId: string) => {
        setError(null);
        await joinRoom(roomId);
    };

    return (
        <div className="home-page">
            <h2 className="section-title">Choisis un jeu</h2>
            {error && <AlertBanner tone="error">Erreur : {error}</AlertBanner>}
            <JoinRoomCard onJoin={handleJoinRoom} isJoining={isJoiningRoom} onMissingRoomId={setError}/>
            <GamesList games={GAMES} creatingGameId={creatingGameId} onCreate={handleCreateRoom}/>
        </div>
    );
}
