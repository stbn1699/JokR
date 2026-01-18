import {useRef} from "react";
import "./Sudoku.scss";
import {handleKeyDown} from "./keyboardNavigation";
import {sanitizeInput} from "./sanitizeInput";

export default function Sudoku() {
    const inputs = useRef<HTMLInputElement[]>([]);

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
                        onKeyDown={(e) => handleKeyDown(e, inputs)}
                        onInput={sanitizeInput}
                    />
                ))}
            </div>
        </div>
    );
}