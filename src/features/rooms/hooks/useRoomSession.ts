import {useEffect, useRef, useState} from "react";
import type {GameDefinition} from "../../../config/games";
import {
    createRoom,
    fetchRoom,
    joinRoom,
    kickPlayerFromRoom,
    leaveRoom,
    type CreateRoomResponse,
    type JoinRoomResponse,
} from "../api";
import type {Room, RoomPlayer} from "../types";

interface RoomSessionState {
    room: Room | null;
    player: RoomPlayer | null;
    creatingGameId: string | null;
    isJoiningRoom: boolean;
    error: string | null;
}

export function useRoomSession(username: string) {
    const [state, setState] = useState<RoomSessionState>({
        room: null,
        player: null,
        creatingGameId: null,
        isJoiningRoom: false,
        error: null,
    });
    const roomRef = useRef<Room | null>(null);
    const playerRef = useRef<RoomPlayer | null>(null);

    useEffect(() => {
        roomRef.current = state.room;
    }, [state.room]);

    useEffect(() => {
        playerRef.current = state.player;
    }, [state.player]);

    useEffect(() => {
        const handleBeforeUnload = () => {
            const room = roomRef.current;
            const player = playerRef.current;

            if (room && player) {
                void leaveRoom(room.id, player.id, true);
            }
        };

        window.addEventListener("beforeunload", handleBeforeUnload);

        return () => {
            window.removeEventListener("beforeunload", handleBeforeUnload);
            handleBeforeUnload();
        };
    }, []);

    const setError = (message: string | null) => {
        setState((prev) => ({...prev, error: message}));
    };

    const setRoomState = ({room, player, error}: Partial<RoomSessionState>) => {
        setState((prev) => ({
            ...prev,
            room: room !== undefined ? room : prev.room,
            player: player !== undefined ? player : prev.player,
            error: error !== undefined ? error : prev.error,
        }));
    };

    const handleCreateRoom = async (game: GameDefinition) => {
        setState((prev) => ({...prev, creatingGameId: game.id, error: null}));

        try {
            const {room, player}: CreateRoomResponse = await createRoom(game, username);
            setState((prev) => ({...prev, room, player}));
        } catch (err) {
            setRoomState({room: null, player: null, error: (err as Error).message});
        } finally {
            setState((prev) => ({...prev, creatingGameId: null}));
        }
    };

    const handleJoinRoom = async (roomId: string) => {
        setState((prev) => ({...prev, isJoiningRoom: true, error: null}));

        try {
            const {room, player}: JoinRoomResponse = await joinRoom(roomId, username);
            setState((prev) => ({...prev, room, player}));
        } catch (err) {
            setRoomState({room: null, player: null, error: (err as Error).message});
        } finally {
            setState((prev) => ({...prev, isJoiningRoom: false}));
        }
    };

    const handleCloseRoom = () => {
        const room = state.room;
        const player = state.player;

        if (room && player) {
            void leaveRoom(room.id, player.id).catch((err: unknown) => {
                setError((err as Error).message);
            });
        }

        setRoomState({room: null, player: null, error: null});
    };

    const handleKickPlayer = async (playerId: string) => {
        const room = roomRef.current;
        const player = playerRef.current;

        if (!room || !player) {
            return;
        }

        setError(null);

        try {
            const updatedRoom = await kickPlayerFromRoom(room.id, player.id, playerId);
            setState((prev) => ({...prev, room: updatedRoom}));
        } catch (err) {
            setError((err as Error).message);
        }
    };

    useEffect(() => {
        if (!state.room) {
            return undefined;
        }

        let cancelled = false;

        const refreshRoom = async () => {
            try {
                const room = await fetchRoom(state.room?.id);
                if (!cancelled) {
                    const player = playerRef.current;
                    const stillInRoom = player ? room.players.some((p) => p.id === player.id) : false;

                    if (player && !stillInRoom) {
                        setRoomState({room: null, player: null, error: "Vous avez été retiré du salon."});
                        return;
                    }

                    setRoomState({room, error: null});
                }
            } catch (err) {
                if (!cancelled) {
                    setError((err as Error).message);
                }
            }
        };

        void refreshRoom();
        const intervalId = window.setInterval(() => {
            void refreshRoom();
        }, 2000);

        return () => {
            cancelled = true;
            window.clearInterval(intervalId);
        };
    }, [state.room]);

    return {
        activeRoom: state.room,
        activePlayer: state.player,
        error: state.error,
        creatingGameId: state.creatingGameId,
        isJoiningRoom: state.isJoiningRoom,
        createRoom: handleCreateRoom,
        joinRoom: handleJoinRoom,
        closeRoom: handleCloseRoom,
        kickPlayer: handleKickPlayer,
        setError,
    };
}
