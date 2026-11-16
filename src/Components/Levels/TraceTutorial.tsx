/**
 * Tutoriel guidé du Tracé (niveaux du tutoriel du mode Niveaux), sur le modèle de celui du Queens :
 * la grille seule et une bulle qui explique, pas de chrono ni de panneaux.
 * - une ombre couvre les cases dont on ne parle pas ; la case où avancer pulse
 * - le chemin n'avance que vers la case qui pulse (on peut en enchaîner plusieurs d'un seul geste)
 * Les étapes viennent du guide (traceGuide.ts) : à chaque pas, pourquoi la case suivante est forcée.
 */

import "../Trace/Trace.scss";
import "./TraceTutorial.scss";
import {useEffect, useMemo, useRef, useState} from "react";
import type {TracePuzzle} from "../../Models/trace.model.ts";
import {traceService} from "../../Services/trace.service.ts";
import {wallSet} from "../Trace/traceRules.ts";
import TraceBoard from "../Trace/TraceBoard.tsx";
import LessonFrame, {type Bubble} from "./LessonFrame.tsx";
import {useLesson} from "./useLesson.ts";
import {nextTraceStep, type TraceStep} from "./traceGuide.ts";

type Props = { level: number; tutorial: number | null };

const TITLES = ["Un seul passage", "Dans l'ordre", "Le cul-de-sac"];

// Les pas du chemin, du 1 jusqu'à la dernière case
function planTrace(puzzle: TracePuzzle): TraceStep[] {
    const path = [puzzle.numbers.find(n => n.value === 1)!.cell];
    const steps: TraceStep[] = [];
    for (let step = nextTraceStep(puzzle, path); step; step = nextTraceStep(puzzle, path)) {
        steps.push(step);
        path.push(step.cell);
    }
    return steps;
}

export default function TraceTutorial({level, tutorial}: Props) {
    const lesson = useLesson<TracePuzzle>("TRACE", level);
    const puzzle = lesson.grid;
    const walls = useMemo(() => (puzzle ? wallSet(puzzle) : new Set<string>()), [puzzle]);
    const steps = useMemo(() => (puzzle ? planTrace(puzzle) : []), [puzzle]);
    const [path, setPath] = useState<number[]>([]);
    // valeur à jour tout de suite : un glissé enchaîne les cases plus vite que les rendus
    const pathRef = useRef<number[]>([]);
    const [intro, setIntro] = useState(0);
    const [read, setRead] = useState<Set<number>>(new Set());

    useEffect(() => {
        if (!puzzle) return;
        const start = [puzzle.numbers.find(n => n.value === 1)!.cell];
        pathRef.current = start;
        const timer = window.setTimeout(() => setPath(start), 0);
        return () => window.clearTimeout(timer);
    }, [puzzle]);

    const loaded = puzzle !== null && path.length > 0;
    const solved = loaded && path.length === puzzle.size * puzzle.size;
    const index = path.length - 1;
    const step = loaded && !solved ? steps[index] ?? null : null;
    // première fois qu'une technique sert : d'abord l'explication
    const firstOf = (rule: TraceStep["rule"]) => steps.findIndex(s => s.rule === rule);
    const explaining = step !== null && step.rule !== "only" && firstOf(step.rule) === index && !read.has(index);

    const intros = useMemo(() => {
        if (level === 1) {
            return [
                "Bienvenue dans le Tracé ! Le but : relier les numéros dans l'ordre (1, 2, 3…) par un seul chemin.",
                "Le chemin passe par toutes les cases, une seule fois chacune, sans traverser les murs épais.",
            ];
        }
        if (level === 2) return ["Leçon 2 : dans l'ordre. Le chemin passe sur les numéros dans l'ordre : pas question de toucher le 4 avant le 3 !"];
        return ["Leçon 3 : le cul-de-sac. Chaque case doit être traversée : il ne faut jamais en laisser une sans sortie."];
    }, [level]);

    // Chemin fini : validé par le serveur
    useEffect(() => {
        if (!solved || lesson.done) return;
        const final = path;
        lesson.finish(id => traceService.validate(id, final));
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
            const first = firstOf(step.rule) === index;
            let text: string;
            if (explaining && step.rule === "order") {
                text = "Plusieurs cases sont libres, mais on ne passe sur un numéro qu'à son tour (et sur l'arrivée en tout dernier).";
            } else if (explaining) {
                text = "Regarde la case qui pulse : à part la case où tu es, elle n'a plus qu'une seule voisine libre. Si tu n'y vas pas maintenant, ce sera un cul-de-sac : le chemin y entrerait sans pouvoir en ressortir.";
            } else if (step.rule === "order") {
                text = first ? "Il ne reste donc qu'une case possible : avance." : "Ce numéro n'est pas encore à son tour : prends l'autre case.";
            } else if (step.rule === "deadend") {
                text = first ? "Va dans cette case maintenant." : "Sinon cette case deviendrait un cul-de-sac : vas-y maintenant.";
            } else if (level === 1 && index === 0) {
                text = "Pars du 1 : glisse le doigt (ou la souris) vers la case qui pulse. Tu peux enchaîner plusieurs cases d'un seul geste.";
            } else {
                // leçon 1 : le premier pas sert au geste, l'explication vient au deuxième
                text = (level === 1 ? index === 1 : first) ? "D'ici, une seule case est libre : les autres sont déjà prises, derrière un mur ou hors de la grille. Avance !"
                    : "Une seule case possible : avance.";
            }
            bubble = explaining ? {text, button: "Je vois", onButton: () => setRead(r => new Set(r).add(index))} : {text};
            lit = step.spotlight;
            target = step.cell;
        }
    }

    // le chemin n'avance que vers la case attendue, et pas pendant une explication ni l'introduction
    const enter = (cell: number) => {
        const current = pathRef.current;
        const next = steps[current.length - 1];
        if (!next || cell !== next.cell || intro < intros.length) return;
        const needsRead = next.rule !== "only" && firstOf(next.rule) === current.length - 1 && !read.has(current.length - 1);
        if (needsRead) return;
        pathRef.current = [...current, cell];
        setPath(pathRef.current);
    };

    return (
        <LessonFrame gameCode="TRACE" playName="au Tracé" className="trace" level={level} tutorial={tutorial} titles={TITLES}
                     loading={!loaded} error={lesson.error} bubble={bubble} checking={solved} done={lesson.done}>
            {loaded && (
                <div className="game trace-lesson-board">
                    <TraceBoard puzzle={puzzle} path={path} walls={walls} disabled={solved} solved={solved}
                                onBegin={() => undefined} onEnter={enter} onEnd={() => undefined} onStep={enter}
                                guide={bubble ? {lit: lit === null ? null : new Set(lit), target} : undefined}/>
                </div>
            )}
        </LessonFrame>
    );
}
