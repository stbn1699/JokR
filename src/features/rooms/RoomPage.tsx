import {useEffect, useRef} from "react";
import {Navigate, useParams} from "react-router-dom";
import {AlertBanner} from "../../components/AlertBanner/AlertBanner";
import {RoomView} from "./RoomView";
import type {useRoomSession} from "./hooks/useRoomSession";
import "./RoomPage.css";

type RoomSession = ReturnType<typeof useRoomSession>;

type RoomPageProps = {
    session: RoomSession;
    onLeave: () => void;
};

export function RoomPage({session, onLeave}: RoomPageProps) {
    const {roomId} = useParams();
    const hasAttemptedJoin = useRef(false);
    const {activeRoom, activePlayer, error, joinRoom, closeRoom, kickPlayer, setError} = session;

    useEffect(() => {
        setError(null);
        return () => setError(null);
    }, [setError]);

    useEffect(() => {
        hasAttemptedJoin.current = false;
    }, [roomId]);

    useEffect(() => {
        if (!roomId || hasAttemptedJoin.current) return;
        if (activeRoom && activeRoom.id === roomId) return;

        hasAttemptedJoin.current = true;
        void joinRoom(roomId);
    }, [roomId, activeRoom, joinRoom]);

    if (!roomId) {
        return <Navigate to="/" replace/>;
    }

    const handleLeave = () => {
        closeRoom();
        onLeave();
    };

    const isCurrentRoom = activeRoom?.id === roomId;

    return (
        <section className="room-page">
            {error && <AlertBanner tone="error">Erreur : {error}</AlertBanner>}
            {isCurrentRoom && activeRoom ? (
                <RoomView
                    room={activeRoom}
                    onClose={handleLeave}
                    fullPage
                    currentPlayerId={activePlayer?.id}
                    onKickPlayer={kickPlayer}
                />
            ) : (
                <div className="room-waiting">
                    <div>{error ? "Impossible de rejoindre ce salon." : "Connexion au salon…"}</div>
                    <button className="room-back-button" type="button" onClick={handleLeave}>
                        Retour à l'accueil
                    </button>
                </div>
            )}
        </section>
    );
}
