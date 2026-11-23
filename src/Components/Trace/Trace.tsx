/**
 * Composant Tracé - relier les numéros dans l'ordre par un seul chemin qui passe par toutes les cases
 *
 * - À l'ouverture : popup de paramètres (taille de grille, numéros donnés en plus, XP gagnée)
 * - Plateau : on trace le chemin au doigt ou à la souris depuis le 1 ; revenir en arrière l'efface
 * - Panneau de gauche : cases couvertes, prochain numéro, et comment jouer
 * - Panneau de droite : chrono, annuler / rétablir, rappel des règles
 * - Chemin complet et juste : validé automatiquement par le serveur
 */

import "../PuzzleUI/PuzzleLayout.scss";
import {GridSkeleton, SkeletonLabel} from "../PuzzleUI/GridSkeleton.tsx";
import Loader from "../Loader/Loader.tsx";
import "./Trace.scss";
import {SuccessPopup} from "../SuccessPopup/SuccessPopup.tsx";
import GameNotice from "../PuzzleUI/GameNotice.tsx";
import GameToolbar from "../PuzzleUI/GameToolbar.tsx";
import GameTimer from "../PuzzleUI/GameTimer.tsx";
import HistoryButtons from "../PuzzleUI/HistoryButtons.tsx";
import {useUndoShortcuts} from "../PuzzleUI/useMoveHistory.ts";
import {useGameFlow} from "../PuzzleUI/useGameFlow.ts";
import {useAutoValidate} from "../PuzzleUI/useAutoValidate.ts";
import {useResumableGame} from "../PuzzleUI/savedGame.ts";
import {useDailyGame} from "../PuzzleUI/useDailyGame.ts";
import DailyDonePopup from "../PuzzleUI/DailyDonePopup.tsx";
import {dailyService, formatDailyDate} from "../../Services/daily.service.ts";
import {challengeService} from "../../Services/challenge.service.ts";
import LevelVictory, {type LevelInfo} from "../Levels/LevelVictory.tsx";
import {levelsService} from "../../Services/levels.service.ts";
import {DAILY_REWARD_MULTIPLIER} from "../../Services/dailyGames.ts";
import {Link, useNavigate} from "react-router-dom";
import "../Levels/Levels.scss";
import {traceService} from "../../Services/trace.service.ts";
import type {TracePuzzle} from "../../Models/trace.model.ts";
import {type SavedTrace, useTraceGame} from "./useTraceGame.ts";
import {lastValue, nextValue} from "./traceRules.ts";
import TraceBoard from "./TraceBoard.tsx";
import TraceSettingsPopup from "./TraceSettingsPopup.tsx";
import {levelName} from "../Levels/worlds.ts";

type TraceProps = {
    // Défi du jour : grille imposée, pas de popup de paramètres
    daily?: boolean;
    // Défi d'un jour passé, rejoué en partie normale (hors classement) : AAAA-MM-JJ
    replayDate?: string;
    // Défi d'un·e ami·e : sa grille, à faire à son tour (partie normale, hors classement)
    challengeId?: string;
    // Mode Niveaux : numéro du niveau (après le tutoriel guidé), nombre de niveaux et du tutoriel
    level?: number;
    levelInfo?: LevelInfo;
};

export default function Trace({daily = false, replayDate, challengeId, level, levelInfo}: TraceProps) {
    const navigate = useNavigate();
    const challenge = daily || replayDate !== undefined || challengeId !== undefined || level !== undefined;
    const saveKey = level ? `TRACE:level:${level}` : challengeId ? `TRACE:challenge:${challengeId}` : replayDate ? `TRACE:replay:${replayDate}` : daily ? "TRACE:daily" : "TRACE";
    const game = useTraceGame(saveKey);
    const flow = useGameFlow("TRACE", challenge);
    const {resumable, dismissResumable} = useResumableGame<SavedTrace, TracePuzzle>(saveKey, traceService.getGame, !challenge);
    const dailyGame = useDailyGame<SavedTrace, TracePuzzle>({
        enabled: challenge,
        gameCode: "TRACE",
        saveKey,
        fetchStatus: traceService.getGame,
        emptySave: gameId => ({gameId, path: []}),
        start: level ? () => levelsService.start("TRACE", level)
            : challengeId ? () => challengeService.start(challengeId)
            : replayDate ? () => dailyService.replay("TRACE", replayDate) : undefined,
        onLoad: (puzzle, saved, elapsedMs) => {
            game.restore(puzzle, saved);
            flow.resume(elapsedMs);
        },
    });
    const skeletonSize = game.loadingSize ?? dailyGame.loadingSize;
    const playing = !flow.showSettings && !flow.victory && !game.isGenerating;

    // Chemin complet et juste : validé tout seul
    useAutoValidate({
        filledKey: game.solution ? game.solution.join(",") : null, playing, hasErrors: false,
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

    const total = game.puzzle ? game.puzzle.size * game.puzzle.size : 0;
    const next = game.puzzle ? nextValue(game.puzzle, game.path) : 0;
    const last = game.puzzle ? lastValue(game.puzzle) : 0;

    const rules = (
        <ul>
            <li>Relie les numéros dans l'ordre (1, 2, 3…) par un seul chemin</li>
            <li>Le chemin passe par toutes les cases, une seule fois chacune</li>
            <li>Il avance de case en case (haut, bas, gauche, droite), jamais à travers un mur</li>
            <li>Il commence sur le 1 et finit sur le dernier numéro</li>
        </ul>
    );

    return (
        <div className="puzzle-layout trace">
            <GameToolbar
                gameName="Tracé"
                label={level ? levelName(level) : daily ? <>Défi du jour <span className="daily-x2">×{DAILY_REWARD_MULTIPLIER}</span></>
                    : replayDate ? `Défi du ${formatDailyDate(replayDate)}` : challengeId ? "Défi d'un·e ami·e" : undefined}
                clock={flow.clock}
                canUndo={playing && game.canUndo} canRedo={playing && game.canRedo}
                onUndo={game.undo} onRedo={game.redo}
                rules={rules}
            />

            <div className="options">
                <h2 className="title">Tracé</h2>
                {!challenge && (
                    <p className="queens-levels-link"><Link to="/niveaux/TRACE">Mode niveaux (avec tutoriel) →</Link></p>
                )}
                <p className="trace-progress">
                    {total > 0 ? <><strong>{game.path.length}</strong> / {total} cases</> : "–"}
                </p>
                {total > 0 && (
                    <p className="trace-next">
                        {game.solution ? "Chemin complet !" : next > last ? "Couvre les dernières cases" : <>Prochain numéro : <strong>{next}</strong></>}
                    </p>
                )}
                <p className="digit-hint">
                    Pars du 1 et glisse de case en case. Reviens sur tes pas pour effacer, ou touche une case du chemin
                    pour le couper là.
                </p>
            </div>

            <div className="game">
                {daily && (
                    <p className="daily-label">
                        Défi du jour{dailyGame.date ? ` · ${formatDailyDate(dailyGame.date)}` : ""}
                        <span className="daily-x2">XP et crédits ×{DAILY_REWARD_MULTIPLIER}</span>
                    </p>
                )}
                {replayDate && <p className="daily-label">Défi du {formatDailyDate(replayDate)} · hors classement</p>}
                {challengeId && <p className="daily-label">Défi d'un·e ami·e · la même grille, à toi de jouer</p>}
                {level && (
                    <p className="daily-label level-label">
                        <Link to="/niveaux/TRACE">Niveaux</Link> · {levelName(level)}
                    </p>
                )}
                <h1 className="title">Tracé</h1>
                {skeletonSize !== null ? <GridSkeleton size={skeletonSize}/>
                    : dailyGame.loading ? <Loader size="small" label="Chargement du défi…"/>
                    : game.puzzle && (
                        <TraceBoard puzzle={game.puzzle} path={game.path} walls={game.walls} disabled={!playing}
                                    solved={game.solution !== null}
                                    onBegin={game.begin} onEnter={game.enter} onEnd={game.end} onStep={game.step}/>
                    )}
                {flow.validating && <SkeletonLabel label="Vérification…"/>}
            </div>

            <div className="actions">
                <h2 className="title">Actions</h2>
                <GameTimer clock={flow.clock}/>
                <HistoryButtons canUndo={playing && game.canUndo} canRedo={playing && game.canRedo}
                                onUndo={game.undo} onRedo={game.redo}
                                onReset={game.clear} canReset={playing && game.hasInput}/>
                <GameNotice message={dailyGame.error ?? flow.notice} onClose={flow.clearNotice}/>

                <div className="rules">
                    <h3>Règles</h3>
                    {rules}
                    <p className="rules-keys">Clavier : flèches pour avancer depuis le bout du chemin, ou reculer</p>
                </div>
            </div>

            <TraceSettingsPopup open={!challenge && flow.showSettings} onGenerate={handleGenerate}
                                resume={resumable ? {elapsedMs: resumable.elapsedMs, onResume: handleResume} : undefined}/>

            {dailyGame.done && !level && <DailyDonePopup gameCode="TRACE" gameName="Tracé" result={dailyGame.done}/>}

            {level !== undefined && <LevelVictory gameCode="TRACE" gameName="Tracé" level={level} info={levelInfo} victory={flow.victory}/>}

            {flow.victory && level === undefined && (
                <SuccessPopup gameName="Tracé" gameCode="TRACE" xpAwarded={flow.victory.xpAwarded} creditsAwarded={flow.victory.creditsAwarded}
                              rewardMultiplier={flow.victory.rewardMultiplier} streak={flow.victory.streak} before={flow.victory.before}
                              durationMs={flow.victory.durationMs} personalBest={flow.victory.personalBest}
                              daily={flow.victory.daily}
                              challengeId={challengeId}
                              defy={replayDate || challengeId ? undefined : daily ? "daily" : "free"}
                              onNewGame={challengeId ? () => navigate(`/playgame/TRACE`)
                                  : replayDate ? () => navigate("/defi")
                                  : daily ? () => navigate(`/playgame/TRACE`) : flow.newGame}
                              newGameLabel={replayDate ? "Autres défis" : daily || challengeId ? "Partie libre" : undefined}
                              back={replayDate ? null : daily ? "daily" : "home"}/>
            )}
        </div>
    );
}
