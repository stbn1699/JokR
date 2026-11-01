import type {CSSProperties, MouseEvent} from "react";

type DigitPanelProps = {
    // Chiffres proposés (1 à 9 pour le Sudoku, 0 et 1 pour le Binero)
    digits: number[];
    // Nombre d'exemplaires de chaque chiffre dans une grille complète (0 = pas encore de grille)
    perDigit: number;
    // counts[n] = nombre de n présents dans la grille
    counts: Record<number, number>;
    // Chiffre surligné dans la grille
    selected: number | null;
    // Clic sur un chiffre : le jeu décide (remplir la case sélectionnée ou surligner le chiffre)
    onSelect: (n: number) => void;
    // Vide la case sélectionnée (bouton "Effacer")
    onErase: () => void;
    // Nombre de colonnes du pavé (sur grand écran)
    columns?: number;
    // Mode notes au crayon (Sudoku) : bouton qui bascule le mode
    notes?: { active: boolean; onToggle: () => void };
};

// Les boutons du panneau ne prennent pas le focus : la case sélectionnée dans la grille le garde
// (annuler "mousedown" empêche le changement de focus, à la souris comme au doigt)
const keepGridFocus = (e: MouseEvent<HTMLButtonElement>) => e.preventDefault();

/**
 * Panneau des chiffres du jeu.
 * - Sous chaque chiffre : combien il en reste à placer (grisé quand tout est posé, rouge s'il y en a trop)
 * - Avec une case sélectionnée, un chiffre la remplit ; sans case sélectionnée, il est surligné dans la grille
 * - "Effacer" vide la case sélectionnée
 * Indispensable sur téléphone (pas de clavier physique).
 */
export default function DigitPanel({digits, perDigit, counts, selected, onSelect, onErase, columns = 3, notes}: DigitPanelProps) {
    const hasGrid = perDigit > 0;

    return (
        <div className="options">
            <h2 className="title">Chiffres</h2>

            <div className="digit-pad"
                 style={{"--digit-columns": columns, "--digit-count": digits.length + (notes ? 2 : 1)} as CSSProperties}>
                {digits.map((n) => {
                    const remaining = perDigit - (counts[n] ?? 0);
                    const state = !hasGrid ? "" : remaining === 0 ? "complete" : remaining < 0 ? "overflow" : "";

                    return (
                        <button
                            key={n}
                            type="button"
                            className={`digit ${state} ${selected === n ? "selected" : ""}`}
                            aria-pressed={selected === n}
                            title={!hasGrid ? undefined : remaining < 0 ? `${-remaining} de trop` : `${remaining} à placer`}
                            onMouseDown={keepGridFocus}
                            onClick={() => onSelect(n)}
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

                <button
                    type="button"
                    className="digit erase"
                    title="Vider la case sélectionnée"
                    aria-label="Effacer la case sélectionnée"
                    onMouseDown={keepGridFocus}
                    onClick={onErase}
                >
                    <span className="digit-value">⌫</span>
                    <span className="digit-remaining">effacer</span>
                </button>

                {notes && (
                    <button
                        type="button"
                        className={`digit notes-toggle ${notes.active ? "selected" : ""}`}
                        aria-pressed={notes.active}
                        title="Mode notes au crayon (touche N)"
                        onMouseDown={keepGridFocus}
                        onClick={notes.onToggle}
                    >
                        <span className="digit-value">✏</span>
                        <span className="digit-remaining">notes</span>
                    </button>
                )}
            </div>

            <p className="digit-hint">
                {notes?.active
                    ? "Mode notes : un chiffre s'ajoute (ou se retire) en petit dans la case sélectionnée."
                    : "Case sélectionnée : un chiffre la remplit. Sinon, il est surligné dans la grille."}
            </p>
        </div>
    );
}
