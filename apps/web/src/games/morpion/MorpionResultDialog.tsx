import type {RoomSnapshot} from "../../room/types";
import type {MorpionOutcome} from "./types";

type MorpionResultDialogProps = {
    room: RoomSnapshot;
    outcome: MorpionOutcome;
    selfId: string | null;
    localPlayerName: string | null;
    onClose: () => void;
    onGoHome: () => void;
};

export function MorpionResultDialog({
    room,
    outcome,
    selfId,
    localPlayerName,
    onClose,
    onGoHome,
}: MorpionResultDialogProps) {
    const winner =
        outcome.reason === "win" && outcome.winnerId
            ? room.players.find((player) => player.id === outcome.winnerId) ?? null
            : null;

    const didWin = outcome.reason === "win" && outcome.winnerId !== null && outcome.winnerId === selfId;
    const didLose = outcome.reason === "win" && outcome.winnerId !== null && outcome.winnerId !== selfId;

    const badgeVariant = outcome.reason === "draw" ? "draw" : didWin ? "victory" : "defeat";
    const badgeLabel = outcome.reason === "draw" ? "Match nul" : didWin ? "Victoire" : "Défaite";

    let title = "Partie terminée";
    let description = "La partie est terminée.";

    if (outcome.reason === "draw") {
        title = "Match nul !";
        description = "La grille est complète, personne ne l'emporte cette fois-ci.";
    } else if (didWin) {
        title = "Victoire !";
        description = "Bravo, vous remportez ce duel de Morpion.";
    } else if (didLose) {
        const opponentName = winner?.name ?? "Votre adversaire";
        title = "Défaite…";
        description = `${opponentName} s'impose cette fois-ci.`;
    } else if (winner) {
        title = `Victoire de ${winner.name}`;
        description = "La partie est terminée.";
    }

    const identity = localPlayerName ? `Vous jouiez en tant que ${localPlayerName}.` : null;

    return (
        <div className="result-modal-overlay" role="presentation">
            <div
                className="result-modal"
                role="dialog"
                aria-modal="true"
                aria-labelledby="morpion-result-title"
                aria-describedby="morpion-result-description"
            >
                <button
                    type="button"
                    className="result-modal-close"
                    onClick={onClose}
                    aria-label="Fermer le résumé de la partie"
                >
                    ×
                </button>
                <span className={`result-badge ${badgeVariant}`}>{badgeLabel}</span>
                <h2 id="morpion-result-title">{title}</h2>
                <p id="morpion-result-description" className="result-modal-description">
                    {description}
                </p>
                <p className="result-modal-hint">
                    Vous êtes de retour dans le salon. Fermez cette fenêtre pour organiser une revanche ou retournez à
                    l'accueil pour quitter le site.
                </p>
                {identity && <p className="result-modal-identity">{identity}</p>}
                <div className="result-modal-actions">
                    <button type="button" className="ghost" onClick={onClose}>
                        Fermer
                    </button>
                    <button type="button" className="primary" onClick={onGoHome}>
                        Retour à l'accueil
                    </button>
                </div>
            </div>
        </div>
    );
}
