import type {FormEvent} from "react";
import {useNavigate} from "react-router-dom";
import "./GameSettingsPopup.scss";
import "../SuccessPopup/SuccessPopup.scss";
import {useAuth} from "../../Context/authContext.ts";

type GameSettingsPopupProps = {
    open: boolean;
    loading: boolean;
    error: string | null;
    // Choix de la taille de grille (absent pour le Sudoku, toujours en 9×9)
    sizes?: number[];
    size?: number;
    onSizeChange?: (size: number) => void;
    // Nombre de cases à remplir et ses limites
    emptyCells: number;
    minEmptyCells: number;
    maxEmptyCells: number;
    onEmptyCellsChange: (emptyCells: number) => void;
    // XP gagnée à la résolution avec ces paramètres
    xp: number | undefined;
    onGenerate: () => void;
};

/**
 * Popup affichée avant une partie : paramètres de la grille, aperçu de l'XP, bouton "Générer".
 * Purement affichage : chaque jeu charge ses limites et garde les valeurs choisies.
 */
export default function GameSettingsPopup(props: GameSettingsPopupProps) {
    const navigate = useNavigate();
    const {isLoggedIn} = useAuth();
    const {open, loading, error, sizes, size, onSizeChange, emptyCells, minEmptyCells, maxEmptyCells, xp} = props;

    if (!open) return null;

    const ready = !loading && !error;

    const handleSubmit = (e: FormEvent) => {
        e.preventDefault();
        if (!ready) return;
        props.onGenerate();
    };

    return (
        <div className="modal-overlay game-settings-overlay" role="dialog" aria-modal="true"
             aria-labelledby="game-settings-title">
            <form className="modal game-settings" onSubmit={handleSubmit}>
                <h2 id="game-settings-title">Nouvelle partie</h2>

                {error && <p className="game-settings-error">{error}</p>}
                {loading && !error && <p>Chargement…</p>}

                {ready && (
                    <>
                        {sizes && size !== undefined && onSizeChange && (
                            <fieldset className="game-settings-sizes">
                                <legend>Taille de la grille</legend>
                                <div className="game-settings-size-list">
                                    {sizes.map(s => (
                                        <button
                                            key={s}
                                            type="button"
                                            className={`game-settings-size ${s === size ? "selected" : ""}`}
                                            aria-pressed={s === size}
                                            onClick={() => onSizeChange(s)}
                                        >
                                            {s}×{s}
                                        </button>
                                    ))}
                                </div>
                            </fieldset>
                        )}

                        <label htmlFor="empty-cells" className="game-settings-label">
                            Cases à remplir
                            <span className="game-settings-value">{emptyCells}</span>
                        </label>

                        <input
                            id="empty-cells"
                            type="range"
                            min={minEmptyCells}
                            max={maxEmptyCells}
                            step={1}
                            value={emptyCells}
                            onChange={(e) => props.onEmptyCellsChange(Number(e.target.value))}
                            autoFocus
                        />
                        <div className="game-settings-scale" aria-hidden>
                            <span>{minEmptyCells} · plus facile</span>
                            <span>plus difficile · {maxEmptyCells}</span>
                        </div>

                        <p className="game-settings-xp">
                            {isLoggedIn
                                ? <>Victoire : <strong>+{xp} XP</strong></>
                                : <>Connecte-toi pour gagner <strong>{xp} XP</strong> à la résolution</>}
                        </p>
                    </>
                )}

                <div className="modal-buttons">
                    <button type="button" className="modal-button secondary" onClick={() => navigate('/')}>
                        Retour à l'accueil
                    </button>
                    <button type="submit" className="modal-button" disabled={!ready}>
                        Générer
                    </button>
                </div>
            </form>
        </div>
    );
}
