/**
 * Composant Sudoku - Jeu de Sudoku 9x9 interactif
 *
 * - À l'ouverture : popup de paramètres (cases à remplir, XP gagnée), puis génération côté serveur
 * - Victoire : popup avec la barre d'XP ; "Nouvelle partie" rouvre les paramètres sans recharger
 * - Grille : navigation clavier, surbrillance des chiffres identiques
 * - Actions : validation côté serveur, qui calcule et enregistre l'XP si le joueur est connecté
 *
 * - Panneau de gauche : chiffres restants à placer ; avec une case sélectionnée, un chiffre la remplit
 *   (ou y ajoute une note au crayon en mode notes, touche N) ; sinon il est surligné dans la grille
 *
 * La logique est dans useSudokuGame, l'affichage dans SudokuSettingsPopup, DigitPanel et SudokuGrid.
 */

import "../PuzzleUI/PuzzleLayout.scss";
import "./Sudoku.scss";
import {SuccessPopup} from "../SuccessPopup/SuccessPopup.tsx";
import GameNotice from "../PuzzleUI/GameNotice.tsx";
import GameTimer from "../PuzzleUI/GameTimer.tsx";
import HistoryButtons from "../PuzzleUI/HistoryButtons.tsx";
import {useEffect} from "react";
import {useUndoShortcuts} from "../PuzzleUI/useMoveHistory.ts";
import ErrorsToggle from "../PuzzleUI/ErrorsToggle.tsx";
import {useShowErrors} from "../PuzzleUI/useShowErrors.ts";
import {useGameFlow} from "../PuzzleUI/useGameFlow.ts";
import {type SavedSudoku, useSudokuGame} from "./useSudokuGame.ts";
import {useResumableGame} from "../PuzzleUI/savedGame.ts";
import {useDailyGame} from "../PuzzleUI/useDailyGame.ts";
import DailyDonePopup from "../PuzzleUI/DailyDonePopup.tsx";
import {formatDailyDate} from "../../Services/daily.service.ts";
import {useNavigate} from "react-router-dom";
import {gameService} from "../../Services/game.service.ts";
import SudokuSettingsPopup from "./SudokuSettingsPopup.tsx";
import SudokuGrid from "./SudokuGrid.tsx";
import DigitPanel from "../PuzzleUI/DigitPanel.tsx";

const DIGITS = [1, 2, 3, 4, 5, 6, 7, 8, 9];

type SudokuProps = {
    // Défi du jour : grille imposée, pas de popup de paramètres
    daily?: boolean;
};

export default function Sudoku({daily = false}: SudokuProps) {
    const navigate = useNavigate();
    // Sauvegarde séparée pour le défi du jour (on peut avoir une partie libre en cours en parallèle)
    const saveKey = daily ? "SUDOKU:daily" : "SUDOKU";
    const [showErrors, setShowErrors] = useShowErrors();
    const {
        inputs, isGenerating, generate, validate,
        digitCounts, selectedDigit, toggleDigit, fillSelected, pressDigit, setHoverDigit, setSelectedCell,
        onCellInput, undo, redo, canUndo, canRedo, conflicts, notes, notesMode, setNotesMode, toggleNoteAt,
        restore,
    } = useSudokuGame(showErrors, saveKey);
    const flow = useGameFlow();
    const {resumable, dismissResumable} = useResumableGame<SavedSudoku, number[][]>(saveKey, gameService.getSudokuGame, !daily);
    const dailyGame = useDailyGame<SavedSudoku, number[][]>({
        enabled: daily,
        gameCode: "SUDOKU",
        saveKey,
        fetchStatus: gameService.getSudokuGame,
        emptySave: gameId => ({gameId, values: [], notes: []}),
        onLoad: (grid, saved, elapsedMs) => {
            restore(grid, saved);
            flow.resume(elapsedMs);
        },
    });
    const playing = !flow.showSettings && !flow.victory && !isGenerating;
    useUndoShortcuts(undo, redo, playing);

    // Touche N : bascule le mode notes
    useEffect(() => {
        if (!playing) return;
        const onKey = (e: KeyboardEvent) => {
            if (e.ctrlKey || e.metaKey || e.altKey) return;
            if (e.key === "n" || e.key === "N") {
                e.preventDefault();
                setNotesMode(m => !m);
            }
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [playing, setNotesMode]);

    const handleGenerate = (cluesCount: number) => {
        dismissResumable();
        void flow.generate(() => generate(cluesCount));
    };

    const handleResume = () => {
        if (!resumable) return;
        restore(resumable.grid, resumable.saved);
        flow.resume(resumable.elapsedMs + Date.now() - resumable.checkedAt);
        dismissResumable();
    };

    return (
        <div className="puzzle-layout sudoku">
            <DigitPanel digits={DIGITS} perDigit={9} counts={digitCounts} selected={selectedDigit}
                        onSelect={n => pressDigit(n) || toggleDigit(n)}
                        onErase={() => fillSelected(null)}
                        notes={{active: notesMode, onToggle: () => setNotesMode(m => !m)}}/>

            <div className="game">
                {daily && (
                    <p className="daily-label">
                        Défi du jour{dailyGame.date ? ` · ${formatDailyDate(dailyGame.date)}` : ""}
                    </p>
                )}
                <h1 className="title">Sudoku</h1>
                <SudokuGrid inputs={inputs} onHover={setHoverDigit} onCellInput={onCellInput}
                            onSelectCell={setSelectedCell} notes={notes} notesMode={notesMode}
                            onToggleNote={toggleNoteAt}/>
            </div>

            <div className="actions">
                <h2 className="title">Actions</h2>
                <GameTimer clock={flow.clock}/>
                <button type="button" onClick={() => flow.submit(validate)} className="validate-button"
                        disabled={isGenerating || flow.showSettings}>
                    Valider
                </button>
                <HistoryButtons canUndo={playing && canUndo} canRedo={playing && canRedo} onUndo={undo} onRedo={redo}/>
                <ErrorsToggle checked={showErrors} onChange={setShowErrors} count={conflicts.size}/>
                <GameNotice message={dailyGame.error ?? flow.notice} onClose={flow.clearNotice}/>
            </div>

            <SudokuSettingsPopup open={!daily && flow.showSettings} onGenerate={handleGenerate}
                                 resume={resumable ? {elapsedMs: resumable.elapsedMs, onResume: handleResume} : undefined}/>

            {dailyGame.done && <DailyDonePopup gameCode="SUDOKU" gameName="Sudoku" result={dailyGame.done}/>}

            {flow.victory && (
                <SuccessPopup gameName="Sudoku" xpAwarded={flow.victory.xpAwarded} before={flow.victory.before}
                              durationMs={flow.victory.durationMs} personalBest={flow.victory.personalBest}
                              daily={flow.victory.daily}
                              onNewGame={daily ? () => navigate(`/playgame/SUDOKU`) : flow.newGame}
                              newGameLabel={daily ? "Partie libre" : undefined}/>
            )}
        </div>
    );
}
