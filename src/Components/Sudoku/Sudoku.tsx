/**
 * Composant Sudoku - Jeu de Sudoku 9x9 interactif
 *
 * - Options : choix de la difficulté, qui génère une grille côté serveur
 * - Grille : navigation clavier, surbrillance des chiffres identiques
 * - Actions : validation côté serveur, qui calcule et enregistre l'XP si le joueur est connecté
 *
 * La logique est dans useSudokuGame, l'affichage dans DifficultyPanel et SudokuGrid.
 */

import {useState} from 'react';
import "./Sudoku.scss";
import {SuccessPopup} from "../SuccessPopup/SuccessPopup.tsx";
import sounds from "../../Services/sounds.ts";
import {useAuth} from "../../Context/authContext.ts";
import {useSudokuGame} from "./useSudokuGame.ts";
import DifficultyPanel from "./DifficultyPanel.tsx";
import SudokuGrid from "./SudokuGrid.tsx";

type SudokuProps = {
    gameCode: string;
}

export default function Sudoku({gameCode}: SudokuProps) {
    const {inputs, isGenerating, generate, validate, setHighlight} = useSudokuGame();
    const {refresh: refreshUser} = useAuth();

    const [showSuccess, setShowSuccess] = useState(false);
    // XP renvoyée par le serveur (null si le joueur n'est pas connecté)
    const [xpAwarded, setXpAwarded] = useState<number | null>(null);

    const handleGenerate = (cluesCount: number) => {
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
            <DifficultyPanel disabled={isGenerating} onSelect={handleGenerate}/>

            <div className="game">
                <h1 className="title">Sudoku</h1>
                <SudokuGrid inputs={inputs} onHighlight={setHighlight}/>
            </div>

            <div className="actions">
                <h2 className="title">Actions</h2>
                <button type="button" onClick={handleValidate} className="validate-button">
                    Valider
                </button>
            </div>

            <SuccessPopup
                open={showSuccess}
                gameCode={gameCode}
                xpAwarded={xpAwarded}
            />
        </div>
    );
}
