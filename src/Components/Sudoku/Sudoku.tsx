import {useEffect, useRef} from "react";
import "./Sudoku.scss";
import {handleKeyDown} from "./keyboardNavigation";
import {sanitizeInput} from "./sanitizeInput";
import {generateSudoku} from "./sudokuGenerator";
import validateSudoku from "./sudokuValidator";

export default function Sudoku() {
    const inputs = useRef<HTMLInputElement[]>([]);

    useEffect(() => {
        // Génère une grille avec x chiffres placés par défaut
        const grid = generateSudoku(20);
        for (let r = 0; r < 9; r++) {
            for (let c = 0; c < 9; c++) {
                const val = grid[r][c];
                const idx = r * 9 + c;
                const el = inputs.current[idx];
                if (el) {
                    el.value = val === 0 ? "" : String(val);
                    // si case pré-remplie, désactiver l'édition
                    // set both readOnly and disabled for safety, and add a class
                    const isPrefilled = val !== 0;
                    el.readOnly = isPrefilled;
                    el.disabled = isPrefilled;
                    if (isPrefilled) {
                        el.classList.add('prefilled');
                    } else {
                        el.classList.remove('prefilled');
                    }
                }
            }
        }
    }, []);

    return (
        <div className="sudoku">
            <div className="grid">
                {Array.from({length: 81}, (_, i) => (
                    <input
                        key={i}
                        data-index={i}
                        ref={(el) => {
                            if (el) inputs.current[i] = el;
                            else delete inputs.current[i];
                        }}
                        className="cell"
                        type="number"
                        min={1}
                        max={9}
                        inputMode="numeric"
                        pattern="[0-9]*"
                        placeholder=" "
                        onKeyDown={(e) => handleKeyDown(e, inputs)}
                        onInput={sanitizeInput}
                    />
                ))}
            </div>

            <div className="controls">
                <button
                    type="button"
                    onClick={() => {
                        const result = validateSudoku(inputs.current);
                        console.log(result);
                    }}
                    className="validate-button"
                >
                    Valider
                </button>
            </div>
        </div>
    );
}