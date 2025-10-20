import {type FormEvent, useCallback, useEffect, useMemo, useRef, useState} from "react";
import {io, type Socket} from "socket.io-client";
import {API_URL} from "../config/api";
import {GAMES} from "../data/games";
import {MAX_PLAYERS} from "../room/constants";
import type {ChatMessage, RoomInitPayload, RoomSnapshot, RoomStatus} from "../room/types";
import {copyTextToClipboard} from "../utils/clipboard";
import {LobbyPage} from "./LobbyPage";
import {MorpionGamePage} from "./MorpionGamePage";

type RoomPageProps = {
    roomId: string;
    search: string;
    onBackToHome: () => void;
};

const STORAGE_KEY = "jokr:playerName";

export function RoomPage({roomId, search, onBackToHome}: RoomPageProps) {
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
        status: "lobby",
        morpion: null,
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
    const previousStatusRef = useRef<RoomStatus>("lobby");
    const syncIntervalRef = useRef<number | null>(null);

    const selectedGame = useMemo(() => {
        const resolvedGameId = room.gameId ?? queryGameId ?? null;
        if (!resolvedGameId) {
            return null;
        }

        return GAMES.find((game) => game.id === resolvedGameId) ?? null;
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
        if (room.status === "started" && previousStatusRef.current !== "started") {
            setFeedback("La partie de Morpion commence !");
        }

        previousStatusRef.current = room.status;
    }, [room.status]);

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

    const performLeave = useCallback(() => {
        const socket = socketRef.current;
        if (socket) {
            if (socket.connected) {
                socket.emit("room:leave");
            }
            socket.disconnect();
        }
        socketRef.current = null;
        hasJoinedRef.current = false;
        setHasJoinedRoom(false);
        onBackToHome();
    }, [onBackToHome]);

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

        const handleMorpionFinished = () => {
            performLeave();
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
        socket.on("morpion:finished", handleMorpionFinished);
        socket.on("connect_error", (error) => {
            console.error(error);
            setRoomError("Connexion au salon impossible. Réessayez dans un instant.");
        });

        socket.connect();

        return () => {
            if (socket.connected) {
                socket.emit("room:leave");
            }
            socket.off("connect");
            socket.off("disconnect");
            socket.off("room:init", handleInit);
            socket.off("room:state", handleState);
            socket.off("room:message", handleMessage);
            socket.off("room:error", handleError);
            socket.off("morpion:finished", handleMorpionFinished);
            socket.off("connect_error");
            socket.disconnect();
            socketRef.current = null;
            hasJoinedRef.current = false;
        };
    }, [normalizedRoomId, performLeave]);

    useEffect(() => {
        hasJoinedRef.current = false;
    }, [normalizedRoomId]);

    useEffect(() => {
        if (typeof window === "undefined") {
            return;
        }

        const socket = socketRef.current;

        if (room.status === "started" && !room.morpion && socket && socketConnected) {
            socket.emit("room:sync");

            const intervalId = window.setInterval(() => {
                if (!socket.connected) {
                    return;
                }

                socket.emit("room:sync");
            }, 2000);

            syncIntervalRef.current = intervalId;

            return () => {
                window.clearInterval(intervalId);
                syncIntervalRef.current = null;
            };
        }

        if (syncIntervalRef.current !== null) {
            window.clearInterval(syncIntervalRef.current);
            syncIntervalRef.current = null;
        }
    }, [room.status, room.morpion, socketConnected]);

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
        if (!localPlayer || room.status === "started") {
            return;
        }

        socketRef.current?.emit("room:toggleReady");
    };

    const handleStartGame = () => {
        if (room.status === "started") {
            return;
        }

        if (room.hostId !== selfId) {
            setShareError("Seul l'organisateur peut lancer la partie.");
            return;
        }

        if (room.players.length < MAX_PLAYERS) {
            setShareError("Deux joueurs doivent être présents pour lancer le Morpion.");
            return;
        }

        const everyoneReady = room.players.every((player) => player.status === "ready");
        if (!everyoneReady) {
            setShareError("Tous les joueurs doivent être prêts pour démarrer le duel.");
            return;
        }

        socketRef.current?.emit("room:start");
    };

    const getRoomLink = () => roomLink || (typeof window !== "undefined" ? window.location.href : "");

    const handleCopyLink = async () => {
        if (room.players.length >= MAX_PLAYERS) {
            setShareError("Le salon est complet (2 joueurs).");
            return;
        }

        const linkToCopy = getRoomLink();
        const copied = await copyTextToClipboard(linkToCopy);

        if (copied) {
            setFeedback("Lien du salon copié dans le presse-papier");
            setShareError(null);
            return;
        }

        setShareError("Impossible de copier le lien. Copiez-le manuellement.");
    };

    const handleShareLink = async () => {
        if (room.players.length >= MAX_PLAYERS) {
            setShareError("Le salon est complet (2 joueurs).");
            return;
        }

        const shareTitle = selectedGame ? `Rejoindre mon salon ${selectedGame.label}` : "Rejoindre mon salon JokR";
        const shareText = selectedGame
            ? `Rejoins ma partie de ${selectedGame.label} sur JokR !`
            : "Rejoins ma partie sur JokR !";
        const linkToShare = getRoomLink();

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

        const copied = await copyTextToClipboard(linkToShare);
        if (copied) {
            setFeedback("Lien du salon copié dans le presse-papier");
            setShareError("Votre navigateur ne gère pas le partage automatique. Le lien a été copié.");
            return;
        }

        setShareError("Votre navigateur ne gère pas le partage automatique. Copiez le lien manuellement.");
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

    const handlePlayMorpionCell = (index: number) => {
        if (room.status !== "started") {
            return;
        }

        const socket = socketRef.current;
        if (!socket) {
            return;
        }

        socket.emit("morpion:move", {cellIndex: index});
    };

    const handleInvitePlaceholder = () => {
        if (room.players.length >= MAX_PLAYERS) {
            setShareError("Le salon est complet (2 joueurs).");
            return;
        }

        setFeedback("Fonctionnalité d'invitation avancée à venir.");
    };

    const handleLeaveRoom = useCallback(() => {
        performLeave();
    }, [performLeave]);

    const handleCloseNameModal = () => {
        if (!playerName) {
            handleLeaveRoom();
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

    const displayRoomId = room.id || normalizedRoomId;

    if (room.status === "started") {
        return (
            <MorpionGamePage
                room={room}
                morpion={room.morpion}
                selfId={selfId}
                localPlayer={localPlayer}
                onLeaveRoom={handleLeaveRoom}
                onPlayCell={handlePlayMorpionCell}
                messages={messages}
                chatEndRef={chatEndRef}
                onSendMessage={handleSendMessage}
                messageDraft={messageDraft}
                onMessageDraftChange={setMessageDraft}
            />
        );
    }

    return (
        <LobbyPage
            room={room}
            selfId={selfId}
            localPlayer={localPlayer}
            playersReady={playersReady}
            playerName={playerName}
            roomCode={displayRoomId}
            onBackToHome={handleLeaveRoom}
            onCopyLink={handleCopyLink}
            onShareLink={handleShareLink}
            onStartGame={handleStartGame}
            onToggleReady={handleToggleReady}
            onInvite={handleInvitePlaceholder}
            messages={messages}
            chatEndRef={chatEndRef}
            onSendMessage={handleSendMessage}
            messageDraft={messageDraft}
            onMessageDraftChange={setMessageDraft}
            feedback={feedback}
            shareError={shareError}
            roomError={roomError}
            socketConnected={socketConnected}
            hasJoinedRoom={hasJoinedRoom}
            isNameModalOpen={isNameModalOpen}
            nameDraft={nameDraft}
            onNameDraftChange={setNameDraft}
            onCloseNameModal={handleCloseNameModal}
            onSubmitName={handleSubmitName}
        />
    );
}
