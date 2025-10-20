import {type FormEvent, useEffect, useMemo, useRef, useState} from "react";
import {io, Socket} from "socket.io-client";
import "./App.css";

type PlayerStatus = "ready" | "waiting";

type RoomPlayer = {
    id: string;
    name: string;
    status: PlayerStatus;
    avatarColor: string;
    joinedAt: number;
};

type RoomSnapshot = {
    id: string;
    gameId: string | null;
    hostId: string | null;
    players: RoomPlayer[];
};

type ChatMessage = {
    id: string;
    author: string;
    body: string;
    timestamp: string;
    type?: "system";
};

type Game = {
    id: string;
    label: string;
    description: string;
};

type RoomInitPayload = {
    selfId: string;
    room: RoomSnapshot;
    messages: ChatMessage[];
};

type Route = {name: "home"} | {name: "room"; roomId: string; search: string};

type HomeViewProps = {
    onSelectGame: (gameId: string | null) => void;
};

type RoomViewProps = {
    roomId: string;
    search: string;
    onBackToHome: () => void;
};

const MAX_PLAYERS = 8;
const STORAGE_KEY = "jokr:playerName";
const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3001";

const statusLabel: Record<PlayerStatus, string> = {
    ready: "Prêt",
    waiting: "En attente",
};

const games: Game[] = [
    {
        id: "morpion",
        label: "Morpion",
        description: "Affrontez vos amis sur la grille 3×3 classique.",
    },
    {
        id: "poker",
        label: "Poker JokR",
        description: "Une variante rapide pour des parties dynamiques à plusieurs.",
    },
    {
        id: "bluff",
        label: "Jeu du Bluff",
        description: "Misez sur votre intuition pour démasquer les menteurs.",
    },
    {
        id: "uno",
        label: "Uno JokR",
        description: "Défaussez vos cartes avant tout le monde et piégez vos amis.",
    },
];

const formatTimestamp = (timestamp: string) =>
    new Date(timestamp).toLocaleTimeString("fr-FR", {
        hour: "2-digit",
        minute: "2-digit",
    });

const generateRoomId = () => {
    if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
        return crypto.randomUUID().split("-")[0].toUpperCase();
    }

    return Math.random().toString(36).slice(2, 10).toUpperCase();
};

const readRouteFromLocation = (): Route => {
    if (typeof window === "undefined") {
        return {name: "home"};
    }

    const {pathname, search} = window.location;
    if (pathname.startsWith("/rooms/")) {
        const [, , rawId] = pathname.split("/");
        const roomId = decodeURIComponent(rawId ?? "").trim();
        if (roomId) {
            return {name: "room", roomId, search};
        }
    }

    return {name: "home"};
};

const buildRoomPath = (roomId: string, search: string) => `/rooms/${roomId}${search}`;

export default function App() {
    const [route, setRoute] = useState<Route>(() => readRouteFromLocation());

    useEffect(() => {
        if (typeof window === "undefined") {
            return;
        }

        const handlePopState = () => {
            setRoute(readRouteFromLocation());
        };

        window.addEventListener("popstate", handlePopState);
        return () => window.removeEventListener("popstate", handlePopState);
    }, []);

    const navigateTo = (target: Route) => {
        if (typeof window === "undefined") {
            setRoute(target);
            return;
        }

        const targetPath = target.name === "home" ? "/" : buildRoomPath(target.roomId, target.search);
        const currentPath = `${window.location.pathname}${window.location.search}`;

        if (targetPath !== currentPath) {
            window.history.pushState(null, "", targetPath);
        }

        setRoute(target);
    };

    const handleSelectGame = (gameId: string | null) => {
        const roomId = generateRoomId();
        const search = gameId ? `?game=${encodeURIComponent(gameId)}` : "";
        navigateTo({name: "room", roomId, search});
    };

    const handleBackToHome = () => {
        navigateTo({name: "home"});
    };

    const isLobby = route.name === "room";

    return (
        <div className={`app-shell ${isLobby ? "lobby-view" : "home-view"}`}>
            <div className={`app-container ${isLobby ? "lobby" : "home"}`}>
                {route.name === "home" ? (
                    <HomeView onSelectGame={handleSelectGame} />
                ) : (
                    <RoomView roomId={route.roomId} search={route.search} onBackToHome={handleBackToHome} />
                )}
            </div>
        </div>
    );
}

function HomeView({onSelectGame}: HomeViewProps) {
    const handleSelectGame = (game: Game) => {
        onSelectGame(game.id);
    };

    return (
        <>
            <header className="home-header">
                <h1>Choisissez un jeu JokR</h1>
                <p>Sélectionnez un mode de jeu pour créer un salon et inviter vos amis.</p>
            </header>
            <div className="game-grid">
                {games.map((game) => (
                    <button key={game.id} className="game-card" type="button" onClick={() => handleSelectGame(game)}>
                        <span className="game-title">{game.label}</span>
                        <span className="game-description">{game.description}</span>
                    </button>
                ))}
            </div>
        </>
    );
}

function RoomView({roomId, search, onBackToHome}: RoomViewProps) {
    const normalizedRoomId = roomId.trim();
    const queryGameId = useMemo(() => {
        try {
            return new URLSearchParams(search).get("game") ?? undefined;
        } catch {
            return undefined;
        }
    }, [search]);

    const initialStoredName =
        typeof window !== "undefined" ? window.localStorage.getItem(STORAGE_KEY)?.trim() ?? "" : "";
    const initialLink = typeof window !== "undefined" ? window.location.href : "";

    const [playerName, setPlayerName] = useState(initialStoredName);
    const [nameDraft, setNameDraft] = useState(initialStoredName);
    const [isNameModalOpen, setIsNameModalOpen] = useState(!initialStoredName);
    const [room, setRoom] = useState<RoomSnapshot>({
        id: normalizedRoomId,
        gameId: queryGameId ?? null,
        hostId: null,
        players: [],
    });
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [selfId, setSelfId] = useState<string | null>(null);
    const [messageDraft, setMessageDraft] = useState("Je suis prêt !");
    const [feedback, setFeedback] = useState<string | null>(null);
    const [shareError, setShareError] = useState<string | null>(null);
    const [roomError, setRoomError] = useState<string | null>(null);
    const [roomLink, setRoomLink] = useState(initialLink);
    const [socketConnected, setSocketConnected] = useState(false);
    const [hasJoinedRoom, setHasJoinedRoom] = useState(false);

    const socketRef = useRef<Socket | null>(null);
    const hasJoinedRef = useRef(false);
    const chatEndRef = useRef<HTMLDivElement | null>(null);

    const selectedGame = useMemo(() => {
        const resolvedGameId = room.gameId ?? queryGameId ?? null;
        if (!resolvedGameId) {
            return null;
        }

        return games.find((game) => game.id === resolvedGameId) ?? null;
    }, [room.gameId, queryGameId]);

    const playersReady = useMemo(
        () => room.players.filter((player) => player.status === "ready").length,
        [room.players]
    );

    const localPlayer = useMemo(
        () => room.players.find((player) => player.id === selfId) ?? null,
        [room.players, selfId]
    );

    useEffect(() => {
        if (typeof window === "undefined") {
            return;
        }

        setRoomLink(window.location.href);
    }, [normalizedRoomId, search]);

    useEffect(() => {
        if (!feedback) {
            return;
        }

        const timeout = window.setTimeout(() => setFeedback(null), 3000);
        return () => window.clearTimeout(timeout);
    }, [feedback]);

    useEffect(() => {
        chatEndRef.current?.scrollIntoView({behavior: "smooth"});
    }, [messages]);

    useEffect(() => {
        if (typeof window === "undefined") {
            return;
        }

        if (playerName) {
            window.localStorage.setItem(STORAGE_KEY, playerName);
        } else {
            window.localStorage.removeItem(STORAGE_KEY);
        }
    }, [playerName]);

    useEffect(() => {
        if (!playerName) {
            setIsNameModalOpen(true);
            setNameDraft("");
        }
    }, [playerName]);

    useEffect(() => {
        if (localPlayer && localPlayer.name !== playerName) {
            setPlayerName(localPlayer.name);
        }
    }, [localPlayer, playerName]);

    useEffect(() => {
        if (!normalizedRoomId) {
            return;
        }

        const socket = io(API_URL, {
            autoConnect: false,
        });

        socketRef.current = socket;

        const handleInit = ({selfId: value, room: snapshot, messages: history}: RoomInitPayload) => {
            setSelfId(value);
            setRoom(snapshot);
            setMessages(history);
            setRoomError(null);
            setHasJoinedRoom(true);
        };

        const handleState = (snapshot: RoomSnapshot) => {
            setRoom(snapshot);
        };

        const handleMessage = (message: ChatMessage) => {
            setMessages((current) => [...current, message]);
        };

        const handleError = (error: {message?: string}) => {
            setRoomError(error.message ?? "Une erreur est survenue.");
        };

        socket.on("connect", () => {
            setSocketConnected(true);
            setRoomError(null);
        });

        socket.on("disconnect", () => {
            setSocketConnected(false);
            hasJoinedRef.current = false;
        });

        socket.on("room:init", handleInit);
        socket.on("room:state", handleState);
        socket.on("room:message", handleMessage);
        socket.on("room:error", handleError);
        socket.on("connect_error", (error) => {
            console.error(error);
            setRoomError("Connexion au salon impossible. Réessayez dans un instant.");
        });

        socket.connect();

        return () => {
            socket.emit("room:leave");
            socket.off("connect");
            socket.off("disconnect");
            socket.off("room:init", handleInit);
            socket.off("room:state", handleState);
            socket.off("room:message", handleMessage);
            socket.off("room:error", handleError);
            socket.off("connect_error");
            socket.disconnect();
            socketRef.current = null;
            hasJoinedRef.current = false;
        };
    }, [normalizedRoomId]);

    useEffect(() => {
        hasJoinedRef.current = false;
    }, [normalizedRoomId]);

    useEffect(() => {
        if (!socketConnected || hasJoinedRef.current) {
            return;
        }

        if (!normalizedRoomId || !playerName) {
            return;
        }

        const socket = socketRef.current;
        if (!socket) {
            return;
        }

        socket.emit("room:join", {
            roomId: normalizedRoomId,
            playerName,
            gameId: queryGameId,
        });
        hasJoinedRef.current = true;
    }, [socketConnected, normalizedRoomId, playerName, queryGameId]);

    const handleToggleReady = () => {
        if (!localPlayer) {
            return;
        }

        socketRef.current?.emit("room:toggleReady");
    };

    const handleCopyLink = async () => {
        try {
            const linkToCopy = roomLink || (typeof window !== "undefined" ? window.location.href : "");
            if (!navigator.clipboard) {
                throw new Error("clipboard unavailable");
            }

            await navigator.clipboard.writeText(linkToCopy);
            setFeedback("Lien du salon copié dans le presse-papier");
            setShareError(null);
        } catch (error) {
            console.error(error);
            setShareError("Impossible de copier le lien. Copiez-le manuellement.");
        }
    };

    const handleShareLink = async () => {
        const shareTitle = selectedGame ? `Rejoindre mon salon ${selectedGame.label}` : "Rejoindre mon salon JokR";
        const shareText = selectedGame
            ? `Rejoins ma partie de ${selectedGame.label} sur JokR !`
            : "Rejoins ma partie sur JokR !";
        const linkToShare = roomLink || (typeof window !== "undefined" ? window.location.href : "");

        if (navigator.share) {
            try {
                await navigator.share({
                    title: shareTitle,
                    text: shareText,
                    url: linkToShare,
                });
                setFeedback("Invitation envoyée");
                setShareError(null);
            } catch (error) {
                if ((error as Error)?.name !== "AbortError") {
                    console.error(error);
                    setShareError("Le partage a échoué. Vous pouvez copier le lien à la place.");
                }
            }
            return;
        }

        await handleCopyLink();
        setShareError("Votre navigateur ne gère pas le partage automatique. Le lien a été copié.");
    };

    const handleSendMessage = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        const trimmed = messageDraft.trim();
        if (!trimmed) {
            return;
        }

        if (!localPlayer) {
            return;
        }

        socketRef.current?.emit("room:message", {body: trimmed});
        setMessageDraft("");
    };

    const handleInvitePlaceholder = () => {
        setFeedback("Fonctionnalité d'invitation avancée à venir.");
    };

    const handleBackToHome = () => {
        socketRef.current?.emit("room:leave");
        socketRef.current?.disconnect();
        socketRef.current = null;
        setHasJoinedRoom(false);
        onBackToHome();
    };

    const handleCloseNameModal = () => {
        if (!playerName) {
            onBackToHome();
            return;
        }

        setIsNameModalOpen(false);
    };

    const handleSubmitName = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        const trimmed = nameDraft.trim();
        if (!trimmed) {
            return;
        }

        setPlayerName(trimmed);
        setNameDraft(trimmed);
        setIsNameModalOpen(false);
    };

    const players = room.players;
    const totalPlayers = players.length;
    const localPlayerName = localPlayer?.name ?? playerName;
    const displayRoomId = room.id || normalizedRoomId;

    return (
        <>
            <div className="top-bar">
                <button className="ghost back-button" type="button" onClick={handleBackToHome}>
                    ← Choisir un autre jeu
                </button>
                {localPlayerName && (
                    <span className="player-identity">Vous jouez en tant que {localPlayerName}</span>
                )}
            </div>
            <header className="room-header">
                <div className="room-info">
                    <p className="room-code">Salon #{displayRoomId}</p>
                    <h1>Salon d'attente</h1>
                    <p className="room-status">
                        {playersReady}/{totalPlayers} joueurs sont prêts. Préparez votre partie de {" "}
                        {selectedGame?.label ?? "JokR"} !
                    </p>
                </div>
                <div className="room-actions">
                    <button className="secondary" type="button" onClick={handleCopyLink}>
                        Copier le lien
                    </button>
                    <button className="primary" type="button" onClick={handleShareLink}>
                        Inviter des joueurs
                    </button>
                </div>
            </header>

            {(feedback || shareError || roomError || (!socketConnected && hasJoinedRoom)) && (
                <div className="feedback-area">
                    {feedback && <div className="feedback success">{feedback}</div>}
                    {shareError && <div className="feedback warning">{shareError}</div>}
                    {roomError && <div className="feedback error">{roomError}</div>}
                    {!socketConnected && hasJoinedRoom && (
                        <div className="feedback warning">Reconnexion au salon…</div>
                    )}
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
                                const isHost = player.id === room.hostId;

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
                                            {isHost && <span className="player-tag host">Organisateur</span>}
                                        </div>
                                        {isYou && (
                                            <button className="ghost" type="button" onClick={handleToggleReady}>
                                                {player.status === "ready" ? "Annuler prêt" : "Prêt ?"}
                                            </button>
                                        )}
                                    </article>
                                );
                            })
                        )}
                    </div>
                    <div className="invite-card">
                        <p>Besoin de plus de joueurs ?</p>
                        <button className="ghost" type="button" onClick={handleInvitePlaceholder}>
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
                    <form className="chat-form" onSubmit={handleSendMessage}>
                        <input
                            type="text"
                            name="message"
                            aria-label="Votre message"
                            placeholder="Écrire un message..."
                            value={messageDraft}
                            onChange={(event) => setMessageDraft(event.target.value)}
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
                    <form className="modal" onSubmit={handleSubmitName}>
                        <h2>Choisissez votre nom</h2>
                        <p>Avant d’ouvrir le salon, indiquez le pseudo que vos amis verront.</p>
                        <input
                            type="text"
                            name="playerName"
                            placeholder="Votre pseudo"
                            value={nameDraft}
                            onChange={(event) => setNameDraft(event.target.value)}
                            autoFocus
                        />
                        <div className="modal-actions">
                            <button className="ghost" type="button" onClick={handleCloseNameModal}>
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
