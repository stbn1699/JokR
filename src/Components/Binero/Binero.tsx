/**
 * Composant Binero (Takuzu) - grille de 0 et de 1
 *
 * - À l'ouverture : popup de paramètres (taille de grille, cases à remplir, XP gagnée)
 * - Panneau de gauche : 0 et 1 restants à placer, clic pour les surligner dans la grille
 * - Grille : saisie au clavier, ligne et colonne de la case sélectionnée éclaircies
 * - Panneau de droite : validation côté serveur et rappel des règles
 */

import {useState} from "react";
import "../PuzzleUI/PuzzleLayout.scss";
import "./Binero.scss";
import {SuccessPopup} from "../SuccessPopup/SuccessPopup.tsx";
import DigitPanel from "../PuzzleUI/DigitPanel.tsx";
import sounds from "../../Services/sounds.ts";
import {useAuth} from "../../Context/authContext.ts";
import {useBineroGame} from "./useBineroGame.ts";
import BineroGrid from "./BineroGrid.tsx";
import BineroSettingsPopup from "./BineroSettingsPopup.tsx";

const DIGITS = [0, 1];

type BineroProps = {
    gameCode: string;
};

export default function Binero({gameCode}: BineroProps) {
    const game = useBineroGame();
    const {refresh: refreshUser} = useAuth();

    // La popup de paramètres s'ouvre avec la page ("Nouveau puzzle" recharge la page)
    const [showSettings, setShowSettings] = useState(true);
    const [showSuccess, setShowSuccess] = useState(false);
    const [xpAwarded, setXpAwarded] = useState<number | null>(null);
    const [selectedCell, setSelectedCell] = useState<number | null>(null);
    const [selectedDigit, setSelectedDigit] = useState<number | null>(null);

    const handleGenerate = (size: number, emptyCells: number) => {
        setShowSettings(false);
        setShowSuccess(false);
        setSelectedDigit(null);
        void game.generate(size, emptyCells);
    };

    const handleValidate = async () => {
        sounds.button();
        const result = await game.validate();
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
        <div className="puzzle-layout binero">
            <DigitPanel
                digits={DIGITS}
                perDigit={(game.size * game.size) / 2}
                counts={game.counts}
                selected={selectedDigit}
                onSelect={n => setSelectedDigit(current => (current === n ? null : n))}
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
                    />
                )}
            </div>

            <div className="actions">
                <h2 className="title">Actions</h2>
                <button type="button" onClick={handleValidate} className="validate-button"
                        disabled={game.isGenerating || showSettings}>
                    Valider
                </button>

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

            <BineroSettingsPopup open={showSettings} onGenerate={handleGenerate}/>

            <SuccessPopup open={showSuccess} gameCode={gameCode} xpAwarded={xpAwarded}/>
        </div>
    );
}
