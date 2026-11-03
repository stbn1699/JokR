/**
 * Composant Tectonic (Suguru) - grille découpée en zones de 1 à 5 cases
 *
 * - À l'ouverture : popup de paramètres (taille de grille, cases à remplir, XP gagnée)
 * - Panneau de gauche : nombres restants à placer, clic pour remplir la case ou surligner le nombre
 *   (ou y ajouter une note au crayon en mode notes, touche N)
 * - Grille : saisie au clavier, zone de la case sélectionnée éclaircie
 * - Panneau de droite : chrono, annuler / rétablir, erreurs et rappel des règles
 * - Grille remplie : validée automatiquement par le serveur
 * - Victoire : popup avec la barre d'XP ; "Nouvelle partie" rouvre les paramètres sans recharger
 */

import {useEffect, useMemo, useState} from "react";
import "../PuzzleUI/PuzzleLayout.scss";
import {GridSkeleton, SkeletonLabel} from "../PuzzleUI/GridSkeleton.tsx";
import Loader from "../Loader/Loader.tsx";
import "./Tectonic.scss";
import {SuccessPopup} from "../SuccessPopup/SuccessPopup.tsx";
import DigitPanel from "../PuzzleUI/DigitPanel.tsx";
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
import {tectonicService} from "../../Services/tectonic.service.ts";
import type {TectonicPuzzle} from "../../Models/tectonic.model.ts";
import {type SavedTectonic, useTectonicGame} from "./useTectonicGame.ts";
import {expectedCounts, regionSizes, tectonicConflicts} from "./tectonicRules.ts";
import TectonicGrid from "./TectonicGrid.tsx";
import TectonicSettingsPopup from "./TectonicSettingsPopup.tsx";

type TectonicProps = {
    // Défi du jour : grille imposée, pas de popup de paramètres
    daily?: boolean;
    // Défi d'un jour passé, rejoué en partie normale (hors classement) : AAAA-MM-JJ
    replayDate?: string;
};

export default function Tectonic({daily = false, replayDate}: TectonicProps) {
    const navigate = useNavigate();
    // Grille imposée : défi du jour, ou défi d'un jour passé rejoué
    const challenge = daily || replayDate !== undefined;
    // Sauvegardes séparées (on peut avoir une partie libre et un défi en cours en parallèle)
    const saveKey = replayDate ? `TECTONIC:replay:${replayDate}` : daily ? "TECTONIC:daily" : "TECTONIC";
    const game = useTectonicGame(saveKey);
    const flow = useGameFlow();
    const {resumable, dismissResumable} = useResumableGame<SavedTectonic, TectonicPuzzle>(saveKey, tectonicService.getGame, !challenge);
    const dailyGame = useDailyGame<SavedTectonic, TectonicPuzzle>({
        enabled: challenge,
        gameCode: "TECTONIC",
        saveKey,
        fetchStatus: tectonicService.getGame,
        emptySave: gameId => ({gameId, values: []}),
        start: replayDate ? () => dailyService.replay("TECTONIC", replayDate) : undefined,
        onLoad: (puzzle, saved, elapsedMs) => {
            game.restore(puzzle, saved);
            flow.resume(elapsedMs);
        },
    });
    const [selectedCell, setSelectedCell] = useState<number | null>(null);
    const [selectedDigit, setSelectedDigit] = useState<number | null>(null);
    const [notesMode, setNotesMode] = useState(false);
    // Grille vide à la taille choisie (ou celle du défi du jour), le temps que la vraie arrive
    const skeletonSize = game.loadingSize ?? dailyGame.loadingSize;
    const playing = !flow.showSettings && !flow.victory && !game.isGenerating;
    const [showErrors, setShowErrors] = useShowErrors();
    const conflicts = useMemo(() => tectonicConflicts(game.values, game.puzzle), [game.values, game.puzzle]);
    // Grille remplie : validée toute seule (sans appel au serveur si elle contient une erreur)
    const filledKey = game.values.length > 0 && game.values.every(v => v !== null) ? game.values.join("") : null;
    useAutoValidate({
        filledKey, playing, hasErrors: conflicts.size > 0,
        submit: () => flow.submit(game.validate), setNotice: flow.setNotice,
    });
    useUndoShortcuts(game.undo, game.redo, playing);

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
    }, [playing]);

    // Nombres proposés : de 1 à la taille de la plus grande zone
    const maxRegion = useMemo(() => (game.puzzle ? Math.max(...regionSizes(game.puzzle.regions)) : 5), [game.puzzle]);
    const digits = useMemo(() => Array.from({length: maxRegion}, (_, k) => k + 1), [maxRegion]);
    const expected = useMemo(() => expectedCounts(game.puzzle), [game.puzzle]);
    const counts = useMemo(() => {
        const c: Record<number, number> = {};
        for (const v of game.values) if (v !== null) c[v] = (c[v] ?? 0) + 1;
        return c;
    }, [game.values]);

    // Case sélectionnée modifiable (pas un nombre donné)
    const editableSelection = selectedCell !== null && !game.isClue(selectedCell) ? selectedCell : null;

    // Panneau : remplit la case sélectionnée (ou y note le nombre en mode notes), sinon surligne le nombre
    const handleDigit = (n: number) => {
        if (editableSelection !== null && notesMode) game.toggleNoteAt(editableSelection, n);
        else if (editableSelection !== null) game.setCell(editableSelection, n);
        else setSelectedDigit(current => (current === n ? null : n));
    };

    const handleResume = () => {
        if (!resumable) return;
        setSelectedDigit(null);
        game.restore(resumable.grid, resumable.saved);
        flow.resume(resumable.elapsedMs + Date.now() - resumable.checkedAt);
        dismissResumable();
    };

    const handleGenerate = (size: number, emptyCells: number) => {
        dismissResumable();
        setSelectedDigit(null);
        void flow.generate(() => game.generate(size, emptyCells));
    };

    const rules = (
        <ul>
            <li>Une zone de n cases contient les nombres de 1 à n, une fois chacun</li>
            <li>Deux cases qui se touchent, même en diagonale, n'ont jamais le même nombre</li>
            <li>Mode notes (✏) : pour noter les nombres possibles en petit dans une case</li>
        </ul>
    );

    return (
        <div className="puzzle-layout tectonic">
            <GameToolbar
                gameName="Tectonic"
                label={daily ? <>Défi du jour <span className="daily-x2">×{DAILY_REWARD_MULTIPLIER}</span></>
                    : replayDate ? `Défi du ${formatDailyDate(replayDate)}` : undefined}
                clock={flow.clock}
                canUndo={playing && game.canUndo} canRedo={playing && game.canRedo}
                onUndo={game.undo} onRedo={game.redo}
                showErrors={showErrors} onToggleErrors={setShowErrors} errorCount={conflicts.size}
                rules={rules}
            />
            <DigitPanel
                digits={digits}
                perDigit={expected}
                counts={counts}
                selected={selectedDigit}
                onSelect={handleDigit}
                onErase={() => editableSelection !== null && game.setCell(editableSelection, null)}
                notes={{active: notesMode, onToggle: () => setNotesMode(m => !m)}}
            />

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
                <h1 className="title">Tectonic</h1>
                {skeletonSize !== null ? <GridSkeleton size={skeletonSize}/>
                    : dailyGame.loading ? <Loader size="small" label="Chargement du défi…"/>
                    : game.puzzle && (
                    <TectonicGrid
                        puzzle={game.puzzle}
                        values={game.values}
                        isClue={game.isClue}
                        revealed={game.revealed}
                        disabled={game.isGenerating}
                        selectedCell={selectedCell}
                        onSelectCell={setSelectedCell}
                        highlightDigit={selectedDigit}
                        onSetCell={game.setCell}
                        errors={showErrors ? conflicts : null}
                        notes={game.notes}
                        notesMode={notesMode}
                        onToggleNote={game.toggleNoteAt}
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
                <GameNotice message={dailyGame.error ?? flow.notice} onClose={flow.clearNotice}/>

                <div className="rules">
                    <h3>Règles</h3>
                    {rules}
                    <p className="rules-keys">Clavier : <kbd>1</kbd>…<kbd>5</kbd> pour remplir, <kbd>⌫</kbd> pour
                        vider, flèches pour se déplacer, <kbd>N</kbd> pour le mode notes</p>
                </div>
            </div>

            <TectonicSettingsPopup open={!challenge && flow.showSettings} onGenerate={handleGenerate}
                                   resume={resumable ? {elapsedMs: resumable.elapsedMs, onResume: handleResume} : undefined}/>

            {dailyGame.done && <DailyDonePopup gameCode="TECTONIC" gameName="Tectonic" result={dailyGame.done}/>}

            {flow.victory && (
                <SuccessPopup gameName="Tectonic" xpAwarded={flow.victory.xpAwarded} creditsAwarded={flow.victory.creditsAwarded}
                              rewardMultiplier={flow.victory.rewardMultiplier} before={flow.victory.before}
                              durationMs={flow.victory.durationMs} personalBest={flow.victory.personalBest}
                              daily={flow.victory.daily}
                              onNewGame={replayDate ? () => navigate("/defi")
                                  : daily ? () => navigate(`/playgame/TECTONIC`) : flow.newGame}
                              newGameLabel={replayDate ? "Autres défis" : daily ? "Partie libre" : undefined}/>
            )}
        </div>
    );
}
