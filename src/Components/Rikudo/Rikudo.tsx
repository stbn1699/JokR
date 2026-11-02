/**
 * Composant Rikudo - plateau en nid d'abeille, nombres de 1 à N
 *
 * - À l'ouverture : popup de paramètres (taille du plateau, cases à remplir, XP gagnée)
 * - Panneau de gauche : nombres de 1 à N (grisés une fois posés), clic pour remplir ou surligner
 * - Plateau : saisie au clavier, voisines de la case sélectionnée éclairées
 * - Panneau de droite : validation côté serveur, messages d'erreur et rappel des règles
 * - Victoire : popup avec la barre d'XP ; "Nouvelle partie" rouvre les paramètres sans recharger
 * - Défi du jour (ou d'un jour passé, rejoué hors classement) : grille imposée, pas de paramètres
 */

import {useMemo, useState} from "react";
import "../PuzzleUI/PuzzleLayout.scss";
import "./Rikudo.scss";
import {SuccessPopup} from "../SuccessPopup/SuccessPopup.tsx";
import GameNotice from "../PuzzleUI/GameNotice.tsx";
import GameTimer from "../PuzzleUI/GameTimer.tsx";
import HistoryButtons from "../PuzzleUI/HistoryButtons.tsx";
import {useUndoShortcuts} from "../PuzzleUI/useMoveHistory.ts";
import ErrorsToggle from "../PuzzleUI/ErrorsToggle.tsx";
import {useShowErrors} from "../PuzzleUI/useShowErrors.ts";
import {useGameFlow} from "../PuzzleUI/useGameFlow.ts";
import {useResumableGame} from "../PuzzleUI/savedGame.ts";
import {rikudoService} from "../../Services/rikudo.service.ts";
import {useDailyGame} from "../PuzzleUI/useDailyGame.ts";
import DailyDonePopup from "../PuzzleUI/DailyDonePopup.tsx";
import {dailyService, formatDailyDate} from "../../Services/daily.service.ts";
import {useNavigate} from "react-router-dom";
import type {RikudoPuzzle} from "../../Models/rikudo.model.ts";
import {type SavedRikudo, useRikudoGame} from "./useRikudoGame.ts";
import {rikudoConflicts} from "./rikudoRules.ts";
import RikudoBoard from "./RikudoBoard.tsx";
import RikudoNumberPanel from "./RikudoNumberPanel.tsx";
import RikudoSettingsPopup from "./RikudoSettingsPopup.tsx";

type RikudoProps = {
    // Défi du jour : grille imposée, pas de popup de paramètres
    daily?: boolean;
    // Défi d'un jour passé, rejoué en partie normale (hors classement) : AAAA-MM-JJ
    replayDate?: string;
};

export default function Rikudo({daily = false, replayDate}: RikudoProps) {
    const navigate = useNavigate();
    const challenge = daily || replayDate !== undefined;
    // Sauvegardes séparées (une partie libre et un défi peuvent être en cours en parallèle)
    const saveKey = replayDate ? `RIKUDO:replay:${replayDate}` : daily ? "RIKUDO:daily" : "RIKUDO";
    const game = useRikudoGame(saveKey);
    const flow = useGameFlow();
    const {resumable, dismissResumable} = useResumableGame<SavedRikudo, RikudoPuzzle>(saveKey, rikudoService.getGame, !challenge);
    const dailyGame = useDailyGame<SavedRikudo, RikudoPuzzle>({
        enabled: challenge,
        gameCode: "RIKUDO",
        saveKey,
        fetchStatus: rikudoService.getGame,
        emptySave: gameId => ({gameId, values: []}),
        start: replayDate ? () => dailyService.replay("RIKUDO", replayDate) : undefined,
        onLoad: (puzzle, saved, elapsedMs) => {
            game.restore(puzzle, saved);
            flow.resume(elapsedMs);
        },
    });
    const [selectedCell, setSelectedCell] = useState<number | null>(null);
    const [selectedNumber, setSelectedNumber] = useState<number | null>(null);
    // Case en cours de saisie (un 2e chiffre peut suivre) : comptée vide pour les erreurs et le panneau
    const [pendingCell, setPendingCell] = useState<number | null>(null);
    const settledValues = useMemo(
        () => (pendingCell === null ? game.values : game.values.map((v, i) => (i === pendingCell ? null : v))),
        [game.values, pendingCell],
    );
    const placed = useMemo(() => {
        const counts: Record<number, number> = {};
        for (const v of settledValues) if (v !== null) counts[v] = (counts[v] ?? 0) + 1;
        return counts;
    }, [settledValues]);
    const playing = !flow.showSettings && !flow.victory && !game.isGenerating;
    const [showErrors, setShowErrors] = useShowErrors();
    const conflicts = useMemo(
        () => (game.board && game.puzzle ? rikudoConflicts(game.board, settledValues, game.puzzle.links) : new Set<number>()),
        [game.board, game.puzzle, settledValues],
    );
    useUndoShortcuts(game.undo, game.redo, playing);

    // Case sélectionnée modifiable (pas un nombre donné)
    const editableSelection = selectedCell !== null && !game.isClue(selectedCell) ? selectedCell : null;

    // Panneau : remplit la case sélectionnée, sinon surligne le nombre sur le plateau
    const handleNumber = (n: number) => {
        if (editableSelection !== null) game.setCell(editableSelection, n);
        else setSelectedNumber(current => (current === n ? null : n));
    };

    const handleResume = () => {
        if (!resumable) return;
        setSelectedNumber(null);
        game.restore(resumable.grid, resumable.saved);
        flow.resume(resumable.elapsedMs + Date.now() - resumable.checkedAt);
        dismissResumable();
    };

    const handleGenerate = (size: number, emptyCells: number) => {
        dismissResumable();
        setSelectedNumber(null);
        void flow.generate(() => game.generate(size, emptyCells));
    };

    return (
        <div className="puzzle-layout rikudo">
            <RikudoNumberPanel
                size={game.board?.size ?? 0}
                placed={placed}
                selected={selectedNumber}
                onSelect={handleNumber}
                onErase={() => editableSelection !== null && game.setCell(editableSelection, null)}
            />

            <div className="game">
                {daily && (
                    <p className="daily-label">
                        Défi du jour{dailyGame.date ? ` · ${formatDailyDate(dailyGame.date)}` : ""}
                    </p>
                )}
                {replayDate && (
                    <p className="daily-label">Défi du {formatDailyDate(replayDate)} · hors classement</p>
                )}
                <h1 className="title">Rikudo</h1>
                {game.board && game.puzzle && (
                    <RikudoBoard
                        board={game.board}
                        values={game.values}
                        links={game.puzzle.links}
                        isClue={game.isClue}
                        revealed={game.revealed}
                        disabled={game.isGenerating}
                        selectedCell={selectedCell}
                        onSelectCell={setSelectedCell}
                        highlightNumber={selectedNumber}
                        onSetCell={game.setCell}
                        errors={showErrors ? conflicts : null}
                        pendingCell={pendingCell}
                        onPendingChange={setPendingCell}
                    />
                )}
            </div>

            <div className="actions">
                <h2 className="title">Actions</h2>
                <GameTimer clock={flow.clock}/>
                <button type="button" onClick={() => flow.submit(game.validate)} className="validate-button"
                        disabled={game.isGenerating || flow.showSettings}>
                    Valider
                </button>
                <HistoryButtons canUndo={playing && game.canUndo} canRedo={playing && game.canRedo}
                                onUndo={game.undo} onRedo={game.redo}/>
                <ErrorsToggle checked={showErrors} onChange={setShowErrors} count={conflicts.size}/>
                <GameNotice message={dailyGame.error ?? flow.notice} onClose={flow.clearNotice}/>

                <div className="rules">
                    <h3>Règles</h3>
                    <ul>
                        <li>Place les nombres de 1 à {game.board?.size ?? "N"}, une fois chacun</li>
                        <li>Deux nombres qui se suivent sont dans des cases voisines : on peut aller de 1 à {game.board?.size ?? "N"} de case en case</li>
                        <li>Un point entre deux cases : leurs nombres se suivent</li>
                    </ul>
                    <p className="rules-keys">Clavier : tape le nombre (<kbd>2</kbd> <kbd>7</kbd> pour 27), <kbd>⌫</kbd> pour
                        vider, flèches pour se déplacer</p>
                </div>
            </div>

            <RikudoSettingsPopup open={!challenge && flow.showSettings} onGenerate={handleGenerate}
                                 resume={resumable ? {elapsedMs: resumable.elapsedMs, onResume: handleResume} : undefined}/>

            {dailyGame.done && <DailyDonePopup gameCode="RIKUDO" gameName="Rikudo" result={dailyGame.done}/>}

            {flow.victory && (
                <SuccessPopup gameName="Rikudo" xpAwarded={flow.victory.xpAwarded} creditsAwarded={flow.victory.creditsAwarded} before={flow.victory.before}
                              durationMs={flow.victory.durationMs} personalBest={flow.victory.personalBest}
                              daily={flow.victory.daily}
                              onNewGame={replayDate ? () => navigate("/defi")
                                  : daily ? () => navigate(`/playgame/RIKUDO`) : flow.newGame}
                              newGameLabel={replayDate ? "Autres défis" : daily ? "Partie libre" : undefined}/>
            )}
        </div>
    );
}
