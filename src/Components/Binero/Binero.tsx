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
import "./Binero.scss";
import {SuccessPopup} from "../SuccessPopup/SuccessPopup.tsx";
import DigitPanel from "../PuzzleUI/DigitPanel.tsx";
import GameNotice from "../PuzzleUI/GameNotice.tsx";
import GameTimer from "../PuzzleUI/GameTimer.tsx";
import HistoryButtons from "../PuzzleUI/HistoryButtons.tsx";
import {useUndoShortcuts} from "../PuzzleUI/useMoveHistory.ts";
import ErrorsToggle from "../PuzzleUI/ErrorsToggle.tsx";
import {useShowErrors} from "../PuzzleUI/useShowErrors.ts";
import {bineroConflicts} from "./bineroRules.ts";
import {useGameFlow} from "../PuzzleUI/useGameFlow.ts";
import {useBineroGame} from "./useBineroGame.ts";
import BineroGrid from "./BineroGrid.tsx";
import BineroSettingsPopup from "./BineroSettingsPopup.tsx";

const DIGITS = [0, 1];

export default function Binero() {
    const game = useBineroGame();
    const flow = useGameFlow();
    const [selectedCell, setSelectedCell] = useState<number | null>(null);
    const [selectedDigit, setSelectedDigit] = useState<number | null>(null);
    const playing = !flow.showSettings && !flow.victory && !game.isGenerating;
    const [showErrors, setShowErrors] = useShowErrors();
    const conflicts = useMemo(() => bineroConflicts(game.values, game.size), [game.values, game.size]);
    useUndoShortcuts(game.undo, game.redo, playing);

    // Case sélectionnée modifiable (pas un chiffre donné)
    const editableSelection = selectedCell !== null && !game.isClue(selectedCell) ? selectedCell : null;

    // Panneau : remplit la case sélectionnée, sinon surligne le chiffre dans la grille
    const handleDigit = (n: number) => {
        if (editableSelection !== null) game.setCell(editableSelection, n as 0 | 1);
        else setSelectedDigit(current => (current === n ? null : n));
    };

    const handleGenerate = (size: number, emptyCells: number) => {
        setSelectedDigit(null);
        void flow.generate(() => game.generate(size, emptyCells));
    };

    return (
        <div className="puzzle-layout binero">
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
                <h1 className="title">Binero</h1>
                {game.size > 0 && (
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
                <GameNotice message={flow.notice} onClose={flow.clearNotice}/>

                <div className="rules">
                    <h3>Règles</h3>
                    <ul>
                        <li>Jamais trois 0 ou trois 1 côte à côte</li>
                        <li>Autant de 0 que de 1 sur chaque ligne et chaque colonne</li>
                        <li>Deux lignes (ou deux colonnes) ne peuvent pas être identiques</li>
                    </ul>
                    <p className="rules-keys">Clavier : <kbd>0</kbd> <kbd>1</kbd> pour remplir, <kbd>⌫</kbd> pour
                        vider, flèches pour se déplacer</p>
                </div>
            </div>

            <BineroSettingsPopup open={flow.showSettings} onGenerate={handleGenerate}/>

            {flow.victory && (
                <SuccessPopup gameName="Binero" xpAwarded={flow.victory.xpAwarded} before={flow.victory.before}
                              durationMs={flow.victory.durationMs} personalBest={flow.victory.personalBest}
                              onNewGame={flow.newGame}/>
            )}
        </div>
    );
}
