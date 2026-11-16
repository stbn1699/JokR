/**
 * Tutoriel guidé du Shikaku (niveaux du tutoriel du mode Niveaux), sur le modèle de celui du Queens :
 * la grille seule et une bulle qui explique, pas de chrono ni de panneaux.
 * - une ombre couvre les cases dont on ne parle pas ; le rectangle à tracer brille
 * - seul ce rectangle se trace (en glissant d'un coin à l'autre) ; l'étape suivante arrive dès qu'il l'est
 * Les étapes viennent du guide (shikakuGuide.ts) : des cases qui reviennent à un nombre (avec l'explication et un
 * bouton pour continuer), puis les rectangles qui n'ont plus qu'une place.
 */

import "../Shikaku/Shikaku.scss";
import "./ShikakuTutorial.scss";
import {useEffect, useMemo, useState} from "react";
import type {Rect, ShikakuPuzzle} from "../../Models/shikaku.model.ts";
import {shikakuService} from "../../Services/shikaku.service.ts";
import {analyzeRects, sameRect} from "../Shikaku/shikakuRules.ts";
import ShikakuBoard from "../Shikaku/ShikakuBoard.tsx";
import LessonFrame, {type Bubble} from "./LessonFrame.tsx";
import {useLesson} from "./useLesson.ts";
import {planShikaku} from "./shikakuGuide.ts";

type Props = { level: number; tutorial: number | null };

const TITLES = ["Le seul rectangle", "La case orpheline", "Les cases sûres"];

export default function ShikakuTutorial({level, tutorial}: Props) {
    const lesson = useLesson<ShikakuPuzzle>("SHIKAKU", level);
    const puzzle = lesson.grid;
    const [drawn, setDrawn] = useState<Rect[]>([]);
    const [intro, setIntro] = useState(0);
    const [read, setRead] = useState<Set<number>>(new Set());

    const plan = useMemo(() => (puzzle ? planShikaku(puzzle).steps : []), [puzzle]);
    const rects = useMemo(() => [...(puzzle?.rects ?? []), ...drawn], [puzzle, drawn]);
    const analysis = useMemo(() => (puzzle ? analyzeRects(puzzle, rects) : null), [puzzle, rects]);
    const solved = analysis?.solution != null;

    // Étape en cours : la première pas encore faite (rectangle pas tracé, ou explication pas encore lue)
    const index = plan.findIndex((s, i) => (s.kind === "draw" ? !drawn.some(r => sameRect(r, s.rect)) : !read.has(i)));
    const step = index >= 0 ? plan[index]! : null;

    const intros = useMemo(() => {
        if (level === 1) {
            return [
                "Bienvenue dans le Shikaku ! Le but : découper toute la grille en rectangles.",
                "Chaque rectangle contient un seul nombre, et ce nombre dit combien de cases il a.",
            ];
        }
        if (level === 2) return ["Leçon 2 : la case orpheline. Parfois on ne regarde pas un nombre, mais une case vide : qui peut l'atteindre ?"];
        return ["Leçon 3 : les cases sûres. Quand un nombre hésite entre plusieurs places, certaines cases sont à lui dans tous les cas."];
    }, [level]);

    // Grille finie : validée par le serveur
    useEffect(() => {
        if (!solved || !analysis?.solution || lesson.done) return;
        const regions = analysis.solution;
        lesson.finish(id => shikakuService.validate(id, regions));
        // lesson.finish ne change pas de rôle d'un rendu à l'autre
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [solved]);

    let bubble: Bubble | null = null;
    let lit: number[] | null = null;
    let focus: number[] = [];
    let target: Rect | null = null;
    if (puzzle && !solved) {
        const area = (clue: number) => puzzle.clues[clue]!.area;
        const before = plan.slice(0, Math.max(0, index));
        if (intro < intros.length) {
            bubble = {text: intros[intro]!, button: intro === 0 ? "C'est parti" : "Suivant", onButton: () => setIntro(n => n + 1)};
        } else if (step?.kind === "reserve") {
            const first = !before.some(s => s.kind === "reserve" && s.why === step.why);
            const text = step.why === "cell"
                ? first
                    ? `${step.cells.length > 1 ? "Ces cases ne peuvent" : "Cette case ne peut"} être atteinte${step.cells.length > 1 ? "s" : ""} que par ce ${area(step.clue)} : aucun autre nombre n'a de rectangle qui passe par là. ${step.cells.length > 1 ? "Elles seront" : "Elle sera"} dans son rectangle.`
                    : `Seul ce ${area(step.clue)} peut atteindre ${step.cells.length > 1 ? "ces cases" : "cette case"}.`
                : first
                    ? `Où qu'il se place, le rectangle de ce ${area(step.clue)} couvre toujours ${step.cells.length > 1 ? "ces cases" : "cette case"} : ${step.cells.length > 1 ? "elles sont" : "elle est"} à lui, aucun autre nombre ne peut les prendre.`
                    : `${step.cells.length > 1 ? "Ces cases sont" : "Cette case est"} à ce ${area(step.clue)}, quelle que soit sa place.`;
            bubble = {text, button: first ? "Je vois" : "Suivant", onButton: () => setRead(r => new Set(r).add(index))};
            lit = step.spotlight;
            focus = step.cells;
        } else if (step?.kind === "draw") {
            const firstDraw = !before.some(s => s.kind === "draw");
            let text = before.at(-1)?.kind === "reserve"
                ? `Du coup, ce ${area(step.clue)} n'a plus qu'une place possible : trace son rectangle.`
                : `Ce ${area(step.clue)} n'a qu'une place possible : trace son rectangle.`;
            if (level === 1 && firstDraw) {
                text = `Ce ${area(step.clue)} ne peut se placer que d'une façon : le rectangle qui brille. Glisse d'un coin à l'autre pour le tracer.`;
            }
            bubble = {text};
            lit = step.cells;
            target = step.rect;
        }
    }

    // seul le rectangle qui brille se trace ; rien ne s'efface
    const draw = (rect: Rect) => {
        if (target && sameRect(rect, target)) setDrawn(d => [...d, rect]);
    };

    return (
        <LessonFrame gameCode="SHIKAKU" playName="au Shikaku" className="shikaku" level={level} tutorial={tutorial} titles={TITLES}
                     loading={!puzzle || !analysis} error={lesson.error} bubble={bubble} checking={solved} done={lesson.done}>
            {puzzle && analysis && (
                <ShikakuBoard puzzle={puzzle} rects={rects} hintCount={puzzle.rects.length} analysis={analysis} disabled={solved}
                              onDraw={draw} onErase={() => undefined} showErrors={false}
                              guide={bubble ? {lit: lit === null ? null : new Set(lit), focus, target} : undefined}/>
            )}
        </LessonFrame>
    );
}
