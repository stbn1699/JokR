import type {CSSProperties} from "react";
import sounds from "../../Services/sounds.ts";

type DigitPanelProps = {
    // Chiffres proposés (1 à 9 pour le Sudoku, 0 et 1 pour le Binero)
    digits: number[];
    // Nombre d'exemplaires de chaque chiffre dans une grille complète (0 = pas encore de grille)
    perDigit: number;
    // counts[n] = nombre de n présents dans la grille
    counts: Record<number, number>;
    selected: number | null;
    onSelect: (n: number) => void;
    // Nombre de colonnes du pavé
    columns?: number;
};

/**
 * Panneau de gauche : les chiffres du jeu.
 * - Sous chaque chiffre : combien il en reste à placer
 * - Grisé quand tous sont posés, en rouge s'il y en a trop (erreur dans la grille)
 * - Un clic surligne ce chiffre dans toute la grille (re-clic pour enlever)
 */
export default function DigitPanel({digits, perDigit, counts, selected, onSelect, columns = 3}: DigitPanelProps) {
    return (
        <div className="options">
            <h2 className="title">Chiffres</h2>

            <div className="digit-pad" style={{"--digit-columns": columns} as CSSProperties}>
                {digits.map((n) => {
                    const hasGrid = perDigit > 0;
                    const remaining = perDigit - (counts[n] ?? 0);
                    const state = !hasGrid ? "" : remaining === 0 ? "complete" : remaining < 0 ? "overflow" : "";

                    return (
                        <button
                            key={n}
                            type="button"
                            className={`digit ${state} ${selected === n ? "selected" : ""}`}
                            aria-pressed={selected === n}
                            title={!hasGrid ? undefined : remaining < 0 ? `${-remaining} de trop` : `${remaining} à placer`}
                            onClick={() => {
                                sounds.button();
                                onSelect(n);
                            }}
                        >
                            <span className="digit-value">{n}</span>
                            {hasGrid && (
                                <span className="digit-remaining">
                                    {remaining === 0 ? "✓" : remaining < 0 ? `+${-remaining}` : remaining}
                                </span>
                            )}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
