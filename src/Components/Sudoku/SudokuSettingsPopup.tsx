import {useEffect, useState} from "react";
import {gameService} from "../../Services/game.service.ts";
import type {SudokuSettings} from "../../Models/sudokuSettings.model.ts";
import GameSettingsPopup from "../PuzzleUI/GameSettingsPopup.tsx";

type SudokuSettingsPopupProps = {
    open: boolean;
    // Appelé avec le nombre de cases pré-remplies (indices) à demander au serveur
    onGenerate: (cluesCount: number) => void;
    // Partie en cours à reprendre, s'il y en a une
    resume?: { elapsedMs: number; onResume: () => void };
};

/**
 * Paramètres d'une partie de Sudoku (grille toujours 9×9) : nombre de cases à remplir.
 * Les limites et l'XP viennent du serveur (GET /sudoku/settings).
 */
export default function SudokuSettingsPopup({open, onGenerate, resume}: SudokuSettingsPopupProps) {
    const [settings, setSettings] = useState<SudokuSettings | null>(null);
    const [emptyCells, setEmptyCells] = useState(0);
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

    return (
        <GameSettingsPopup
            open={open}
            loading={!settings}
            error={error}
            emptyCells={emptyCells}
            minEmptyCells={settings?.minEmptyCells ?? 0}
            maxEmptyCells={settings?.maxEmptyCells ?? 0}
            onEmptyCellsChange={setEmptyCells}
            xp={settings?.xpByEmptyCells[emptyCells]}
            credits={settings?.creditsByEmptyCells[emptyCells]}
            onGenerate={() => onGenerate(81 - emptyCells)}
            resume={resume}
        />
    );
}
