/**
 * Composant Queens - une dame par ligne, par colonne et par zone de couleur, sans qu'elles se touchent
 *
 * - À l'ouverture : popup de paramètres (taille de grille, dames déjà placées en aide, XP gagnée)
 * - Plateau : un appui met une croix, un 2e appui en fait une dame, un 3e vide la case ;
 *   glisser sur plusieurs cases y met des croix
 * - Panneau de gauche : dames placées, et comment jouer
 * - Panneau de droite : chrono, annuler / rétablir, erreurs et rappel des règles
 * - Toutes les dames bien placées : validé automatiquement par le serveur
 */

import "../PuzzleUI/PuzzleLayout.scss";
import "./Queens.scss";
import {useMemo} from "react";
import {FaTimes} from "react-icons/fa";
import {SuccessPopup} from "../SuccessPopup/SuccessPopup.tsx";
import GameNotice from "../PuzzleUI/GameNotice.tsx";
import GameToolbar from "../PuzzleUI/GameToolbar.tsx";
import GameTimer from "../PuzzleUI/GameTimer.tsx";
import HistoryButtons from "../PuzzleUI/HistoryButtons.tsx";
import {useUndoShortcuts} from "../PuzzleUI/useMoveHistory.ts";
import ErrorsToggle from "../PuzzleUI/ErrorsToggle.tsx";
import {useShowErrors} from "../PuzzleUI/useShowErrors.ts";
import {useStoredFlag} from "../PuzzleUI/useStoredFlag.ts";
import {useGameFlow} from "../PuzzleUI/useGameFlow.ts";
import {useAutoValidate} from "../PuzzleUI/useAutoValidate.ts";
import {useResumableGame} from "../PuzzleUI/savedGame.ts";
import {useDailyGame} from "../PuzzleUI/useDailyGame.ts";
import DailyDonePopup from "../PuzzleUI/DailyDonePopup.tsx";
import {dailyService, formatDailyDate} from "../../Services/daily.service.ts";
import {DAILY_REWARD_MULTIPLIER} from "../../Services/dailyGames.ts";
import {useNavigate} from "react-router-dom";
import {queensService} from "../../Services/queens.service.ts";
import type {QueensPuzzle} from "../../Models/queens.model.ts";
import {type SavedQueens, useQueensGame} from "./useQueensGame.ts";
import {autoCrossCells, QUEEN, queensConflicts} from "./queensRules.ts";
import QueensBoard from "./QueensBoard.tsx";
import QueensSettingsPopup from "./QueensSettingsPopup.tsx";

type QueensProps = {
    // Défi du jour : grille imposée, pas de popup de paramètres
    daily?: boolean;
    // Défi d'un jour passé, rejoué en partie normale (hors classement) : AAAA-MM-JJ
    replayDate?: string;
};

export default function Queens({daily = false, replayDate}: QueensProps) {
    const navigate = useNavigate();
    // Grille imposée : défi du jour, ou défi d'un jour passé rejoué
    const challenge = daily || replayDate !== undefined;
    // Sauvegardes séparées (on peut avoir une partie libre et un défi en cours en parallèle)
    const saveKey = replayDate ? `QUEENS:replay:${replayDate}` : daily ? "QUEENS:daily" : "QUEENS";
    const game = useQueensGame(saveKey);
    const flow = useGameFlow();
    const {resumable, dismissResumable} = useResumableGame<SavedQueens, QueensPuzzle>(saveKey, queensService.getGame, !challenge);
    const dailyGame = useDailyGame<SavedQueens, QueensPuzzle>({
        enabled: challenge,
        gameCode: "QUEENS",
        saveKey,
        fetchStatus: queensService.getGame,
        emptySave: gameId => ({gameId, marks: []}),
        start: replayDate ? () => dailyService.replay("QUEENS", replayDate) : undefined,
        onLoad: (puzzle, saved, elapsedMs) => {
            game.restore(puzzle, saved);
            flow.resume(elapsedMs);
        },
    });
    const playing = !flow.showSettings && !flow.victory && !game.isGenerating;
    const [showErrors, setShowErrors] = useShowErrors();
    const conflicts = useMemo(() => queensConflicts(game.marks, game.puzzle), [game.marks, game.puzzle]);
    // Option : croix automatiques sur les cases interdites par les dames posées (retenue dans le navigateur)
    const [autoCross, setAutoCross] = useStoredFlag("jokr:queens:autoCrosses");
    const autoCrosses = useMemo(() => (autoCross ? autoCrossCells(game.marks, game.puzzle) : null),
        [autoCross, game.marks, game.puzzle]);
    const placed = game.marks.filter(m => m === QUEEN).length;
    const total = game.puzzle?.size ?? 0;

    // Toutes les dames bien placées : validé tout seul
    const filledKey = game.solution ? game.solution.join(",") : null;
    useAutoValidate({
        filledKey, playing, hasErrors: false,
        submit: () => flow.submit(game.validate), setNotice: flow.setNotice,
    });
    useUndoShortcuts(game.undo, game.redo, playing);

    const handleResume = () => {
        if (!resumable) return;
        game.restore(resumable.grid, resumable.saved);
        flow.resume(resumable.elapsedMs + Date.now() - resumable.checkedAt);
        dismissResumable();
    };

    const handleGenerate = (size: number, hints: number) => {
        dismissResumable();
        void flow.generate(() => game.generate(size, hints));
    };

    const rules = (
        <ul>
            <li>Une dame par ligne, une par colonne et une par zone de couleur</li>
            <li>Deux dames ne se touchent jamais, même en diagonale</li>
            <li>Un appui met une croix (pas de dame ici), un deuxième en fait une dame</li>
            <li>Croix automatiques (option) : les cases interdites par les dames posées se barrent toutes seules</li>
        </ul>
    );

    return (
        <div className="puzzle-layout queens">
            <GameToolbar
                gameName="Queens"
                label={daily ? <>Défi du jour <span className="daily-x2">×{DAILY_REWARD_MULTIPLIER}</span></>
                    : replayDate ? `Défi du ${formatDailyDate(replayDate)}` : undefined}
                clock={flow.clock}
                canUndo={playing && game.canUndo} canRedo={playing && game.canRedo}
                onUndo={game.undo} onRedo={game.redo}
                showErrors={showErrors} onToggleErrors={setShowErrors} errorCount={conflicts.size}
                rules={rules}
                extraToggle={{
                    active: autoCross, onToggle: () => setAutoCross(!autoCross),
                    label: "Croix automatiques", icon: <FaTimes aria-hidden/>,
                }}
            />

            <div className="options">
                <h2 className="title">Queens</h2>
                <p className="queens-progress">
                    {total > 0 ? <><strong>{placed}</strong> / {total} dames placées</> : "–"}
                </p>
                <p className="digit-hint">
                    Un appui met une croix, un deuxième (ou un double appui) pose une dame, un troisième vide la case.
                    Glisse sur plusieurs cases pour y mettre des croix.
                </p>
            </div>

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
                <h1 className="title">Queens</h1>
                {game.puzzle && (
                    <QueensBoard
                        puzzle={game.puzzle}
                        marks={game.marks}
                        isHint={game.isHint}
                        disabled={!playing}
                        onCycle={game.cycle}
                        onSetMark={game.setMark}
                        onCrossIfEmpty={game.crossIfEmpty}
                        errors={showErrors ? conflicts : null}
                        autoCrosses={autoCrosses}
                    />
                )}
            </div>

            <div className="actions">
                <h2 className="title">Actions</h2>
                <GameTimer clock={flow.clock}/>
                <HistoryButtons canUndo={playing && game.canUndo} canRedo={playing && game.canRedo}
                                onUndo={game.undo} onRedo={game.redo}/>
                <ErrorsToggle checked={showErrors} onChange={setShowErrors} count={conflicts.size}/>
                <label className="errors-toggle">
                    <input type="checkbox" checked={autoCross} onChange={e => setAutoCross(e.target.checked)}/>
                    <span>Croix automatiques</span>
                </label>
                <GameNotice message={dailyGame.error ?? flow.notice} onClose={flow.clearNotice}/>

                <div className="rules">
                    <h3>Règles</h3>
                    {rules}
                    <p className="rules-keys">Clavier : flèches pour se déplacer, <kbd>Espace</kbd> pour faire défiler,
                        <kbd>X</kbd> croix, <kbd>D</kbd> dame, <kbd>⌫</kbd> pour vider</p>
                </div>
            </div>

            <QueensSettingsPopup open={!challenge && flow.showSettings} onGenerate={handleGenerate}
                                 resume={resumable ? {elapsedMs: resumable.elapsedMs, onResume: handleResume} : undefined}/>

            {dailyGame.done && <DailyDonePopup gameCode="QUEENS" gameName="Queens" result={dailyGame.done}/>}

            {flow.victory && (
                <SuccessPopup gameName="Queens" xpAwarded={flow.victory.xpAwarded} creditsAwarded={flow.victory.creditsAwarded}
                              rewardMultiplier={flow.victory.rewardMultiplier} before={flow.victory.before}
                              durationMs={flow.victory.durationMs} personalBest={flow.victory.personalBest}
                              daily={flow.victory.daily}
                              onNewGame={replayDate ? () => navigate("/defi")
                                  : daily ? () => navigate(`/playgame/QUEENS`) : flow.newGame}
                              newGameLabel={replayDate ? "Autres défis" : daily ? "Partie libre" : undefined}/>
            )}
        </div>
    );
}
