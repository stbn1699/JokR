type GameNoticeProps = {
    message: string | null;
    onClose: () => void;
};

/**
 * Message affiché dans le panneau Actions (grille incomplète, grille fausse, erreur serveur...).
 * Remplace les alert() du navigateur.
 */
export default function GameNotice({message, onClose}: GameNoticeProps) {
    if (!message) return null;

    return (
        <div className="game-notice" role="alert">
            <span>{message}</span>
            <button type="button" className="game-notice-close" aria-label="Fermer le message" onClick={onClose}>
                ×
            </button>
        </div>
    );
}
