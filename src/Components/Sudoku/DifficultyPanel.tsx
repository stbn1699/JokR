import sounds from "../../Services/sounds.ts";

// Niveaux proposés : nombre de cases à remplir par le joueur
const DIFFICULTIES = [
    {label: "Très facile", emptyCells: 25},
    {label: "Facile", emptyCells: 50},
    {label: "Difficile", emptyCells: 70},
    {label: "Extrême", emptyCells: 75},
] as const;

type DifficultyPanelProps = {
    disabled: boolean;
    // Appelé avec le nombre de cases pré-remplies (indices) à demander au serveur
    onSelect: (cluesCount: number) => void;
};

/**
 * Panneau "Options" : un bouton par difficulté, qui lance la génération d'une grille.
 */
export default function DifficultyPanel({disabled, onSelect}: DifficultyPanelProps) {
    return (
        <div className="options">
            <h2 className="title">Options</h2>

            <div className="parameters-container">
                <div className="difficulty-buttons">
                    <label>Choisir la difficulté :</label>
                    <div className="buttons-list">
                        {DIFFICULTIES.map(({label, emptyCells}) => (
                            <button
                                key={label}
                                type="button"
                                className="reset-button"
                                disabled={disabled}
                                onClick={() => {
                                    sounds.button();
                                    onSelect(81 - emptyCells);
                                }}
                            >
                                {label} ({emptyCells})
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
