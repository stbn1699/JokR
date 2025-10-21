export const MORPION_ID = "morpion";

export type MorpionConfig = {
    id: string;
    name: string;
    minPlayers: number;
    maxPlayers: number;
    gridSize: number;
    turnDurationMs: number;
};

export const MORPION_CONFIG: MorpionConfig = {
    id: MORPION_ID,
    name: "Morpion",
    minPlayers: 2,
    maxPlayers: 2,
    gridSize: 9,
    turnDurationMs: 30_000,
};

export const MORPION_MESSAGES = {
    startAnnouncement: "La partie de Morpion commence !",
    roomFull: "Le salon est complet.",
    roomFullWithCount: (count: number) => `Le salon est complet (${count} joueurs).`,
    notEnoughPlayersToStart: "Deux joueurs doivent être présents pour lancer le Morpion.",
    notEveryoneReady: "Tous les joueurs doivent être prêts pour démarrer le duel.",
    draw: "Match nul au Morpion.",
    victory: (winnerName?: string | null) =>
        winnerName ? `${winnerName} a remporté le duel de Morpion !` : "La partie est terminée.",
    hostOnlySettings: "Seul l'organisateur peut modifier les paramètres du Morpion.",
    settingsLocked: "Les paramètres du Morpion ne peuvent plus être modifiés pendant la partie.",
    inviteHintFull: "Salon complet : le duel peut commencer.",
    inviteHintWaiting: "Invitez votre adversaire à rejoindre la partie.",
    startButtonLabel: "Lancer le Morpion",
    startButtonLaunchedLabel: "Partie lancée",
    lobbyTitle: "Salon Morpion",
    startedStatus: "La partie de Morpion est en cours.",
    waitingStatus: (ready: number, max: number) =>
        `${ready}/${max} joueurs sont prêts. Attendez que chacun confirme pour lancer le Morpion.`,
};
