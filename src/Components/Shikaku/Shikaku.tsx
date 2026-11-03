/**
 * Composant Shikaku (Rectangles) - découper la grille en rectangles, un nombre par rectangle, égal à son aire
 *
 * - À l'ouverture : popup de paramètres (taille de grille, rectangles déjà tracés en aide, XP gagnée)
 * - Plateau : glisser d'une case à une autre trace un rectangle, un appui sur un rectangle l'efface ;
 *   un rectangle juste se colore
 * - Panneau de gauche : rectangles justes, et comment jouer
 * - Panneau de droite : chrono, annuler / rétablir, erreurs et rappel des règles
 * - Grille entièrement découpée : validée automatiquement par le serveur
 */

import "../PuzzleUI/PuzzleLayout.scss";
import {GridSkeleton} from "../PuzzleUI/GridSkeleton.tsx";
import Loader from "../Loader/Loader.tsx";
import "./Shikaku.scss";
import {SuccessPopup} from "../SuccessPopup/SuccessPopup.tsx";
import GameNotice from "../PuzzleUI/GameNotice.tsx";
import GameToolbar from "../PuzzleUI/GameToolbar.tsx";
import GameTimer from "../PuzzleUI/GameTimer.tsx";
import HistoryButtons from "../PuzzleUI/HistoryButtons.tsx";
import {useUndoShortcuts} from "../PuzzleUI/useMoveHistory.ts";
import ErrorsToggle from "../PuzzleUI/ErrorsToggle.tsx";
import {useShowErrors} from "../PuzzleUI/useShowErrors.ts";
import {useGameFlow} from "../PuzzleUI/useGameFlow.ts";
import {useAutoValidate} from "../PuzzleUI/useAutoValidate.ts";
import {useResumableGame} from "../PuzzleUI/savedGame.ts";
import {useDailyGame} from "../PuzzleUI/useDailyGame.ts";
import DailyDonePopup from "../PuzzleUI/DailyDonePopup.tsx";
import {dailyService, formatDailyDate} from "../../Services/daily.service.ts";
import {DAILY_REWARD_MULTIPLIER} from "../../Services/dailyGames.ts";
import {useNavigate} from "react-router-dom";
import {shikakuService} from "../../Services/shikaku.service.ts";
import type {ShikakuPuzzle} from "../../Models/shikaku.model.ts";
import {type SavedShikaku, useShikakuGame} from "./useShikakuGame.ts";
import ShikakuBoard from "./ShikakuBoard.tsx";
import ShikakuSettingsPopup from "./ShikakuSettingsPopup.tsx";

type ShikakuProps = {
    // Défi du jour : grille imposée, pas de popup de paramètres
    daily?: boolean;
    // Défi d'un jour passé, rejoué en partie normale (hors classement) : AAAA-MM-JJ
    replayDate?: string;
};

export default function Shikaku({daily = false, replayDate}: ShikakuProps) {
    const navigate = useNavigate();
    // Grille imposée : défi du jour, ou défi d'un jour passé rejoué
    const challenge = daily || replayDate !== undefined;
    // Sauvegardes séparées (on peut avoir une partie libre et un défi en cours en parallèle)
    const saveKey = replayDate ? `SHIKAKU:replay:${replayDate}` : daily ? "SHIKAKU:daily" : "SHIKAKU";
    const game = useShikakuGame(saveKey);
    const flow = useGameFlow();
    const {resumable, dismissResumable} = useResumableGame<SavedShikaku, ShikakuPuzzle>(saveKey, shikakuService.getGame, !challenge);
    const dailyGame = useDailyGame<SavedShikaku, ShikakuPuzzle>({
        enabled: challenge,
        gameCode: "SHIKAKU",
        saveKey,
        fetchStatus: shikakuService.getGame,
        emptySave: gameId => ({gameId, rects: []}),
        start: replayDate ? () => dailyService.replay("SHIKAKU", replayDate) : undefined,
        onLoad: (puzzle, saved, elapsedMs) => {
            game.restore(puzzle, saved);
            flow.resume(elapsedMs);
        },
    });
    // Grille vide à la taille choisie (ou celle du défi du jour), le temps que la vraie arrive
    const skeletonSize = game.loadingSize ?? dailyGame.loadingSize;
    const playing = !flow.showSettings && !flow.victory && !game.isGenerating;
    const [showErrors, setShowErrors] = useShowErrors();
    const analysis = game.analysis;
    const errorCount = analysis ? analysis.statuses.filter(s => s === "error").length : 0;
    const doneCount = analysis ? analysis.statuses.filter(s => s === "valid").length : 0;
    const total = game.puzzle?.clues.length ?? 0;

    // Grille entièrement découpée en rectangles justes : validée toute seule
    const filledKey = analysis?.solution ? analysis.solution.join(",") : null;
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
            <li>Découpe toute la grille en rectangles (ou en carrés)</li>
            <li>Chaque rectangle contient exactement un nombre</li>
            <li>Ce nombre est l'aire du rectangle : son nombre de cases</li>
        </ul>
    );

    return (
        <div className="puzzle-layout shikaku">
            <GameToolbar
                gameName="Shikaku"
                label={daily ? <>Défi du jour <span className="daily-x2">×{DAILY_REWARD_MULTIPLIER}</span></>
                    : replayDate ? `Défi du ${formatDailyDate(replayDate)}` : undefined}
                clock={flow.clock}
                canUndo={playing && game.canUndo} canRedo={playing && game.canRedo}
                onUndo={game.undo} onRedo={game.redo}
                showErrors={showErrors} onToggleErrors={setShowErrors} errorCount={errorCount}
                rules={rules}
            />

            <div className="options">
                <h2 className="title">Shikaku</h2>
                <p className="shikaku-progress">
                    {total > 0 ? <><strong>{doneCount}</strong> / {total} rectangles justes</> : "–"}
                </p>
                <p className="digit-hint">
                    Glisse d'une case à une autre pour tracer un rectangle ; touche un rectangle pour l'effacer.
                    Un rectangle juste se colore.
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
                <h1 className="title">Shikaku</h1>
                {skeletonSize !== null ? <GridSkeleton size={skeletonSize}/>
                    : dailyGame.loading ? <Loader size="small" label="Chargement du défi…"/>
                    : game.puzzle && analysis && (
                    <ShikakuBoard
                        puzzle={game.puzzle}
                        rects={game.rects}
                        hintCount={game.hintCount}
                        analysis={analysis}
                        disabled={!playing}
                        onDraw={game.drawRect}
                        onErase={game.eraseAt}
                        showErrors={showErrors}
                    />
                )}
            </div>

            <div className="actions">
                <h2 className="title">Actions</h2>
                <GameTimer clock={flow.clock}/>
                <HistoryButtons canUndo={playing && game.canUndo} canRedo={playing && game.canRedo}
                                onUndo={game.undo} onRedo={game.redo}/>
                <ErrorsToggle checked={showErrors} onChange={setShowErrors} count={errorCount}/>
                <GameNotice message={dailyGame.error ?? flow.notice} onClose={flow.clearNotice}/>

                <div className="rules">
                    <h3>Règles</h3>
                    {rules}
                    <p className="rules-keys">Clavier : flèches pour se déplacer, <kbd>Entrée</kbd> pour commencer
                        puis poser un rectangle, <kbd>Suppr</kbd> pour l'effacer</p>
                </div>
            </div>

            <ShikakuSettingsPopup open={!challenge && flow.showSettings} onGenerate={handleGenerate}
                                  resume={resumable ? {elapsedMs: resumable.elapsedMs, onResume: handleResume} : undefined}/>

            {dailyGame.done && <DailyDonePopup gameCode="SHIKAKU" gameName="Shikaku" result={dailyGame.done}/>}

            {flow.victory && (
                <SuccessPopup gameName="Shikaku" xpAwarded={flow.victory.xpAwarded} creditsAwarded={flow.victory.creditsAwarded}
                              rewardMultiplier={flow.victory.rewardMultiplier} before={flow.victory.before}
                              durationMs={flow.victory.durationMs} personalBest={flow.victory.personalBest}
                              daily={flow.victory.daily}
                              onNewGame={replayDate ? () => navigate("/defi")
                                  : daily ? () => navigate(`/playgame/SHIKAKU`) : flow.newGame}
                              newGameLabel={replayDate ? "Autres défis" : daily ? "Partie libre" : undefined}/>
            )}
        </div>
    );
}
