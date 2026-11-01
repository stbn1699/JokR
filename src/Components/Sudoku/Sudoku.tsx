/**
 * Composant Sudoku - Jeu de Sudoku 9x9 interactif
 *
 * - À l'ouverture : popup de paramètres (cases à remplir, XP gagnée), puis génération côté serveur
 * - Victoire : popup avec la barre d'XP ; "Nouvelle partie" rouvre les paramètres sans recharger
 * - Grille : navigation clavier, surbrillance des chiffres identiques
 * - Actions : validation côté serveur, qui calcule et enregistre l'XP si le joueur est connecté
 *
 * - Panneau de gauche : chiffres restants à placer, clic pour les surligner dans la grille
 *
 * La logique est dans useSudokuGame, l'affichage dans SudokuSettingsPopup, DigitPanel et SudokuGrid.
 */

import "../PuzzleUI/PuzzleLayout.scss";
import "./Sudoku.scss";
import {SuccessPopup} from "../SuccessPopup/SuccessPopup.tsx";
import GameNotice from "../PuzzleUI/GameNotice.tsx";
import GameTimer from "../PuzzleUI/GameTimer.tsx";
import {useGameFlow} from "../PuzzleUI/useGameFlow.ts";
import {useSudokuGame} from "./useSudokuGame.ts";
import SudokuSettingsPopup from "./SudokuSettingsPopup.tsx";
import SudokuGrid from "./SudokuGrid.tsx";
import DigitPanel from "../PuzzleUI/DigitPanel.tsx";

const DIGITS = [1, 2, 3, 4, 5, 6, 7, 8, 9];

export default function Sudoku() {
    const {
        inputs, isGenerating, generate, validate,
        digitCounts, selectedDigit, toggleDigit, fillSelected, setHoverDigit, setSelectedCell, onCellInput,
    } = useSudokuGame();
    const flow = useGameFlow();

    const handleGenerate = (cluesCount: number) => {
        void flow.generate(() => generate(cluesCount));
    };

    return (
        <div className="puzzle-layout sudoku">
            <DigitPanel digits={DIGITS} perDigit={9} counts={digitCounts} selected={selectedDigit}
                        onSelect={n => fillSelected(n) || toggleDigit(n)}
                        onErase={() => fillSelected(null)}/>

            <div className="game">
                <h1 className="title">Sudoku</h1>
                <SudokuGrid inputs={inputs} onHover={setHoverDigit} onCellInput={onCellInput}
                            onSelectCell={setSelectedCell}/>
            </div>

            <div className="actions">
                <h2 className="title">Actions</h2>
                <GameTimer clock={flow.clock}/>
                <button type="button" onClick={() => flow.submit(validate)} className="validate-button"
                        disabled={isGenerating || flow.showSettings}>
                    Valider
                </button>
                <GameNotice message={flow.notice} onClose={flow.clearNotice}/>
            </div>

            <SudokuSettingsPopup open={flow.showSettings} onGenerate={handleGenerate}/>

            {flow.victory && (
                <SuccessPopup gameName="Sudoku" xpAwarded={flow.victory.xpAwarded} before={flow.victory.before}
                              durationMs={flow.victory.durationMs} personalBest={flow.victory.personalBest}
                              onNewGame={flow.newGame}/>
            )}
        </div>
    );
}
