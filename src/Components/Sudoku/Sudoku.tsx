/**
 * Composant Sudoku - Jeu de Sudoku 9x9 interactif
 *
 * - À l'ouverture : popup de paramètres (cases à remplir, XP gagnée), puis génération côté serveur
 * - Victoire : popup avec la barre d'XP ; "Nouvelle partie" rouvre les paramètres sans recharger
 * - Grille : navigation clavier, surbrillance des chiffres identiques
 * - Grille remplie : validée automatiquement côté serveur, qui calcule et enregistre l'XP si le joueur est connecté
 *
 * - Panneau de gauche : chiffres restants à placer ; avec une case sélectionnée, un chiffre la remplit
 *   (ou y ajoute une note au crayon en mode notes, touche N) ; sinon il est surligné dans la grille
 *
 * La logique est dans useSudokuGame, l'affichage dans SudokuSettingsPopup, DigitPanel et SudokuGrid.
 */

import "../PuzzleUI/PuzzleLayout.scss";
import {SkeletonLabel} from "../PuzzleUI/GridSkeleton.tsx";
import "./Sudoku.scss";
import {SuccessPopup} from "../SuccessPopup/SuccessPopup.tsx";
import GameNotice from "../PuzzleUI/GameNotice.tsx";
import GameToolbar from "../PuzzleUI/GameToolbar.tsx";
import GameTimer from "../PuzzleUI/GameTimer.tsx";
import HistoryButtons from "../PuzzleUI/HistoryButtons.tsx";
import {useEffect} from "react";
import {useUndoShortcuts} from "../PuzzleUI/useMoveHistory.ts";
import ErrorsToggle from "../PuzzleUI/ErrorsToggle.tsx";
import {useShowErrors} from "../PuzzleUI/useShowErrors.ts";
import {useGameFlow} from "../PuzzleUI/useGameFlow.ts";
import {useAutoValidate} from "../PuzzleUI/useAutoValidate.ts";
import {type SavedSudoku, useSudokuGame} from "./useSudokuGame.ts";
import {useResumableGame} from "../PuzzleUI/savedGame.ts";
import {useDailyGame} from "../PuzzleUI/useDailyGame.ts";
import DailyDonePopup from "../PuzzleUI/DailyDonePopup.tsx";
import {dailyService, formatDailyDate} from "../../Services/daily.service.ts";
import {challengeService} from "../../Services/challenge.service.ts";
import {DAILY_REWARD_MULTIPLIER} from "../../Services/dailyGames.ts";
import {useNavigate} from "react-router-dom";
import {gameService} from "../../Services/game.service.ts";
import SudokuSettingsPopup from "./SudokuSettingsPopup.tsx";
import SudokuGrid from "./SudokuGrid.tsx";
import DigitPanel from "../PuzzleUI/DigitPanel.tsx";

const DIGITS = [1, 2, 3, 4, 5, 6, 7, 8, 9];

type SudokuProps = {
    // Défi du jour : grille imposée, pas de popup de paramètres
    daily?: boolean;
    // Défi d'un jour passé, rejoué en partie normale (hors classement) : AAAA-MM-JJ
    replayDate?: string;
    // Défi d'un·e ami·e : sa grille, à faire à son tour (partie normale, hors classement)
    challengeId?: string;
};

export default function Sudoku({daily = false, replayDate, challengeId}: SudokuProps) {
    const navigate = useNavigate();
    // Grille imposée : défi du jour, ou défi d'un jour passé rejoué
    const challenge = daily || replayDate !== undefined || challengeId !== undefined;
    // Sauvegardes séparées (on peut avoir une partie libre et un défi en cours en parallèle)
    const saveKey = challengeId ? `SUDOKU:challenge:${challengeId}` : replayDate ? `SUDOKU:replay:${replayDate}` : daily ? "SUDOKU:daily" : "SUDOKU";
    const [showErrors, setShowErrors] = useShowErrors();
    const {
        inputs, isGenerating, isLoading, generate, validate, filledKey,
        digitCounts, selectedDigit, toggleDigit, fillSelected, pressDigit, setHoverDigit, setSelectedCell,
        onCellInput, undo, redo, canUndo, canRedo, conflicts, notes, notesMode, setNotesMode, toggleNoteAt,
        restore,
    } = useSudokuGame(showErrors, saveKey);
    const flow = useGameFlow();
    const {resumable, dismissResumable} = useResumableGame<SavedSudoku, number[][]>(saveKey, gameService.getSudokuGame, !challenge);
    const dailyGame = useDailyGame<SavedSudoku, number[][]>({
        enabled: challenge,
        gameCode: "SUDOKU",
        saveKey,
        fetchStatus: gameService.getSudokuGame,
        emptySave: gameId => ({gameId, values: [], notes: []}),
        start: challengeId ? () => challengeService.start(challengeId)
            : replayDate ? () => dailyService.replay("SUDOKU", replayDate) : undefined,
        onLoad: (grid, saved, elapsedMs) => {
            restore(grid, saved);
            flow.resume(elapsedMs);
        },
    });
    const playing = !flow.showSettings && !flow.victory && !isGenerating;
    useUndoShortcuts(undo, redo, playing);
    // Grille remplie : validée toute seule
    useAutoValidate({filledKey, playing, hasErrors: conflicts.size > 0, submit: () => flow.submit(validate), setNotice: flow.setNotice});

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

    const rules = (
        <ul>
            <li>Chaque ligne, chaque colonne et chaque bloc 3×3 contient les chiffres de 1 à 9, une fois chacun</li>
            <li>Mode notes (✏) : pour noter les chiffres possibles en petit dans une case</li>
        </ul>
    );

    return (
        <div className="puzzle-layout sudoku">
            <GameToolbar
                gameName="Sudoku"
                label={daily ? <>Défi du jour <span className="daily-x2">×{DAILY_REWARD_MULTIPLIER}</span></>
                    : replayDate ? `Défi du ${formatDailyDate(replayDate)}` : challengeId ? "Défi d'un·e ami·e" : undefined}
                clock={flow.clock}
                canUndo={playing && canUndo} canRedo={playing && canRedo}
                onUndo={undo} onRedo={redo}
                showErrors={showErrors} onToggleErrors={setShowErrors} errorCount={conflicts.size}
                rules={rules}
            />
            <DigitPanel digits={DIGITS} perDigit={9} counts={digitCounts} selected={selectedDigit}
                        onSelect={n => pressDigit(n) || toggleDigit(n)}
                        onErase={() => fillSelected(null)}
                        notes={{active: notesMode, onToggle: () => setNotesMode(m => !m)}}/>

            <div className="game">
                {daily && (
                    <p className="daily-label">
                        Défi du jour{dailyGame.date ? ` · ${formatDailyDate(dailyGame.date)}` : ""}
                        <span className="daily-x2">XP et crédits ×{DAILY_REWARD_MULTIPLIER}</span>
                    </p>
                )}
                {replayDate && (
                    <p className="daily-label">Défi du {formatDailyDate(replayDate)} · hors classement</p>
                )}
                {challengeId && <p className="daily-label">Défi d'un·e ami·e · la même grille, à toi de jouer</p>}
                <h1 className="title">Sudoku</h1>
                <SudokuGrid inputs={inputs} onHover={setHoverDigit} onCellInput={onCellInput}
                            onSelectCell={setSelectedCell} notes={notes} notesMode={notesMode}
                            onToggleNote={toggleNoteAt} loading={isLoading || dailyGame.loading}/>
                {/* Grille envoyée au serveur : il ne se passe pas « rien » */}
                {flow.validating && <SkeletonLabel label="Vérification…"/>}
            </div>

            <div className="actions">
                <h2 className="title">Actions</h2>
                <GameTimer clock={flow.clock}/>
                <HistoryButtons canUndo={playing && canUndo} canRedo={playing && canRedo} onUndo={undo} onRedo={redo}/>
                <ErrorsToggle checked={showErrors} onChange={setShowErrors} count={conflicts.size}/>
                <GameNotice message={dailyGame.error ?? flow.notice} onClose={flow.clearNotice}/>

                <div className="rules">
                    <h3>Règles</h3>
                    {rules}
                    <p className="rules-keys">Clavier : <kbd>1</kbd>…<kbd>9</kbd> pour remplir, <kbd>⌫</kbd> pour vider,
                        flèches pour se déplacer, <kbd>N</kbd> pour le mode notes</p>
                </div>
            </div>

            <SudokuSettingsPopup open={!challenge && flow.showSettings} onGenerate={handleGenerate}
                                 resume={resumable ? {elapsedMs: resumable.elapsedMs, onResume: handleResume} : undefined}/>

            {dailyGame.done && <DailyDonePopup gameCode="SUDOKU" gameName="Sudoku" result={dailyGame.done}/>}

            {flow.victory && (
                <SuccessPopup gameName="Sudoku" gameCode="SUDOKU" xpAwarded={flow.victory.xpAwarded} creditsAwarded={flow.victory.creditsAwarded}
                              rewardMultiplier={flow.victory.rewardMultiplier} before={flow.victory.before}
                              durationMs={flow.victory.durationMs} personalBest={flow.victory.personalBest}
                              daily={flow.victory.daily}
                              challengeId={challengeId}
                              defy={replayDate || challengeId ? undefined : daily ? "daily" : "free"}
                              onNewGame={challengeId ? () => navigate(`/playgame/SUDOKU`)
                                  : replayDate ? () => navigate("/defi")
                                  : daily ? () => navigate(`/playgame/SUDOKU`) : flow.newGame}
                              newGameLabel={replayDate ? "Autres défis" : daily || challengeId ? "Partie libre" : undefined}
                              back={replayDate ? null : daily ? "daily" : "home"}/>
            )}
        </div>
    );
}
