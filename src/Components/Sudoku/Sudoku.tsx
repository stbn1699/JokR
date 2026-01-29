import {type FormEvent, useEffect, useRef, useState} from 'react';
import "./Sudoku.scss";
import {handleKeyDown} from "./keyboardNavigation";
import {sanitizeInput} from "./sanitizeInput";
import {generateSudoku} from "./sudokuGenerator";
import {SuccessPopup} from "../SuccessPopup/SuccessPopup.tsx";
import {gameService} from "../../Services/game.service.ts";
import {useNavigate} from "react-router-dom";

type SudokuProps = {
    gameCode: string
}

export default function Sudoku({gameCode}: SudokuProps) {
    const inputs = useRef<HTMLInputElement[]>([]);
    const navigate = useNavigate();
    const [showSuccess, setShowSuccess] = useState(false);
    const [cluesCount, setCluesCount] = useState<number>(40);
    const [highlightNumber, setHighlightNumber] = useState<number | null>(null);
    const [baseXp, setBaseXp] = useState<number>(0);

    const calculateXpWin = () => {
        const referenceClues = 40; // valeur neutre
        const exponent = 1.2;      // réglage de difficulté

        const difficultyFactor = Math.pow(referenceClues / cluesCount, exponent);
        let xp = Math.round(baseXp * difficultyFactor);

        // Sécurité (anti-abus)
        xp = Math.max(20, Math.min(xp, 300));

        return xp;
    };

    const resetOptions = () => {
        setCluesCount(40);
        generateGrid(cluesCount);
    }

    const generateGrid = (count: number) => {
        setShowSuccess(false);
        setHighlightNumber(null);

        calculateXpWin();

        const grid = generateSudoku(count);
        for (let r = 0; r < 9; r++) {
            for (let c = 0; c < 9; c++) {
                const val = grid[r][c];
                const idx = r * 9 + c;
                const el = inputs.current[idx];
                if (el) {
                    el.value = val === 0 ? "" : String(val);
                    el.setAttribute('data-value', val === 0 ? '' : String(val));
                    const isPrefilled = val !== 0;
                    el.readOnly = isPrefilled;
                    el.disabled = false;

                    if (isPrefilled) {
                        el.classList.add('prefilled');
                    } else {
                        el.classList.remove('prefilled');
                    }
                }
            }
        }
    };

    useEffect(() => {
        let cancelled = false;

        (async () => {
            try {
                const xp = await gameService.getBaseXp(gameCode);
                if (!cancelled) setBaseXp(xp);
            } catch (error) {
                console.error("Failed to fetch base XP for Sudoku:", error);
                navigate('/')
            }
        })();

        return () => {
            cancelled = true;
        };
    }, []);

    useEffect(() => {
        generateGrid(cluesCount);
    }, []);

    useEffect(() => {
        const numStr = highlightNumber === null ? null : String(highlightNumber);
        inputs.current.forEach((el) => {
            if (!el) return;
            const val = el.value ?? el.getAttribute('data-value') ?? '';
            if (numStr !== null && val === numStr) {
                el.classList.add('same-number-highlight');
            } else {
                el.classList.remove('same-number-highlight');
            }
        });
    }, [highlightNumber]);

    const userId: string | null = window.localStorage.getItem('userId');

    return (
        <div className="sudoku">

            <div className="options">
                <h2 className="title">Options</h2>

                <div className="parameters-container">
                    <div className="cluesRange">
                        <label htmlFor="cluesRange">Difficulté&nbsp;:</label>
                        <input
                            id="cluesRange"
                            type="range"
                            min={30}
                            max={60}
                            step={1}
                            value={80 - cluesCount}
                            onChange={(e) => setCluesCount(80 - Number(e.target.value))}
                        />
                    </div>
                </div>

                <div className="buttons-container">
                    <button type="button" className="reset-button" onClick={() => resetOptions()}>
                        Réinitialiser
                    </button>
                    <button type="button" className="generate-button" onClick={() => generateGrid(cluesCount)}>
                        Générer ({calculateXpWin()}xp)
                    </button>
                </div>
            </div>

            <div className="game">
                <h1 className="title">Sudoku</h1>

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
                            onKeyDown={(e) => {
                                const el = e.currentTarget as HTMLInputElement;
                                if (el.readOnly) {
                                    const blocked = [
                                        "Backspace",
                                        "Delete",
                                        "0", "1", "2", "3", "4", "5", "6", "7", "8", "9",
                                    ];
                                    if (blocked.includes(e.key)) {
                                        e.preventDefault();
                                        return;
                                    }
                                }

                                handleKeyDown(e, inputs);
                            }}
                            onInput={(e: FormEvent<HTMLInputElement>) => {
                                // run existing sanitizer and keep data-value updated
                                sanitizeInput(e);
                                const target = e.currentTarget as HTMLInputElement;
                                target.setAttribute('data-value', target.value ?? '');
                                // if this cell is focused, update the highlight to reflect typed value
                                if (document.activeElement === target) {
                                    const v = target.value;
                                    setHighlightNumber(v ? Number(v) : null);
                                }
                            }}
                            onMouseEnter={(e) => {
                                const v = (e.currentTarget as HTMLInputElement).value;
                                if (v !== '') setHighlightNumber(Number(v));
                            }}
                            onMouseLeave={() => setHighlightNumber(null)}
                            onFocus={(e) => {
                                const v = (e.currentTarget as HTMLInputElement).value;
                                if (v !== '') setHighlightNumber(Number(v));
                            }}
                            onBlur={() => setHighlightNumber(null)}
                        />
                    ))}
                </div>
            </div>

            <div className="actions">

                <h2 className="title">Actions</h2>

                <button
                    type="button"
                    onClick={() => {
                        setShowSuccess(true)
                    }}
                    className="validate-button">
                    Valider
                </button>
            </div>

            <SuccessPopup
                open={showSuccess}
                gameCode={gameCode}
                userId={userId}
                xpWin={calculateXpWin()}
            />
        </div>
    );
}