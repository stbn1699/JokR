import {type FormEvent, type MutableRefObject} from "react";
import {statusLabel, MAX_PLAYERS} from "../room/constants";
import type {ChatMessage, RoomPlayer, RoomSnapshot} from "../room/types";
import {formatTimestamp} from "../utils/datetime";

export type LobbyPageProps = {
    room: RoomSnapshot;
    selfId: string | null;
    localPlayer: RoomPlayer | null;
    playersReady: number;
    playerName: string;
    roomCode: string;
    onBackToHome: () => void;
    onCopyLink: () => void;
    onShareLink: () => void;
    onStartGame: () => void;
    onToggleReady: () => void;
    onInvite: () => void;
    messages: ChatMessage[];
    chatEndRef: MutableRefObject<HTMLDivElement | null>;
    onSendMessage: (event: FormEvent<HTMLFormElement>) => void;
    messageDraft: string;
    onMessageDraftChange: (value: string) => void;
    feedback: string | null;
    shareError: string | null;
    roomError: string | null;
    socketConnected: boolean;
    hasJoinedRoom: boolean;
    isNameModalOpen: boolean;
    nameDraft: string;
    onNameDraftChange: (value: string) => void;
    onCloseNameModal: () => void;
    onSubmitName: (event: FormEvent<HTMLFormElement>) => void;
};

export function LobbyPage({
    room,
    selfId,
    localPlayer,
    playersReady,
    playerName,
    roomCode,
    onBackToHome,
    onCopyLink,
    onShareLink,
    onStartGame,
    onToggleReady,
    onInvite,
    messages,
    chatEndRef,
    onSendMessage,
    messageDraft,
    onMessageDraftChange,
    feedback,
    shareError,
    roomError,
    socketConnected,
    hasJoinedRoom,
    isNameModalOpen,
    nameDraft,
    onNameDraftChange,
    onCloseNameModal,
    onSubmitName,
}: LobbyPageProps) {
    const players = room.players;
    const totalPlayers = players.length;
    const isGameStarted = room.status === "started";
    const isHost = room.hostId === selfId;
    const isRoomFull = totalPlayers >= MAX_PLAYERS;
    const canStartGame = isHost && !isGameStarted && totalPlayers === MAX_PLAYERS && playersReady === totalPlayers;
    const localPlayerName = localPlayer?.name ?? playerName;

    return (
        <>
            <div className="top-bar">
                <button className="ghost back-button" type="button" onClick={onBackToHome}>
                    ← Retour à l'accueil
                </button>
                {localPlayerName && <span className="player-identity">Vous jouez en tant que {localPlayerName}</span>}
            </div>
            <header className="room-header">
                <div className="room-info">
                    <p className="room-code">Salon #{roomCode}</p>
                    <h1>Salon Morpion</h1>
                    <p className="room-status">
                        {isGameStarted
                            ? "La partie de Morpion est en cours."
                            : `${playersReady}/${MAX_PLAYERS} joueurs sont prêts. Attendez que chacun confirme pour lancer le Morpion.`}
                    </p>
                </div>
                <div className="room-actions">
                    <button className="ghost" type="button" onClick={onCopyLink} disabled={isRoomFull || isGameStarted}>
                        Copier le lien
                    </button>
                    <button className="secondary" type="button" onClick={onShareLink} disabled={isRoomFull || isGameStarted}>
                        Inviter des joueurs
                    </button>
                    {isHost && (
                        <button className="primary" type="button" onClick={onStartGame} disabled={!canStartGame}>
                            {isGameStarted ? "Partie lancée" : "Lancer le Morpion"}
                        </button>
                    )}
                </div>
            </header>

            {(feedback || shareError || roomError || (!socketConnected && hasJoinedRoom)) && (
                <div className="feedback-area">
                    {feedback && <div className="feedback success">{feedback}</div>}
                    {shareError && <div className="feedback warning">{shareError}</div>}
                    {roomError && <div className="feedback error">{roomError}</div>}
                    {!socketConnected && hasJoinedRoom && <div className="feedback warning">Reconnexion au salon…</div>}
                </div>
            )}

            <main className="room-main">
                <aside className="player-panel">
                    <div className="panel-header">
                        <h2>Joueurs</h2>
                        <span className="player-count">
                            {totalPlayers}/{MAX_PLAYERS}
                        </span>
                    </div>
                    <div className="player-list">
                        {players.length === 0 ? (
                            <div className="player-card empty">En attente de joueurs…</div>
                        ) : (
                            players.map((player) => {
                                const isYou = player.id === selfId;
                                const isHostPlayer = player.id === room.hostId;

                                return (
                                    <article key={player.id} className="player-card">
                                        <div className="player-avatar" style={{backgroundColor: player.avatarColor}}>
                                            {player.name.slice(0, 1).toUpperCase()}
                                        </div>
                                        <div className="player-details">
                                            <div className="player-name-row">
                                                <span className="player-name">{player.name}</span>
                                                {!isYou && (
                                                    <span className={`player-status ${player.status}`}>
                                                        {statusLabel[player.status]}
                                                    </span>
                                                )}
                                            </div>
                                            {isYou && <span className="player-tag">Vous</span>}
                                            {isHostPlayer && <span className="player-tag host">Organisateur</span>}
                                        </div>
                                        {isYou && (
                                            <button
                                                className="ghost"
                                                type="button"
                                                onClick={onToggleReady}
                                                disabled={isGameStarted}
                                            >
                                                {isGameStarted
                                                    ? "Partie lancée"
                                                    : player.status === "ready"
                                                      ? "Annuler prêt"
                                                      : "Prêt ?"}
                                            </button>
                                        )}
                                    </article>
                                );
                            })
                        )}
                    </div>
                    <div className="invite-card">
                        <p>
                            {isRoomFull
                                ? "Salon complet : le duel peut commencer."
                                : "Invitez votre adversaire à rejoindre la partie."}
                        </p>
                        <button className="ghost" type="button" onClick={onInvite} disabled={isRoomFull || isGameStarted}>
                            Inviter manuellement
                        </button>
                    </div>
                </aside>

                <section className="chat-panel">
                    <div className="chat-header">
                        <h2>Chat du salon</h2>
                        <p>Organisez-vous avant de lancer la partie.</p>
                    </div>
                    <div className="chat-messages">
                        {messages.map((message) => (
                            <div
                                key={message.id}
                                className={`chat-message ${
                                    message.type === "system"
                                        ? "system"
                                        : message.author === localPlayer?.name
                                          ? "self"
                                          : ""
                                }`}
                            >
                                <div className="chat-meta">
                                    <span className="chat-author">{message.author}</span>
                                    <span className="chat-time">{formatTimestamp(message.timestamp)}</span>
                                </div>
                                <p className="chat-body">{message.body}</p>
                            </div>
                        ))}
                        <div ref={chatEndRef} />
                    </div>
                    <form className="chat-form" onSubmit={onSendMessage}>
                        <input
                            type="text"
                            name="message"
                            aria-label="Votre message"
                            placeholder="Écrire un message..."
                            value={messageDraft}
                            onChange={(event) => onMessageDraftChange(event.target.value)}
                            autoComplete="off"
                            disabled={!localPlayer}
                        />
                        <button className="primary" type="submit" disabled={!localPlayer}>
                            Envoyer
                        </button>
                    </form>
                </section>
            </main>

            {isNameModalOpen && (
                <div className="modal-backdrop" role="dialog" aria-modal="true">
                    <form className="modal" onSubmit={onSubmitName}>
                        <h2>Choisissez votre nom</h2>
                        <p>Avant d’ouvrir le salon, indiquez le pseudo que vos amis verront.</p>
                        <input
                            type="text"
                            name="playerName"
                            placeholder="Votre pseudo"
                            value={nameDraft}
                            onChange={(event) => onNameDraftChange(event.target.value)}
                            autoFocus
                        />
                        <div className="modal-actions">
                            <button className="ghost" type="button" onClick={onCloseNameModal}>
                                Annuler
                            </button>
                            <button className="primary" type="submit">
                                Continuer
                            </button>
                        </div>
                    </form>
                </div>
            )}
        </>
    );
}
