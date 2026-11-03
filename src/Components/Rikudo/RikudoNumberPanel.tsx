import {type CSSProperties, type MouseEvent} from "react";

type RikudoNumberPanelProps = {
    // Nombre de cases du plateau (0 = pas encore de grille)
    size: number;
    // placed[n] = nombre de fois où n est sur le plateau
    placed: Record<number, number>;
    // Nombre surligné sur le plateau
    selected: number | null;
    onSelect: (n: number) => void;
    onErase: () => void;
};

// Les boutons du panneau ne prennent pas le focus : la case sélectionnée sur le plateau le garde
const keepBoardFocus = (e: MouseEvent<HTMLButtonElement>) => e.preventDefault();

/**
 * Panneau des nombres du Rikudo (1 à N).
 * - Nombre déjà posé : grisé ; posé deux fois : en rouge
 * - Avec une case sélectionnée, un nombre la remplit ; sans case sélectionnée, il est surligné sur le plateau
 * Indispensable sur téléphone (pas de clavier physique).
 */
export default function RikudoNumberPanel({size, placed, selected, onSelect, onErase}: RikudoNumberPanelProps) {

    const numbers = Array.from({length: size}, (_, i) => i + 1);
    const columns = size > 60 ? 10 : size > 36 ? 8 : 6;
    const remaining = numbers.filter(n => !placed[n]).length;

    return (
        <div className="options">
            <h2 className="title">Nombres</h2>

            <div className="number-pad" style={{"--number-columns": columns} as CSSProperties}>
                {numbers.map(n => {
                    const count = placed[n] ?? 0;
                    const state = count === 1 ? "complete" : count > 1 ? "overflow" : "";
                    return (
                        <button
                            key={n}
                            data-number={n}
                            type="button"
                            className={`number ${state} ${selected === n ? "selected" : ""}`}
                            aria-pressed={selected === n}
                            title={count > 1 ? `${n} est posé ${count} fois` : count === 1 ? `${n} est posé` : `${n} à placer`}
                            onMouseDown={keepBoardFocus}
                            onClick={() => onSelect(n)}
                        >
                            {n}
                        </button>
                    );
                })}
            </div>

            <button type="button" className="number-erase" onMouseDown={keepBoardFocus} onClick={onErase} aria-label="Effacer"
                    title="Vider la case sélectionnée">
                <span aria-hidden>⌫</span><span className="number-erase-label"> Effacer</span>
            </button>

            <p className="digit-hint">
                {size > 0 && <>{remaining} nombre{remaining > 1 ? "s" : ""} à placer. </>}
                Case sélectionnée : un nombre la remplit. Sinon, il est surligné sur le plateau.
            </p>
        </div>
    );
}
