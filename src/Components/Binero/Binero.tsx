/**
 * Composant Binero (Takuzu) - grille de 0 et de 1
 *
 * - À l'ouverture : popup de paramètres (taille de grille, cases à remplir, XP gagnée)
 * - Panneau de gauche : 0 et 1 restants à placer, clic pour les surligner dans la grille
 * - Grille : saisie au clavier, ligne et colonne de la case sélectionnée éclaircies
 * - Panneau de droite : validation côté serveur, messages d'erreur et rappel des règles
 * - Victoire : popup avec la barre d'XP ; "Nouvelle partie" rouvre les paramètres sans recharger
 */

import {useMemo, useState} from "react";
import "../PuzzleUI/PuzzleLayout.scss";
import {GridSkeleton, SkeletonLabel} from "../PuzzleUI/GridSkeleton.tsx";
import Loader from "../Loader/Loader.tsx";
import "./Binero.scss";
import {SuccessPopup} from "../SuccessPopup/SuccessPopup.tsx";
import DigitPanel from "../PuzzleUI/DigitPanel.tsx";
import GameNotice from "../PuzzleUI/GameNotice.tsx";
import GameToolbar from "../PuzzleUI/GameToolbar.tsx";
import GameTimer from "../PuzzleUI/GameTimer.tsx";
import HistoryButtons from "../PuzzleUI/HistoryButtons.tsx";
import {useUndoShortcuts} from "../PuzzleUI/useMoveHistory.ts";
import ErrorsToggle from "../PuzzleUI/ErrorsToggle.tsx";
import {useShowErrors} from "../PuzzleUI/useShowErrors.ts";
import {bineroConflicts} from "./bineroRules.ts";
import {useGameFlow} from "../PuzzleUI/useGameFlow.ts";
import {useAutoValidate} from "../PuzzleUI/useAutoValidate.ts";
import {type SavedBinero, useBineroGame} from "./useBineroGame.ts";
import {useResumableGame} from "../PuzzleUI/savedGame.ts";
import {useDailyGame} from "../PuzzleUI/useDailyGame.ts";
import DailyDonePopup from "../PuzzleUI/DailyDonePopup.tsx";
import {dailyService, formatDailyDate} from "../../Services/daily.service.ts";
import {DAILY_REWARD_MULTIPLIER} from "../../Services/dailyGames.ts";
import {useNavigate} from "react-router-dom";
import {bineroService} from "../../Services/binero.service.ts";
import type {BineroCell} from "../../Models/bineroSettings.model.ts";
import BineroGrid from "./BineroGrid.tsx";
import BineroSettingsPopup from "./BineroSettingsPopup.tsx";

const DIGITS = [0, 1];

type BineroProps = {
    // Défi du jour : grille imposée, pas de popup de paramètres
    daily?: boolean;
    // Défi d'un jour passé, rejoué en partie normale (hors classement) : AAAA-MM-JJ
    replayDate?: string;
};

export default function Binero({daily = false, replayDate}: BineroProps) {
    const navigate = useNavigate();
    // Grille imposée : défi du jour, ou défi d'un jour passé rejoué
    const challenge = daily || replayDate !== undefined;
    // Sauvegardes séparées (on peut avoir une partie libre et un défi en cours en parallèle)
    const saveKey = replayDate ? `BINERO:replay:${replayDate}` : daily ? "BINERO:daily" : "BINERO";
    const game = useBineroGame(saveKey);
    const flow = useGameFlow();
    const {resumable, dismissResumable} = useResumableGame<SavedBinero, BineroCell[][]>(saveKey, bineroService.getGame, !challenge);
    const dailyGame = useDailyGame<SavedBinero, BineroCell[][]>({
        enabled: challenge,
        gameCode: "BINERO",
        saveKey,
        fetchStatus: bineroService.getGame,
        emptySave: gameId => ({gameId, size: 0, values: []}),
        start: replayDate ? () => dailyService.replay("BINERO", replayDate) : undefined,
        onLoad: (grid, saved, elapsedMs) => {
            game.restore(grid, saved);
            flow.resume(elapsedMs);
        },
    });
    const [selectedCell, setSelectedCell] = useState<number | null>(null);
    const [selectedDigit, setSelectedDigit] = useState<number | null>(null);
    // Grille vide à la taille choisie (ou celle du défi du jour), le temps que la vraie arrive
    const skeletonSize = game.loadingSize ?? dailyGame.loadingSize;
    const playing = !flow.showSettings && !flow.victory && !game.isGenerating;
    const [showErrors, setShowErrors] = useShowErrors();
    const conflicts = useMemo(() => bineroConflicts(game.values, game.size), [game.values, game.size]);
    // Grille remplie : validée toute seule (sans appel au serveur si elle contient une erreur)
    const filledKey = game.values.length > 0 && game.values.every(v => v !== null) ? game.values.join("") : null;
    useAutoValidate({
        filledKey, playing, hasErrors: conflicts.size > 0,
        submit: () => flow.submit(game.validate), setNotice: flow.setNotice,
    });
    useUndoShortcuts(game.undo, game.redo, playing);

    // Case sélectionnée modifiable (pas un chiffre donné)
    const editableSelection = selectedCell !== null && !game.isClue(selectedCell) ? selectedCell : null;

    // Panneau : remplit la case sélectionnée, sinon surligne le chiffre dans la grille
    const handleDigit = (n: number) => {
        if (editableSelection !== null) game.setCell(editableSelection, n as 0 | 1);
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
            <li>Jamais trois 0 ou trois 1 côte à côte</li>
            <li>Autant de 0 que de 1 sur chaque ligne et chaque colonne</li>
            <li>Deux lignes (ou deux colonnes) ne peuvent pas être identiques</li>
        </ul>
    );

    return (
        <div className="puzzle-layout binero">
            <GameToolbar
                gameName="Binero"
                label={daily ? <>Défi du jour <span className="daily-x2">×{DAILY_REWARD_MULTIPLIER}</span></>
                    : replayDate ? `Défi du ${formatDailyDate(replayDate)}` : undefined}
                clock={flow.clock}
                canUndo={playing && game.canUndo} canRedo={playing && game.canRedo}
                onUndo={game.undo} onRedo={game.redo}
                showErrors={showErrors} onToggleErrors={setShowErrors} errorCount={conflicts.size}
                rules={rules}
            />
            <DigitPanel
                digits={DIGITS}
                perDigit={(game.size * game.size) / 2}
                counts={game.counts}
                selected={selectedDigit}
                onSelect={handleDigit}
                onErase={() => editableSelection !== null && game.setCell(editableSelection, null)}
                columns={2}
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
                <h1 className="title">Binero</h1>
                {skeletonSize !== null ? <GridSkeleton size={skeletonSize}/>
                    : dailyGame.loading ? <Loader size="small" label="Chargement du défi…"/>
                    : game.size > 0 && (
                    <BineroGrid
                        size={game.size}
                        values={game.values}
                        isClue={game.isClue}
                        revealed={game.revealed}
                        disabled={game.isGenerating}
                        selectedCell={selectedCell}
                        onSelectCell={setSelectedCell}
                        highlightDigit={selectedDigit}
                        onSetCell={game.setCell}
                        errors={showErrors ? conflicts : null}
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
                    <p className="rules-keys">Clavier : <kbd>0</kbd> <kbd>1</kbd> pour remplir, <kbd>⌫</kbd> pour
                        vider, flèches pour se déplacer</p>
                </div>
            </div>

            <BineroSettingsPopup open={!challenge && flow.showSettings} onGenerate={handleGenerate}
                                 resume={resumable ? {elapsedMs: resumable.elapsedMs, onResume: handleResume} : undefined}/>

            {dailyGame.done && <DailyDonePopup gameCode="BINERO" gameName="Binero" result={dailyGame.done}/>}

            {flow.victory && (
                <SuccessPopup gameName="Binero" gameCode="BINERO" xpAwarded={flow.victory.xpAwarded} creditsAwarded={flow.victory.creditsAwarded}
                              rewardMultiplier={flow.victory.rewardMultiplier} before={flow.victory.before}
                              durationMs={flow.victory.durationMs} personalBest={flow.victory.personalBest}
                              daily={flow.victory.daily}
                              onNewGame={replayDate ? () => navigate("/defi")
                                  : daily ? () => navigate(`/playgame/BINERO`) : flow.newGame}
                              newGameLabel={replayDate ? "Autres défis" : daily ? "Partie libre" : undefined}
                              back={replayDate ? null : daily ? "daily" : "home"}/>
            )}
        </div>
    );
}
