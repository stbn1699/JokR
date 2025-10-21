import {useMemo} from "react";
import type {RoomPlayer} from "../../room/types";
import {MORPION_CONFIG, MORPION_MESSAGES} from "./config";
import type {MorpionSettings} from "./types";

export type MorpionLobbySettingsProps = {
    players: RoomPlayer[];
    hostId: string | null;
    settings: MorpionSettings;
    isHost: boolean;
    isGameStarted: boolean;
    onAssignCross: (playerId: string | null) => void;
};

export function MorpionLobbySettings({
    players,
    hostId,
    settings,
    isHost,
    isGameStarted,
    onAssignCross,
}: MorpionLobbySettingsProps) {
    const morpionSymbols = settings.symbols ?? {};
    const hostPlayer = useMemo(
        () => players.find((player) => player.id === hostId) ?? null,
        [players, hostId]
    );
    const opponentPlayer = useMemo(
        () => players.find((player) => player.id !== hostId) ?? null,
        [players, hostId]
    );
    const crossPlayer = useMemo(
        () => players.find((player) => morpionSymbols[player.id] === "X") ?? null,
        [players, morpionSymbols]
    );
    const circlePlayer = useMemo(
        () => players.find((player) => morpionSymbols[player.id] === "O") ?? null,
        [players, morpionSymbols]
    );
    const totalPlayers = players.length;
    const canEditSettings = isHost && !isGameStarted;
    const canToggleStart = canEditSettings && Boolean(hostPlayer && opponentPlayer);
    const hostStarts = Boolean(hostPlayer && morpionSymbols[hostPlayer.id] === "X");

    const handleToggleStart = () => {
        if (!canToggleStart || !hostPlayer || !opponentPlayer) {
            return;
        }

        const nextCrossId = hostStarts ? opponentPlayer.id : hostPlayer.id;
        onAssignCross(nextCrossId);
    };

    return (
        <div className="settings-panel">
            <div className="settings-header">
                <h2>Paramètres de jeu</h2>
                <p>
                    Choisissez qui joue avec les croix (X) et qui prend les ronds (O). Les croix commencent
                    la partie.
                </p>
            </div>
            <div className="start-toggle">
                <h3>Qui commence ?</h3>
                <p>Activez le bouton pour démarrer la partie avec les croix (X).</p>
                <button
                    type="button"
                    role="switch"
                    aria-checked={hostStarts}
                    className={`start-switch${hostStarts ? " active" : ""}`}
                    onClick={handleToggleStart}
                    disabled={!canToggleStart}
                >
                    <span className="start-switch-track" aria-hidden>
                        <span className="start-switch-thumb" />
                    </span>
                    <span className="start-switch-label">
                        {hostPlayer
                            ? hostStarts
                                ? "Je commence"
                                : opponentPlayer
                                  ? `${opponentPlayer.name} commence`
                                  : "En attente d'un adversaire"
                            : "À déterminer"}
                    </span>
                </button>
                {canEditSettings && !opponentPlayer && (
                    <p className="settings-helper">Invitez un adversaire pour choisir qui commence.</p>
                )}
            </div>
            <div className="start-summary">
                <div className="start-summary-row">
                    <span className="start-badge">X</span>
                    <span>{crossPlayer ? crossPlayer.name : "À déterminer"}</span>
                </div>
                <div className="start-summary-row">
                    <span className="start-badge">O</span>
                    <span>
                        {circlePlayer
                            ? circlePlayer.name
                            : totalPlayers === MORPION_CONFIG.maxPlayers
                              ? "À déterminer"
                              : "En attente d'un joueur"}
                    </span>
                </div>
            </div>
            {!canEditSettings && (
                <p className="settings-helper">{MORPION_MESSAGES.hostOnlySettings}</p>
            )}
        </div>
    );
}
