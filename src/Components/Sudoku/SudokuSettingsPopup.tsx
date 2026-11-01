import {type FormEvent, useEffect, useState} from "react";
import {useNavigate} from "react-router-dom";
import "./SudokuSettingsPopup.scss";
import {gameService} from "../../Services/game.service.ts";
import {useAuth} from "../../Context/authContext.ts";
import sounds from "../../Services/sounds.ts";
import type {SudokuSettings} from "../../Models/sudokuSettings.model.ts";

type SudokuSettingsPopupProps = {
    open: boolean;
    // Appelé avec le nombre de cases pré-remplies (indices) à demander au serveur
    onGenerate: (cluesCount: number) => void;
};

/**
 * Popup affichée avant une partie : choix du nombre de cases vides,
 * aperçu de l'XP gagnée à la résolution, puis bouton "Générer".
 * Les limites et l'XP viennent du serveur (GET /sudoku/settings).
 */
export default function SudokuSettingsPopup({open, onGenerate}: SudokuSettingsPopupProps) {
    const navigate = useNavigate();
    const {isLoggedIn} = useAuth();
    const [settings, setSettings] = useState<SudokuSettings | null>(null);
    const [emptyCells, setEmptyCells] = useState<number | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const controller = new AbortController();
        gameService.getSudokuSettings(controller.signal)
            .then((s) => {
                setSettings(s);
                setEmptyCells(s.defaultEmptyCells);
            })
            .catch((err: Error) => {
                if (err.name !== "AbortError") setError("Impossible de charger les paramètres du Sudoku.");
            });
        return () => controller.abort();
    }, []);

    if (!open) return null;

    const xp = settings && emptyCells !== null ? settings.xpByEmptyCells[emptyCells] : undefined;

    const handleSubmit = (e: FormEvent) => {
        e.preventDefault();
        if (emptyCells === null) return;
        sounds.button();
        onGenerate(81 - emptyCells);
    };

    return (
        <div className="modal-overlay sudoku-settings-overlay" role="dialog" aria-modal="true"
             aria-labelledby="sudoku-settings-title">
            <form className="modal sudoku-settings" onSubmit={handleSubmit}>
                <h2 id="sudoku-settings-title">Nouvelle partie</h2>

                {error && <p className="sudoku-settings-error">{error}</p>}
                {!error && !settings && <p>Chargement…</p>}

                {settings && emptyCells !== null && (
                    <>
                        <label htmlFor="empty-cells" className="sudoku-settings-label">
                            Cases à remplir
                            <span className="sudoku-settings-value">{emptyCells}</span>
                        </label>

                        <input
                            id="empty-cells"
                            type="range"
                            min={settings.minEmptyCells}
                            max={settings.maxEmptyCells}
                            step={1}
                            value={emptyCells}
                            onChange={(e) => setEmptyCells(Number(e.target.value))}
                            autoFocus
                        />
                        <div className="sudoku-settings-scale" aria-hidden>
                            <span>{settings.minEmptyCells} · plus facile</span>
                            <span>plus difficile · {settings.maxEmptyCells}</span>
                        </div>

                        <p className="sudoku-settings-xp">
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
                    <button type="submit" className="modal-button" disabled={emptyCells === null}>
                        Générer
                    </button>
                </div>
            </form>
        </div>
    );
}
