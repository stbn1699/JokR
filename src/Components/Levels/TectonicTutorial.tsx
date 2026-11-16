/**
 * Tutoriel guidé du Tectonic (niveaux du tutoriel du mode Niveaux), sur le modèle de celui du Queens :
 * la grille seule et une bulle qui explique, pas de chrono ni de panneaux.
 * - un voile gris couvre la grille, sauf les cases dont on parle (en lumière) et celle à remplir (qui pulse)
 * - seule cette case répond ; l'étape suivante arrive dès qu'elle a le bon nombre
 * Les étapes viennent du guide (tectonicGuide.ts) : à chaque moment, la déduction la plus simple, avec son explication.
 */

import "../Tectonic/Tectonic.scss";
import "./TectonicTutorial.scss";
import {type CSSProperties, useEffect, useMemo, useRef, useState} from "react";
import type {TectonicCell, TectonicPuzzle} from "../../Models/tectonic.model.ts";
import {tectonicService} from "../../Services/tectonic.service.ts";
import TectonicGrid from "../Tectonic/TectonicGrid.tsx";
import LessonFrame, {type Bubble} from "./LessonFrame.tsx";
import {useLesson} from "./useLesson.ts";
import {nextTectonicStep, type TectonicStep} from "./tectonicGuide.ts";

type Props = { level: number; tutorial: number | null };

const TITLES = ["Le dernier nombre", "La seule place", "Le seul nombre"];

function explain(step: TectonicStep, first: boolean, zoneSize: number): string {
    switch (step.rule) {
        case "last":
            return first
                ? `Cette zone a ${zoneSize} cases : elle contient les nombres de 1 à ${zoneSize}. Il ne lui manque plus que le ${step.digit}.`
                : `Plus qu'une case vide dans cette zone : il lui manque le ${step.digit}.`;
        case "hidden":
            return first
                ? `Où va le ${step.digit} dans cette zone ? Les ${step.digit} en lumière bloquent toutes les cases qu'ils touchent : il ne reste qu'une place.`
                : `Une seule place pour le ${step.digit} dans cette zone.`;
        case "naked":
            return first
                ? `Les autres nombres sont déjà dans sa zone ou la touchent : il ne reste que le ${step.digit}.`
                : `Cette case ne peut prendre que le ${step.digit}.`;
    }
}

export default function TectonicTutorial({level, tutorial}: Props) {
    const lesson = useLesson<TectonicPuzzle>("TECTONIC", level);
    const puzzle = lesson.grid;
    const [values, setValues] = useState<TectonicCell[]>([]);
    const [intro, setIntro] = useState(0);
    const [explained, setExplained] = useState<string | null>(null);
    const [seen, setSeen] = useState<Set<string>>(new Set());

    useEffect(() => {
        if (!puzzle) return;
        const timer = window.setTimeout(() => setValues(puzzle.cells), 0);
        return () => window.clearTimeout(timer);
    }, [puzzle]);

    const loaded = puzzle !== null && values.length === puzzle.cells.length;
    // Étape en cours : figée jusqu'à ce que sa case ait le bon nombre (en faisant défiler les nombres, la case passe
    // par d'autres valeurs : le guide verrait sinon une autre étape)
    const [step, setStep] = useState<TectonicStep | null>(null);
    // grille pleine avec la dernière case juste (pleine avec un mauvais nombre : on attend la correction)
    const solved = loaded && values.every(v => v !== null) && (step === null || values[step.cell] === step.digit);
    useEffect(() => {
        if (!loaded || solved || (step && values[step.cell] !== step.digit)) return;
        const next = nextTectonicStep(puzzle, values);
        const timer = window.setTimeout(() => setStep(next), 0);
        return () => window.clearTimeout(timer);
    }, [loaded, solved, puzzle, values, step]);
    const stepKey = step ? `${step.rule}:${step.cell}` : null;

    // Techniques déjà faites dans cette leçon (textes plus courts ensuite)
    const lastRule = useRef<string | null>(null);
    useEffect(() => {
        const previous = lastRule.current;
        lastRule.current = stepKey;
        if (!previous || previous === stepKey) return;
        const timer = window.setTimeout(() => setSeen(s => new Set(s).add(previous.split(":")[0]!)), 0);
        return () => window.clearTimeout(timer);
    }, [stepKey]);

    const intros = useMemo(() => {
        if (level === 1) {
            return [
                "Bienvenue dans le Tectonic ! La grille est découpée en zones de 1 à 5 cases.",
                "Une zone de 3 cases contient 1, 2 et 3 ; une zone de 5 cases, les nombres de 1 à 5. Et deux cases qui se touchent, même en diagonale, n'ont jamais le même nombre.",
            ];
        }
        if (level === 2) return ["Leçon 2 : la seule place. On prend un nombre et une zone, et on cherche où ce nombre peut aller."];
        return ["Leçon 3 : le seul nombre. Cette fois, on prend une case et on cherche quel nombre elle peut recevoir."];
    }, [level]);

    // Grille finie : validée par le serveur
    useEffect(() => {
        if (!solved || lesson.done) return;
        const final = values as number[];
        lesson.finish(id => tectonicService.validate(id, final));
        // lesson.finish ne change pas de rôle d'un rendu à l'autre
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [solved]);

    let bubble: Bubble | null = null;
    let lit: number[] = [];
    let target: number | null = null;
    // case dont on parle pendant une explication (en lumière, mais pas encore à remplir)
    let focus: number | null = null;
    // cases où le nombre cherché est interdit (la seule place)
    let blocked: number[] = [];
    if (loaded && !solved) {
        if (intro < intros.length) {
            bubble = {text: intros[intro]!, button: intro === 0 ? "C'est parti" : "Suivant", onButton: () => setIntro(n => n + 1)};
            lit = values.map((_, i) => i);
        } else if (step) {
            const first = !seen.has(step.rule);
            if (step.rule === "naked" && first && explained !== stepKey) {
                bubble = {text: "Regarde cette case : sa zone et les cases qui la touchent sont en lumière…", button: "Je vois", onButton: () => setExplained(stepKey)};
                lit = step.spotlight;
                focus = step.cell;
            } else {
                const zoneSize = puzzle.regions.filter(z => z === puzzle.regions[step.cell]).length;
                let text = explain(step, first, zoneSize);
                if (level === 1 && values.every((v, i) => v === null || puzzle.cells[i] !== null)) {
                    text += " Touche la case qui pulse pour faire défiler les nombres (au clavier : tape le nombre).";
                }
                bubble = {text};
                lit = step.spotlight;
                target = step.cell;
                if (step.rule === "hidden") {
                    blocked = values.flatMap((v, i) => (v === null && i !== step.cell && puzzle.regions[i] === puzzle.regions[step.cell] ? [i] : []));
                }
            }
        }
    }

    const litSet = new Set([...lit, ...[target, focus].filter((c): c is number => c !== null)]);
    const blockedSet = new Set(blocked);
    const veiled = bubble !== null && litSet.size < values.length;
    // seule la case qui pulse répond
    const setCell = (i: number, v: TectonicCell) => {
        if (solved || i !== target) return;
        setValues(old => old.map((x, k) => (k === i ? v : x)));
    };

    return (
        <LessonFrame gameCode="TECTONIC" playName="au Tectonic" className="tectonic" level={level} tutorial={tutorial} titles={TITLES}
                     loading={!loaded} error={lesson.error} bubble={bubble} checking={solved} done={lesson.done}>
            {loaded && (
                <div className={`tutorial-stage game ${veiled ? "veiled" : ""}`} style={{"--size": puzzle.width} as CSSProperties}>
                    <TectonicGrid puzzle={puzzle} values={values} isClue={i => puzzle.cells[i] !== null} revealed={values.length}
                                  disabled={solved} selectedCell={target} onSelectCell={() => undefined} highlightDigit={null}
                                  onSetCell={setCell} errors={null} notes={[]} notesMode={false} onToggleNote={() => undefined}
                                  focusCell={solved ? null : target} oneTap/>
                    <div className="tutorial-veil" aria-hidden>
                        {values.map((_, i) => (
                            <span key={i} className={i === target || i === focus ? "target" : blockedSet.has(i) ? "blocked" : litSet.has(i) || !veiled ? "lit" : "dark"}/>
                        ))}
                    </div>
                </div>
            )}
        </LessonFrame>
    );
}
