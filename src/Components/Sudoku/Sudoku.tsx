/**
 * Composant Sudoku - Jeu de Sudoku 9x9 interactif
 *
 * - À l'ouverture : popup de paramètres (cases à remplir, XP gagnée), puis génération côté serveur
 * - Grille : navigation clavier, surbrillance des chiffres identiques
 * - Actions : validation côté serveur, qui calcule et enregistre l'XP si le joueur est connecté
 *
 * - Panneau de gauche : chiffres restants à placer, clic pour les surligner dans la grille
 *
 * La logique est dans useSudokuGame, l'affichage dans SudokuSettingsPopup, DigitPanel et SudokuGrid.
 */

import {useState} from 'react';
import "./Sudoku.scss";
import {SuccessPopup} from "../SuccessPopup/SuccessPopup.tsx";
import sounds from "../../Services/sounds.ts";
import {useAuth} from "../../Context/authContext.ts";
import {useSudokuGame} from "./useSudokuGame.ts";
import SudokuSettingsPopup from "./SudokuSettingsPopup.tsx";
import SudokuGrid from "./SudokuGrid.tsx";
import DigitPanel from "./DigitPanel.tsx";

type SudokuProps = {
    gameCode: string;
}

export default function Sudoku({gameCode}: SudokuProps) {
    const {
        inputs, isGenerating, generate, validate,
        digitCounts, selectedDigit, toggleDigit, setHoverDigit, setSelectedCell, onCellInput,
    } = useSudokuGame();
    const {refresh: refreshUser} = useAuth();

    // La popup de paramètres s'ouvre avec la page ("Nouveau puzzle" recharge la page)
    const [showSettings, setShowSettings] = useState(true);
    const [showSuccess, setShowSuccess] = useState(false);
    // XP renvoyée par le serveur (null si le joueur n'est pas connecté)
    const [xpAwarded, setXpAwarded] = useState<number | null>(null);

    const handleGenerate = (cluesCount: number) => {
        setShowSettings(false);
        setShowSuccess(false);
        void generate(cluesCount);
    };

    const handleValidate = async () => {
        sounds.button();
        const result = await validate();
        if (!result.ok) {
            alert(result.message);
            return;
        }

        setXpAwarded(result.xp ?? null);
        // Met à jour niveau / XP dans le header
        if (result.xp !== undefined) void refreshUser();
        setShowSuccess(true);
    };

    return (
        <div className="sudoku">
            <DigitPanel counts={digitCounts} selected={selectedDigit} onSelect={toggleDigit}/>

            <div className="game">
                <h1 className="title">Sudoku</h1>
                <SudokuGrid inputs={inputs} onHover={setHoverDigit} onCellInput={onCellInput}
                            onSelectCell={setSelectedCell}/>
            </div>

            <div className="actions">
                <h2 className="title">Actions</h2>
                <button type="button" onClick={handleValidate} className="validate-button"
                        disabled={isGenerating || showSettings}>
                    Valider
                </button>
            </div>

            <SudokuSettingsPopup open={showSettings} onGenerate={handleGenerate}/>

            <SuccessPopup
                open={showSuccess}
                gameCode={gameCode}
                xpAwarded={xpAwarded}
            />
        </div>
    );
}
