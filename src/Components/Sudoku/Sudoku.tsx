import React, {useRef} from "react";
import "./Sudoku.scss";

export default function Sudoku() {
    const inputs = useRef<HTMLInputElement[]>([]);

    const focusIndex = (targetIndex: number) => {
        const el = inputs.current[targetIndex];
        if (el) {
            el.focus();
            // si l'input est textuel, on pourrait sélectionner le contenu :
            try {
                el.setSelectionRange(0, el.value.length);
            } catch {
                // ignore pour type=number dans certains navigateurs
            }
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        // laisser passer les raccourcis (Ctrl/Cmd/Alt) et navigation si modif active
        if (e.ctrlKey || e.metaKey || e.altKey) return;

        const key = e.key;
        const el = e.currentTarget as HTMLInputElement;
        const idxAttr = el.dataset.index;
        const idx = idxAttr ? parseInt(idxAttr, 10) : -1;

        // navigation par flèches
        if (idx >= 0) {
            const row = Math.floor(idx / 9);
            const col = idx % 9;
            let target = -1;

            if (key === "ArrowLeft") {
                e.preventDefault();
                if (col > 0) target = idx - 1;
            } else if (key === "ArrowRight") {
                e.preventDefault();
                if (col < 8) target = idx + 1;
            } else if (key === "ArrowUp") {
                e.preventDefault();
                if (row > 0) target = idx - 9;
            } else if (key === "ArrowDown") {
                e.preventDefault();
                if (row < 8) target = idx + 9;
            }

            if (target >= 0) {
                focusIndex(target);
                return;
            }
        }

        // bloquer les touches indésirables pour les inputs numériques
        const forbidden = ["e", "E", "+", "-"];
        if (forbidden.includes(key)) {
            e.preventDefault();
            return;
        }

        // si c'est un chiffre unique : remplacer la valeur actuelle
        if (/^[0-9]$/.test(key)) {
            e.preventDefault();
            if (key === "0") {
                el.value = "";
            } else {
                el.value = key;
            }
        }
    };

    const onInput = (e: React.FormEvent<HTMLInputElement>) => {
        const el = e.currentTarget;
        // ne garder que les chiffres, limiter à 1 caractère
        el.value = el.value.replace(/[^0-9]/g, "");
        if (el.value.length > 1) {
            el.value = el.value.slice(0, 1);
        }
        // empêcher le 0
        if (el.value === "0") {
            el.value = "";
        }
    };

    return (
        <div className={"sudoku"}>
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
                        onKeyDown={handleKeyDown}
                        onInput={onInput}
                    />
                ))}
            </div>
        </div>
    );
}