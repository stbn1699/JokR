/**
 * Tutoriel guidé du Rikudo (niveaux du tutoriel du mode Niveaux), sur le modèle de celui du Queens :
 * le plateau seul et une bulle qui explique, pas de chrono ni de panneaux.
 * - une ombre couvre les cases dont on ne parle pas ; la case à remplir pulse
 * - on touche la case qui pulse, puis le nombre sous le plateau (ou on le tape au clavier)
 * Les étapes viennent du guide (rikudoGuide.ts) : à chaque moment, la déduction la plus simple, avec son explication.
 */

import "../Rikudo/Rikudo.scss";
import "./RikudoTutorial.scss";
import {useEffect, useMemo, useRef, useState} from "react";
import type {RikudoCell, RikudoPuzzle} from "../../Models/rikudo.model.ts";
import {rikudoService} from "../../Services/rikudo.service.ts";
import {hexBoard} from "../Rikudo/rikudoRules.ts";
import RikudoBoard from "../Rikudo/RikudoBoard.tsx";
import LessonFrame, {type Bubble} from "./LessonFrame.tsx";
import {useLesson} from "./useLesson.ts";
import {nextRikudoStep, type RikudoStep} from "./rikudoGuide.ts";

type Props = { level: number; tutorial: number | null };

const TITLES = ["Le chaînon manquant", "La bonne distance", "Les points"];

function explain(step: RikudoStep, first: boolean, values: RikudoCell[]): string {
    const v = step.value;
    switch (step.rule) {
        case "gap":
            return first
                ? `Le ${v - 1} et le ${v + 1} sont posés : le ${v} doit toucher les deux. Une seule case vide les touche tous les deux.`
                : `Le ${v} va entre le ${v - 1} et le ${v + 1}.`;
        case "near": {
            const parts = [step.before, step.after].filter((w): w is number => w !== undefined && w >= 1 && w !== v)
                .map(w => (Math.abs(v - w) === 1 ? `toucher le ${w}` : `rester à ${Math.abs(v - w)} pas au plus du ${w}`));
            return first
                ? `Où va le ${v} ? Il doit ${parts.join(", et ")} : une seule case vide convient.`
                : `Une seule case vide est à bonne distance pour le ${v}.`;
        }
        case "link": {
            if (step.via === "exclude") {
                return `Un point oblige ses deux cases à se suivre : le ${v} ne tient sur aucune autre case vide. Il va ici.`;
            }
            const w = values[step.linkedTo!]!;
            const other = w - 1 === v ? w + 1 : w - 1;
            const intro = "Le point entre ces deux cases veut dire que leurs nombres se suivent";
            if (!first) return `Grâce au point, cette case va avec le ${w} : c'est le ${v}.`;
            return other < 1 || other > values.length
                ? `${intro} : à côté du ${w}, ce ne peut être que le ${v}.`
                : `${intro} : à côté du ${w}, il faut le ${w - 1} ou le ${w + 1}. Or le ${other} est déjà posé ailleurs : c'est le ${v}.`;
        }
    }
}

export default function RikudoTutorial({level, tutorial}: Props) {
    const lesson = useLesson<RikudoPuzzle>("RIKUDO", level);
    const puzzle = lesson.grid;
    const board = useMemo(() => (puzzle ? hexBoard(puzzle.radius) : null), [puzzle]);
    const [values, setValues] = useState<RikudoCell[]>([]);
    const [wrong, setWrong] = useState<number | null>(null);
    const [pending, setPending] = useState<number | null>(null);
    const [intro, setIntro] = useState(0);
    const [seen, setSeen] = useState<Set<string>>(new Set());

    useEffect(() => {
        if (!puzzle) return;
        const timer = window.setTimeout(() => setValues(puzzle.cells), 0);
        return () => window.clearTimeout(timer);
    }, [puzzle]);

    const loaded = puzzle !== null && board !== null && values.length === puzzle.cells.length;
    // Étape en cours : figée jusqu'à ce que sa case ait le bon nombre (au clavier, 1 puis 6 passe par le 1)
    const [step, setStep] = useState<RikudoStep | null>(null);
    // plateau plein avec la dernière case juste (plein avec un mauvais nombre : on attend la correction)
    const solved = loaded && values.every(v => v !== null) && (step === null || values[step.cell] === step.value);
    useEffect(() => {
        if (!loaded || solved || (step && values[step.cell] !== step.value)) return;
        const next = nextRikudoStep(puzzle, values);
        const timer = window.setTimeout(() => setStep(next), 0);
        return () => window.clearTimeout(timer);
    }, [loaded, solved, puzzle, values, step]);
    const stepKey = step ? `${step.rule}:${step.cell}` : null;

    const lastRule = useRef<string | null>(null);
    useEffect(() => {
        const previous = lastRule.current;
        lastRule.current = stepKey;
        if (!previous || previous === stepKey) return;
        const timer = window.setTimeout(() => {
            setSeen(s => new Set(s).add(previous.split(":")[0]!));
            setWrong(null);
        }, 0);
        return () => window.clearTimeout(timer);
    }, [stepKey]);

    const intros = useMemo(() => {
        const n = puzzle?.cells.length ?? 18;
        if (level === 1) {
            return [
                `Bienvenue dans le Rikudo ! Le but : placer les nombres de 1 à ${n} dans les cases.`,
                `Les nombres se suivent de case en case : le 2 touche le 1, le 3 touche le 2… jusqu'au ${n}. Ensemble, ils forment un seul chemin.`,
            ];
        }
        if (level === 2) return ["Leçon 2 : la bonne distance. Entre le 4 et le 9, il y a 5 pas : chaque nombre doit rester à portée de ceux posés avant et après lui."];
        return ["Leçon 3 : les points. Un point entre deux cases veut dire que leurs nombres se suivent."];
    }, [level, puzzle]);

    // Grille finie : validée par le serveur
    useEffect(() => {
        if (!solved || lesson.done) return;
        const final = values as number[];
        lesson.finish(id => rikudoService.validate(id, final));
        // lesson.finish ne change pas de rôle d'un rendu à l'autre
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [solved]);

    let bubble: Bubble | null = null;
    let lit: number[] | null = null;
    let target: number | null = null;
    if (loaded && !solved) {
        if (intro < intros.length) {
            bubble = {text: intros[intro]!, button: intro === 0 ? "C'est parti" : "Suivant", onButton: () => setIntro(n => n + 1)};
        } else if (step) {
            let text = explain(step, !seen.has(step.rule), values);
            if (level === 1 && values.every((v, i) => v === null || puzzle.cells[i] !== null)) {
                text += " Touche ce nombre sous le plateau (ou tape-le au clavier).";
            }
            if (wrong !== null) text = `Pas le ${wrong} ! ${text}`;
            bubble = {text};
            lit = step.spotlight;
            target = step.cell;
        }
    }

    // nombres pas encore posés, à choisir sous le plateau
    const missing = loaded ? Array.from({length: values.length}, (_, k) => k + 1).filter(v => !values.includes(v)) : [];
    const setCell = (i: number, v: RikudoCell) => {
        if (solved || i !== target) return;
        setValues(old => old.map((x, k) => (k === i ? v : x)));
    };
    const pick = (v: number) => {
        if (target === null || !step) return;
        if (v === step.value) setCell(target, v);
        else setWrong(v);
    };

    return (
        <LessonFrame gameCode="RIKUDO" playName="au Rikudo" className="rikudo" level={level} tutorial={tutorial} titles={TITLES}
                     loading={!loaded} error={lesson.error} bubble={bubble} checking={solved} done={lesson.done}>
            {loaded && (
                <div className="game rikudo-lesson-board">
                    <RikudoBoard board={board} values={values} links={puzzle.links} isClue={i => puzzle.cells[i] !== null}
                                 revealed={values.length} disabled={solved} selectedCell={target} onSelectCell={() => undefined} highlightNumber={null} onSetCell={setCell} errors={null} pendingCell={pending} onPendingChange={setPending}
                                 guide={bubble ? {lit: lit === null ? null : new Set(lit), target} : undefined}
                                 focusCell={solved ? null : target}/>
                </div>
            )}
            {loaded && !solved && (
                <div className="rikudo-lesson-pad" aria-label="Nombres à placer">
                    {missing.map(v => (
                        <button key={v} type="button" disabled={target === null} onClick={() => pick(v)}>{v}</button>
                    ))}
                </div>
            )}
        </LessonFrame>
    );
}
