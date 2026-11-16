/**
 * Tutoriel guidé du Sudoku (niveaux du tutoriel du mode Niveaux), sur le modèle de celui du Queens :
 * la grille seule et une bulle qui explique, pas de chrono ni de panneaux.
 * - un voile gris couvre la grille, sauf les cases dont on parle (en lumière) et celle à remplir (qui pulse)
 * - on touche la case qui pulse, puis un chiffre du pavé (ou au clavier) ; un mauvais chiffre s'affiche en rouge
 * Les étapes viennent du guide (sudokuGuide.ts) : à chaque moment, la déduction la plus simple, avec son explication.
 */

import "./SudokuTutorial.scss";
import {type CSSProperties, type KeyboardEvent, useEffect, useMemo, useRef, useState} from "react";
import {gameService} from "../../Services/game.service.ts";
import LessonFrame, {type Bubble} from "./LessonFrame.tsx";
import {useLesson} from "./useLesson.ts";
import {nextSudokuStep, SUDOKU_GROUPS, type SudokuStep} from "./sudokuGuide.ts";

type Props = { level: number; tutorial: number | null };

const TITLES = ["Le dernier chiffre", "La seule place", "Le seul chiffre"];
const DIGITS = [1, 2, 3, 4, 5, 6, 7, 8, 9];

// Explication d'une déduction (`first` : première fois dans cette leçon ; `misses` : mauvais chiffres essayés)
function explain(step: SudokuStep, first: boolean, misses: number): string {
    const reveal = misses >= 2 ? ` (c'est le ${step.digit})` : "";
    switch (step.rule) {
        case "last":
            return first
                ? `Ce${step.group === "carré" ? "" : "tte"} ${step.group} n'a plus qu'une case vide : il lui manque un seul chiffre, le ${step.digit}.`
                : `Plus qu'une case vide dans ce${step.group === "carré" ? "" : "tte"} ${step.group} : quel chiffre manque ?${reveal}`;
        case "hidden":
            return first
                ? `Où va le ${step.digit} dans ce${step.group === "carré" ? "" : "tte"} ${step.group} ? Les ${step.digit} en lumière bloquent leur ligne, leur colonne et leur carré : il ne reste qu'une case possible.`
                : `Il n'y a qu'une place pour le ${step.digit} dans ce${step.group === "carré" ? "" : "tte"} ${step.group}.`;
        case "naked":
            return first
                ? `Sa ligne, sa colonne et son carré contiennent déjà tous les chiffres sauf un : c'est le seul possible ici. Lequel ?${reveal}`
                : `Cette case ne peut prendre qu'un chiffre : lequel ?${reveal}`;
    }
}

export default function SudokuTutorial({level, tutorial}: Props) {
    const lesson = useLesson<number[][]>("SUDOKU", level);
    const [values, setValues] = useState<number[]>([]);
    const [clues, setClues] = useState<Set<number>>(new Set());
    const [wrong, setWrong] = useState<{ cell: number; digit: number } | null>(null);
    const [misses, setMisses] = useState(0);
    const [intro, setIntro] = useState(0);
    const [explained, setExplained] = useState<string | null>(null);
    const [seen, setSeen] = useState<Set<string>>(new Set());
    const cells = useRef<(HTMLButtonElement | null)[]>([]);

    useEffect(() => {
        if (!lesson.grid) return;
        const flat = lesson.grid.flat();
        const timer = window.setTimeout(() => {
            setValues(flat);
            setClues(new Set(flat.flatMap((v, i) => (v === 0 ? [] : [i]))));
        }, 0);
        return () => window.clearTimeout(timer);
    }, [lesson.grid]);

    const loaded = values.length === 81;
    const solved = loaded && values.every(v => v !== 0);
    const step = useMemo(() => (loaded && !solved ? nextSudokuStep(values) : null), [loaded, solved, values]);
    const stepKey = step ? `${step.rule}:${step.cell}` : null;

    // Techniques déjà faites dans cette leçon (textes plus courts ensuite) ; mauvais essais remis à zéro à chaque étape
    const lastStep = useRef<string | null>(null);
    useEffect(() => {
        const previous = lastStep.current;
        lastStep.current = stepKey;
        if (!previous || previous === stepKey) return;
        const timer = window.setTimeout(() => {
            setSeen(s => new Set(s).add(previous.split(":")[0]!));
            setMisses(0);
            setWrong(null);
        }, 0);
        return () => window.clearTimeout(timer);
    }, [stepKey]);

    const intros = useMemo(() => {
        if (level === 1) {
            return [
                "Bienvenue dans le Sudoku ! Le but : remplir la grille avec les chiffres de 1 à 9.",
                "Chaque ligne, chaque colonne et chaque carré de 3×3 contient une seule fois chaque chiffre.",
            ];
        }
        if (level === 2) return ["Leçon 2 : la seule place. On prend un chiffre et un carré, et on cherche où ce chiffre peut aller."];
        return ["Leçon 3 : le seul chiffre. Cette fois, on prend une case et on cherche quel chiffre elle peut recevoir."];
    }, [level]);

    // Grille finie : validée par le serveur
    useEffect(() => {
        if (!solved || lesson.done) return;
        const grid = Array.from({length: 9}, (_, r) => values.slice(r * 9, r * 9 + 9));
        lesson.finish(id => gameService.validateSudoku(id, grid));
        // lesson.finish ne change pas de rôle d'un rendu à l'autre
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [solved]);

    let bubble: Bubble | null = null;
    let lit: number[] = [];
    let target: number | null = null;
    // case dont on parle pendant une explication (en lumière, mais pas encore à remplir)
    let focus: number | null = null;
    // cases où le chiffre cherché est interdit (la seule place)
    let blocked: number[] = [];
    if (loaded && !solved) {
        const all = values.map((_, i) => i);
        if (intro < intros.length) {
            bubble = {text: intros[intro]!, button: intro === 0 ? "C'est parti" : "Suivant", onButton: () => setIntro(n => n + 1)};
            lit = all;
        } else if (step) {
            const first = !seen.has(step.rule);
            if (step.rule === "naked" && first && explained !== stepKey) {
                bubble = {text: "Regarde cette case : sa ligne, sa colonne et son carré sont en lumière…", button: "Je vois", onButton: () => setExplained(stepKey)};
                lit = step.spotlight;
                focus = step.cell;
            } else {
                let text = explain(step, first, misses);
                if (level === 1 && values.filter((v, i) => v !== 0 && !clues.has(i)).length === 0) {
                    text += " Touche ce chiffre sur le pavé (ou tape-le au clavier).";
                }
                if (wrong && wrong.cell === step.cell) text = `Pas le ${wrong.digit} : il est déjà dans sa ligne, sa colonne ou son carré. ${text}`;
                bubble = {text};
                lit = step.spotlight;
                target = step.cell;
                if (step.rule === "hidden") {
                    const group = SUDOKU_GROUPS.find(g => g.kind === step.group && g.cells.includes(step.cell))!;
                    blocked = group.cells.filter(i => values[i] === 0 && i !== step.cell);
                }
            }
        }
    }

    const put = (digit: number) => {
        if (target === null || !step) return;
        if (digit === step.digit) {
            setValues(v => v.map((x, i) => (i === target ? digit : x)));
            setWrong(null);
        } else {
            setWrong({cell: target, digit});
            setMisses(m => m + 1);
        }
    };
    const onKeyDown = (e: KeyboardEvent<HTMLButtonElement>) => {
        if (/^[1-9]$/.test(e.key)) {
            e.preventDefault();
            put(Number(e.key));
        }
    };

    // case à remplir choisie d'avance : elle prend le focus (le clavier y écrit)
    useEffect(() => {
        if (target !== null) cells.current[target]?.focus({preventScroll: true});
    }, [target]);

    const litSet = new Set([...lit, ...[target, focus].filter((c): c is number => c !== null)]);
    const blockedSet = new Set(blocked);
    const veiled = bubble !== null && litSet.size < 81;

    return (
        <LessonFrame gameCode="SUDOKU" playName="au Sudoku" className="sudoku-lesson" level={level} tutorial={tutorial} titles={TITLES}
                     loading={!loaded} error={lesson.error} bubble={bubble} checking={solved} done={lesson.done}>
            <div className={`tutorial-stage ${veiled ? "veiled" : ""}`} style={{"--size": 9} as CSSProperties}>
                <div className="sudoku-lesson-grid">
                    {values.map((v, i) => {
                        const isWrong = wrong?.cell === i;
                        const classes = ["cell", clues.has(i) ? "given" : "", i === target ? "selected" : "", isWrong ? "wrong" : "",
                            i % 9 === 2 || i % 9 === 5 ? "box-right" : "", Math.floor(i / 9) === 2 || Math.floor(i / 9) === 5 ? "box-bottom" : ""];
                        return (
                            <button key={i} type="button" className={classes.join(" ")} disabled={clues.has(i) || solved}
                                    ref={el => {
                                        cells.current[i] = el;
                                    }}
                                    aria-label={`Ligne ${Math.floor(i / 9) + 1}, colonne ${i % 9 + 1}`}
                                    onKeyDown={onKeyDown}>
                                {v !== 0 ? v : isWrong ? wrong.digit : ""}
                            </button>
                        );
                    })}
                </div>
                <div className="tutorial-veil" aria-hidden>
                    {values.map((_, i) => (
                        <span key={i} className={i === target || i === focus ? "target" : blockedSet.has(i) ? "blocked" : litSet.has(i) || !veiled ? "lit" : "dark"}/>
                    ))}
                </div>
            </div>
            <div className="sudoku-lesson-pad" aria-label="Chiffres">
                {DIGITS.map(d => (
                    <button key={d} type="button" disabled={target === null} onClick={() => {
                        put(d);
                        if (target !== null) cells.current[target]?.focus();
                    }}>{d}</button>
                ))}
            </div>
        </LessonFrame>
    );
}
