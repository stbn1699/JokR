import sounds from "../../Services/sounds.ts";

const DIGITS = [1, 2, 3, 4, 5, 6, 7, 8, 9];

type DigitPanelProps = {
    // counts[n] = nombre de n présents dans la grille
    counts: number[];
    selected: number | null;
    onSelect: (n: number) => void;
};

/**
 * Panneau de gauche : les chiffres 1 à 9.
 * - Sous chaque chiffre : combien il en reste à placer
 * - Grisé quand les 9 sont posés, en rouge s'il y en a trop (erreur dans la grille)
 * - Un clic surligne ce chiffre dans toute la grille (re-clic pour enlever)
 */
export default function DigitPanel({counts, selected, onSelect}: DigitPanelProps) {
    return (
        <div className="options">
            <h2 className="title">Chiffres</h2>

            <div className="digit-pad">
                {DIGITS.map((n) => {
                    const count = counts[n] ?? 0;
                    const remaining = 9 - count;
                    const state = remaining === 0 ? "complete" : remaining < 0 ? "overflow" : "";

                    return (
                        <button
                            key={n}
                            type="button"
                            className={`digit ${state} ${selected === n ? "selected" : ""}`}
                            aria-pressed={selected === n}
                            title={remaining < 0 ? `${-remaining} de trop` : `${remaining} à placer`}
                            onClick={() => {
                                sounds.button();
                                onSelect(n);
                            }}
                        >
                            <span className="digit-value">{n}</span>
                            <span className="digit-remaining">
                                {remaining === 0 ? "✓" : remaining < 0 ? `+${-remaining}` : remaining}
                            </span>
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
