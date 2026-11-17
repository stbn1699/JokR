/**
 * Composant Queens - une dame par ligne, par colonne et par zone de couleur, sans qu'elles se touchent
 *
 * - À l'ouverture : popup de paramètres (taille de grille, dames déjà placées en aide, XP gagnée)
 * - Plateau : un appui met une croix, un 2e appui en fait une dame, un 3e vide la case ;
 *   glisser sur plusieurs cases y met des croix
 * - Panneau de gauche : dames placées, et comment jouer
 * - Panneau de droite : chrono, annuler / rétablir, erreurs et rappel des règles
 * - Toutes les dames bien placées : validé automatiquement par le serveur
 * - Mode Niveaux (`level`, niveaux après le tutoriel guidé) : grille du niveau, « Niveau suivant » à la victoire ;
 *   au premier niveau après le tutoriel, une visite de l'écran (panneaux, outils) avant de lancer la grille
 */

import "../PuzzleUI/PuzzleLayout.scss";
import {GridSkeleton, SkeletonLabel} from "../PuzzleUI/GridSkeleton.tsx";
import Loader from "../Loader/Loader.tsx";
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
import {challengeService} from "../../Services/challenge.service.ts";
import {DAILY_REWARD_MULTIPLIER} from "../../Services/dailyGames.ts";
import {Link, useNavigate} from "react-router-dom";
import {useEffect, useState} from "react";
import {useAuth} from "../../Context/authContext.ts";
import {levelsService, rememberGuestLevel} from "../../Services/levels.service.ts";
import LevelTour, {type TourStep} from "../Levels/LevelTour.tsx";
import "../Levels/Levels.scss";
import {queensService} from "../../Services/queens.service.ts";
import type {QueensPuzzle} from "../../Models/queens.model.ts";
import {type SavedQueens, useQueensGame} from "./useQueensGame.ts";
import {autoCrossCells, QUEEN, queensConflicts} from "./queensRules.ts";
import QueensBoard from "./QueensBoard.tsx";
import QueensSettingsPopup from "./QueensSettingsPopup.tsx";
import {worldOpenedBy} from "../Levels/worlds.ts";

// Visite de l'écran de jeu (premier niveau après le tutoriel)
const TOUR_KEY = "jokr:levels:QUEENS:tour";
const tourSeen = () => {
    try {
        return localStorage.getItem(TOUR_KEY) === "1";
    } catch {
        return false;
    }
};
const rememberTour = () => {
    try {
        localStorage.setItem(TOUR_KEY, "1");
    } catch {
        // stockage indisponible : la visite pourra revenir
    }
};
const TOUR: TourStep[] = [
    {selector: ".puzzle-layout .options", text: "À gauche : ton avancement (dames posées) et le rappel des gestes."},
    {selector: ".puzzle-layout .actions", text: "À droite : le chrono, annuler / rétablir, et des aides : les coups interdits en rouge, les croix automatiques et les règles."},
    {selector: ".game-toolbar", text: "En haut : le chrono, annuler / rétablir, et des aides : les coups interdits, les croix automatiques et les règles."},
    {selector: ".puzzle-layout .game", text: "Fini les leçons : cette fois tu joues seul·e, et le chrono compte. Bonne chance !"},
];

type QueensProps = {
    // Défi du jour : grille imposée, pas de popup de paramètres
    daily?: boolean;
    // Défi d'un jour passé, rejoué en partie normale (hors classement) : AAAA-MM-JJ
    replayDate?: string;
    // Défi d'un·e ami·e : sa grille, à faire à son tour (partie normale, hors classement)
    challengeId?: string;
    // Mode Niveaux : numéro du niveau, et nombre de niveaux / du tutoriel (null tant qu'inconnus)
    level?: number;
    levelInfo?: { count: number | null; tutorial: number | null };
};

export default function Queens({daily = false, replayDate, challengeId, level, levelInfo}: QueensProps) {
    const navigate = useNavigate();
    const {isLoggedIn, adminMode} = useAuth();
    // Visite de l'écran : au premier niveau après le tutoriel, une seule fois (retenue dans le navigateur)
    const [touring, setTouring] = useState(() => level !== undefined && levelInfo?.tutorial !== null
        && levelInfo?.tutorial !== undefined && level === levelInfo.tutorial + 1 && !tourSeen());
    const endTour = () => {
        rememberTour();
        setTouring(false);
    };
    // Grille imposée : défi du jour, défi d'un jour passé rejoué, défi d'un·e ami·e ou niveau
    const challenge = daily || replayDate !== undefined || challengeId !== undefined || level !== undefined;
    // Sauvegardes séparées (on peut avoir une partie libre et un défi en cours en parallèle)
    const saveKey = level ? `QUEENS:level:${level}` : challengeId ? `QUEENS:challenge:${challengeId}` : replayDate ? `QUEENS:replay:${replayDate}` : daily ? "QUEENS:daily" : "QUEENS";
    const game = useQueensGame(saveKey);
    const flow = useGameFlow("QUEENS", challenge);
    const {resumable, dismissResumable} = useResumableGame<SavedQueens, QueensPuzzle>(saveKey, queensService.getGame, !challenge);
    const dailyGame = useDailyGame<SavedQueens, QueensPuzzle>({
        // premier niveau après le tutoriel : la grille n'est lancée (et le chrono ne part) qu'après la visite
        enabled: challenge && !touring,
        gameCode: "QUEENS",
        saveKey,
        fetchStatus: queensService.getGame,
        emptySave: gameId => ({gameId, marks: []}),
        start: level ? () => levelsService.start("QUEENS", level)
            : challengeId ? () => challengeService.start(challengeId)
            : replayDate ? () => dailyService.replay("QUEENS", replayDate) : undefined,
        onLoad: (puzzle, saved, elapsedMs) => {
            game.restore(puzzle, saved);
            flow.resume(elapsedMs);
        },
    });
    // Grille vide à la taille choisie (ou celle du défi du jour), le temps que la vraie arrive
    const skeletonSize = game.loadingSize ?? dailyGame.loadingSize;
    const playing = !flow.showSettings && !flow.victory && !game.isGenerating;
    const [showErrors, setShowErrors] = useShowErrors();
    const conflicts = useMemo(() => queensConflicts(game.marks, game.puzzle), [game.marks, game.puzzle]);
    // Option : croix automatiques sur les cases interdites par les dames posées (retenue dans le navigateur)
    const [autoCross, setAutoCross] = useStoredFlag("jokr:queens:autoCrosses");
    const autoCrosses = useMemo(() => (autoCross ? autoCrossCells(game.marks, game.puzzle) : null),
        [autoCross, game.marks, game.puzzle]);
    const placed = game.marks.filter(m => m === QUEEN).length;

    // Mode Niveaux : fin de partie (invité : progression gardée dans ce navigateur)
    const isLastLevel = level !== undefined && levelInfo?.count !== null && levelInfo?.count !== undefined && level >= levelInfo.count;
    // dernier niveau d'un monde : pas de « Niveau suivant », on part fêter le nouveau monde sur la carte
    const worldOpened = level === undefined ? null : worldOpenedBy(level, levelInfo?.count);
    useEffect(() => {
        if (level && flow.victory && !isLoggedIn) rememberGuestLevel("QUEENS", level);
    }, [level, flow.victory, isLoggedIn]);
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
                label={level ? `Niveau ${level}` : daily ? <>Défi du jour <span className="daily-x2">×{DAILY_REWARD_MULTIPLIER}</span></>
                    : replayDate ? `Défi du ${formatDailyDate(replayDate)}` : challengeId ? "Défi d'un·e ami·e" : undefined}
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
                {level === undefined && !challenge && (
                    <p className="queens-levels-link"><Link to="/niveaux/QUEENS">Mode niveaux (avec tutoriel) →</Link></p>
                )}
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
                {challengeId && <p className="daily-label">Défi d'un·e ami·e · la même grille, à toi de jouer</p>}
                {level && (
                    <p className="daily-label level-label">
                        <Link to="/niveaux/QUEENS">Niveaux</Link> · Niveau {level}{levelInfo?.count ? ` sur ${levelInfo.count}` : ""}
                    </p>
                )}
                <h1 className="title">Queens</h1>
                {skeletonSize !== null ? <GridSkeleton size={skeletonSize}/>
                    : dailyGame.loading ? <Loader size="small" label="Chargement du défi…"/>
                    : game.puzzle && (
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
                {/* Grille envoyée au serveur : il ne se passe pas « rien » */}
                {flow.validating && <SkeletonLabel label="Vérification…"/>}
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

            {touring && <LevelTour steps={TOUR} onDone={endTour}/>}

            {dailyGame.done && !level && <DailyDonePopup gameCode="QUEENS" gameName="Queens" result={dailyGame.done}/>}

            {flow.victory && level !== undefined && (
                <SuccessPopup gameName="Queens" gameCode="QUEENS" xpAwarded={flow.victory.xpAwarded} creditsAwarded={flow.victory.creditsAwarded}
                              rewardMultiplier={1} before={flow.victory.before}
                              durationMs={flow.victory.durationMs} personalBest={flow.victory.personalBest}
                              title={`Niveau ${level} réussi !`}
                              subtitle="Bien joué, la grille est résolue."
                              noXpNote={adminMode ? "Mode admin : rien n'est enregistré." : isLoggedIn ? "Niveau déjà réussi : l'XP et les crédits ne sont donnés qu'à la première réussite." : undefined}
                              onNewGame={isLastLevel ? () => navigate("/niveaux/QUEENS")
                                  : worldOpened !== null ? () => navigate("/niveaux/QUEENS", {state: {worldOpened}})
                                      : () => navigate(`/niveaux/QUEENS/${level + 1}`)}
                              newGameLabel={isLastLevel ? "Carte des niveaux" : worldOpened !== null ? "Monde suivant" : "Niveau suivant"}
                              extraAction={isLastLevel ? {label: "Grille aléatoire", onClick: () => navigate("/playgame/QUEENS")} : undefined}
                              back={{to: "/niveaux/QUEENS", label: "Carte des niveaux", short: "Carte"}}/>
            )}

            {flow.victory && level === undefined && (
                <SuccessPopup gameName="Queens" gameCode="QUEENS" xpAwarded={flow.victory.xpAwarded} creditsAwarded={flow.victory.creditsAwarded}
                              rewardMultiplier={flow.victory.rewardMultiplier} before={flow.victory.before}
                              durationMs={flow.victory.durationMs} personalBest={flow.victory.personalBest}
                              daily={flow.victory.daily}
                              challengeId={challengeId}
                              defy={replayDate || challengeId ? undefined : daily ? "daily" : "free"}
                              onNewGame={challengeId ? () => navigate(`/playgame/QUEENS`)
                                  : replayDate ? () => navigate("/defi")
                                  : daily ? () => navigate(`/playgame/QUEENS`) : flow.newGame}
                              newGameLabel={replayDate ? "Autres défis" : daily || challengeId ? "Partie libre" : undefined}
                              back={replayDate ? null : daily ? "daily" : "home"}/>
            )}
        </div>
    );
}
