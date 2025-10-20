import {FormEvent, useEffect, useRef, useState} from "react";
import "./App.css";

type PlayerStatus = "host" | "ready" | "waiting";

type Player = {
    id: number;
    name: string;
    status: PlayerStatus;
    avatarColor: string;
    isYou?: boolean;
};

type ChatMessage = {
    id: number;
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

const MAX_PLAYERS = 8;
const STORAGE_KEY = "jokr:playerName";
const DEFAULT_LOCAL_NAME = "Camille";

const statusLabel: Record<PlayerStatus, string> = {
    host: "Hôte",
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

const buildDefaultPlayers = (localName: string): Player[] => [
    {id: 1, name: localName, status: "host", avatarColor: "#6366f1", isYou: true},
    {id: 2, name: "Julien", status: "ready", avatarColor: "#f97316"},
    {id: 3, name: "Sofia", status: "waiting", avatarColor: "#22d3ee"},
    {id: 4, name: "Liam", status: "waiting", avatarColor: "#84cc16"},
];

const buildDefaultMessages = (localName: string): ChatMessage[] => [
    {
        id: 1,
        author: "Système",
        body: "Bienvenue dans le salon ! Invitez vos amis et lancez la partie lorsque tout le monde est prêt.",
        timestamp: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
        type: "system",
    },
    {
        id: 2,
        author: "Julien",
        body: "Salut tout le monde !",
        timestamp: new Date(Date.now() - 1000 * 60 * 4).toISOString(),
    },
    {
        id: 3,
        author: localName,
        body: "On attend plus que Sofia et Liam avant de lancer la partie.",
        timestamp: new Date(Date.now() - 1000 * 60 * 2).toISOString(),
    },
];

export default function App() {
    const storedName = typeof window !== "undefined" ? window.localStorage.getItem(STORAGE_KEY) ?? "" : "";
    const sanitizedStoredName = storedName.trim();
    const [playerName, setPlayerName] = useState<string>(sanitizedStoredName);
    const initialLocalName = sanitizedStoredName || DEFAULT_LOCAL_NAME;

    const [players, setPlayers] = useState<Player[]>(() => buildDefaultPlayers(initialLocalName));
    const [messages, setMessages] = useState<ChatMessage[]>(() => buildDefaultMessages(initialLocalName));
    const [messageDraft, setMessageDraft] = useState("Je suis prêt !");
    const [feedback, setFeedback] = useState<string | null>(null);
    const [shareError, setShareError] = useState<string | null>(null);
    const [roomLink, setRoomLink] = useState("");

    const [selectedGame, setSelectedGame] = useState<Game | null>(null);
    const [pendingGame, setPendingGame] = useState<Game | null>(null);
    const [isNameModalOpen, setIsNameModalOpen] = useState(false);
    const [nameDraft, setNameDraft] = useState("");

    const previousLocalNameRef = useRef(initialLocalName);
    const isLobbyVisible = Boolean(selectedGame);

    const localPlayer = players.find((player) => player.isYou);

    useEffect(() => {
        if (typeof window === "undefined") {
            return;
        }

        const existingName = window.localStorage.getItem(STORAGE_KEY)?.trim();
        if (existingName) {
            setPlayerName((current) => (current ? current : existingName));
        }
    }, []);

    useEffect(() => {
        if (typeof window === "undefined") {
            return;
        }

        setRoomLink(window.location.href);
    }, []);

    useEffect(() => {
        if (!feedback) {
            return;
        }

        const timeout = window.setTimeout(() => setFeedback(null), 3000);
        return () => window.clearTimeout(timeout);
    }, [feedback]);

    useEffect(() => {
        if (!playerName) {
            if (typeof window !== "undefined") {
                window.localStorage.removeItem(STORAGE_KEY);
            }
            return;
        }

        window.localStorage.setItem(STORAGE_KEY, playerName);
    }, [playerName]);

    useEffect(() => {
        if (!playerName) {
            return;
        }

        setPlayers((current) =>
            current.map((player) => (player.isYou ? {...player, name: playerName} : player))
        );

        setMessages((current) =>
            current.map((message) =>
                message.author === previousLocalNameRef.current ? {...message, author: playerName} : message
            )
        );

        previousLocalNameRef.current = playerName;
    }, [playerName]);

    const handleToggleReady = () => {
        if (!localPlayer) {
            return;
        }

        setPlayers((current) =>
            current.map((player) =>
                player.id === localPlayer.id
                    ? {
                          ...player,
                          status: player.status === "ready" ? "waiting" : "ready",
                      }
                    : player
            )
        );
    };

    const handleCopyLink = async () => {
        try {
            const linkToCopy = roomLink || (typeof window !== "undefined" ? window.location.href : "");
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

        if (navigator.share) {
            try {
                await navigator.share({
                    title: shareTitle,
                    text: shareText,
                    url: roomLink || (typeof window !== "undefined" ? window.location.href : undefined),
                });
                setFeedback("Invitation envoyée");
                setShareError(null);
            } catch (error) {
                if ((error as Error)?.name !== "AbortError") {
                    console.error(error);
                    setShareError("Le partage a échoué. Vous pouvez copier le lien à la place.");
                }
            }
        } else {
            await handleCopyLink();
            setShareError("Votre navigateur ne gère pas le partage automatique. Le lien a été copié.");
        }
    };

    const handleSendMessage = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        const trimmed = messageDraft.trim();
        if (!trimmed) {
            return;
        }

        const author = localPlayer?.name ?? "Vous";

        setMessages((current) => [
            ...current,
            {
                id: current.length + 1,
                author,
                body: trimmed,
                timestamp: new Date().toISOString(),
            },
        ]);
        setMessageDraft("");
    };

    const handleInvitePlaceholder = () => {
        setFeedback("Fonctionnalité d'invitation à venir.");
    };

    const playersReady = players.filter((player) => player.status === "ready").length;

    const handleSelectGame = (game: Game) => {
        if (playerName) {
            setSelectedGame(game);
            return;
        }

        setPendingGame(game);
        setNameDraft((current) => current || "");
        setIsNameModalOpen(true);
    };

    const handleCloseNameModal = () => {
        setIsNameModalOpen(false);
        setPendingGame(null);
    };

    const handleSubmitName = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        const trimmed = nameDraft.trim();
        if (!trimmed) {
            return;
        }

        setNameDraft(trimmed);
        setPlayerName(trimmed);
        setIsNameModalOpen(false);

        if (pendingGame) {
            setSelectedGame(pendingGame);
        }

        setPendingGame(null);
    };

    const handleBackToHome = () => {
        setSelectedGame(null);
        setPendingGame(null);
        setFeedback(null);
        setShareError(null);
    };

    return (
        <div className={`app-shell ${isLobbyVisible ? "lobby-view" : "home-view"}`}>
            <div className={`app-container ${isLobbyVisible ? "lobby" : "home"}`}>
                {isLobbyVisible ? (
                    <>
                        <div className="top-bar">
                            <button className="ghost back-button" type="button" onClick={handleBackToHome}>
                                ← Choisir un autre jeu
                            </button>
                            {playerName && <span className="player-identity">Vous jouez en tant que {playerName}</span>}
                        </div>
                        <header className="room-header">
                            <div className="room-info">
                                <p className="room-code">Salon {selectedGame?.label}</p>
                                <h1>Salon d'attente</h1>
                                <p className="room-status">
                                    {playersReady}/{players.length} joueurs sont prêts. Préparez votre partie de {" "}
                                    {selectedGame?.label} !
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

                        {(feedback || shareError) && (
                            <div className="feedback-area">
                                {feedback && <div className="feedback success">{feedback}</div>}
                                {shareError && <div className="feedback warning">{shareError}</div>}
                            </div>
                        )}

                        <main className="room-main">
                            <aside className="player-panel">
                                <div className="panel-header">
                                    <h2>Joueurs</h2>
                                    <span className="player-count">
                                        {players.length}/{MAX_PLAYERS}
                                    </span>
                                </div>
                                <div className="player-list">
                                    {players.map((player) => (
                                        <article key={player.id} className="player-card">
                                            <div className="player-avatar" style={{backgroundColor: player.avatarColor}}>
                                                {player.name.slice(0, 1)}
                                            </div>
                                            <div className="player-details">
                                                <div className="player-name-row">
                                                    <span className="player-name">{player.name}</span>
                                                    <span className={`player-status ${player.status}`}>
                                                        {statusLabel[player.status]}
                                                    </span>
                                                </div>
                                                {player.isYou && <span className="player-tag">Vous</span>}
                                                {player.status === "host" && <span className="player-tag">Organisateur</span>}
                                            </div>
                                            {player.isYou && (
                                                <button className="ghost" type="button" onClick={handleToggleReady}>
                                                    {player.status === "ready" ? "Annuler prêt" : "Prêt ?"}
                                                </button>
                                            )}
                                        </article>
                                    ))}
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
                                    />
                                    <button className="primary" type="submit">
                                        Envoyer
                                    </button>
                                </form>
                            </section>
                        </main>
                    </>
                ) : (
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
                )}
            </div>

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
        </div>
    );
}
