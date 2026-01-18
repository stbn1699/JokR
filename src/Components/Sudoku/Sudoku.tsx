import "./Sudoku.scss";

export default function Sudoku() {

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        // laisser passer les raccourcis (Ctrl/Cmd/Alt) et navigation
        if (e.ctrlKey || e.metaKey || e.altKey) return;

        const key = e.key;

        // bloquer les touches indésirables pour les inputs numériques
        const forbidden = ["e", "E", "+", "-"];
        if (forbidden.includes(key)) {
            e.preventDefault();
            return;
        }

        // si c'est un chiffre unique : remplacer la valeur actuelle
        if (/^[0-9]$/.test(key)) {
            e.preventDefault();
            const el = e.currentTarget as HTMLInputElement;
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
