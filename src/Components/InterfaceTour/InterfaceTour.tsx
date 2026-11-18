/**
 * Visite guidée de l'interface d'un jeu : l'écran est grisé sauf le ou les éléments de l'étape (trouvés par
 * sélecteur CSS), une bulle explique à quoi ils servent et une flèche va de la bulle au plus proche.
 * Précédent / Suivant / Passer (ou Échap). Les éléments absents ou cachés à cette taille d'écran sont ignorés ;
 * une étape sans élément visible est sautée. Suit le redimensionnement et le défilement.
 */

import "./InterfaceTour.scss";
import {useCallback, useEffect, useLayoutEffect, useRef, useState} from "react";
import {createPortal} from "react-dom";
import {nearestArrow, placeBubble, type Rect, unionRect} from "./tourLayout.ts";
import {achievementsService} from "../../Services/achievements.service.ts";

export type TourStep = {
    // un sélecteur ou plusieurs ; tous les éléments visibles qui y répondent sont montrés
    target: string | string[];
    text: string;
};

const PAD = 6;

function visibleElements(step: TourStep): HTMLElement[] {
    const selectors = Array.isArray(step.target) ? step.target : [step.target];
    return selectors.flatMap(s => [...document.querySelectorAll<HTMLElement>(s)]).filter(el => {
        const r = el.getBoundingClientRect();
        return r.width > 0 && r.height > 0;
    });
}

const padded = (el: HTMLElement): Rect => {
    const r = el.getBoundingClientRect();
    return {top: r.top - PAD, left: r.left - PAD, width: r.width + 2 * PAD, height: r.height + 2 * PAD};
};

export default function InterfaceTour({steps, onClose}: { steps: TourStep[]; onClose: () => void }) {
    // étapes qui ont quelque chose à montrer, cherchées une fois la page affichée
    const [shown, setShown] = useState<TourStep[] | null>(null);
    useEffect(() => {
        const timer = window.setTimeout(() => setShown(steps.filter(s => visibleElements(s).length > 0)), 0);
        return () => window.clearTimeout(timer);
    }, [steps]);

    const [index, setIndex] = useState(0);
    const step = shown?.[index];
    const [holes, setHoles] = useState<Rect[]>([]);
    const [view, setView] = useState({width: window.innerWidth, height: window.innerHeight});
    const bubbleRef = useRef<HTMLDivElement>(null);
    const [bubbleSize, setBubbleSize] = useState({width: 0, height: 0});

    // nouvelle étape : on amène les éléments à l'écran, puis on suit la page qui bouge
    useLayoutEffect(() => {
        if (!step) return;
        const first = visibleElements(step)[0];
        const r = first?.getBoundingClientRect();
        if (r && (r.top < 0 || r.bottom > window.innerHeight)) first.scrollIntoView({block: "center"});
        const measure = () => {
            setHoles(visibleElements(step).map(padded));
            setView({width: window.innerWidth, height: window.innerHeight});
        };
        measure();
        window.addEventListener("resize", measure);
        window.addEventListener("scroll", measure, true);
        return () => {
            window.removeEventListener("resize", measure);
            window.removeEventListener("scroll", measure, true);
        };
    }, [step]);

    // taille réelle de la bulle (selon le texte et la largeur de l'écran), pour la placer
    useLayoutEffect(() => {
        const el = bubbleRef.current;
        if (!el) return;
        const {offsetWidth: width, offsetHeight: height} = el;
        setBubbleSize(s => (s.width === width && s.height === height ? s : {width, height}));
    }, [step, holes, view]);

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose();
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [onClose]);

    // rien à montrer : fini tout de suite
    useEffect(() => {
        if (shown === null || shown.length > 0) return;
        const timer = window.setTimeout(onClose, 0);
        return () => window.clearTimeout(timer);
    }, [shown, onClose]);

    const nextRef = useRef<HTMLButtonElement>(null);
    useEffect(() => nextRef.current?.focus(), [index, shown]);

    const go = useCallback((delta: number) => setIndex(i => i + delta), []);

    if (!shown || !step || holes.length === 0) return null;

    const last = index === shown.length - 1;
    const bubble = placeBubble(unionRect(holes), bubbleSize, view, holes);
    const arrow = nearestArrow(bubble, holes);

    return createPortal(
        <div className="interface-tour" role="dialog" aria-modal="true" aria-label="Visite de l'interface">
            <svg className="interface-tour-veil" width={view.width} height={view.height} aria-hidden>
                <defs>
                    <mask id="interface-tour-mask">
                        <rect width="100%" height="100%" fill="white"/>
                        {holes.map((h, i) => <rect key={i} x={h.left} y={h.top} width={h.width} height={h.height} rx={12} fill="black"/>)}
                    </mask>
                    <marker id="interface-tour-head" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto">
                        <path d="M0,0 L10,5 L0,10 z" fill="#fbbf24"/>
                    </marker>
                </defs>
                <rect width="100%" height="100%" fill="rgba(2, 6, 23, 0.78)" mask="url(#interface-tour-mask)"/>
                {holes.map((h, i) => <rect key={i} className="interface-tour-frame" x={h.left} y={h.top} width={h.width} height={h.height} rx={12}/>)}
                {arrow && <line className="interface-tour-arrow" x1={arrow.from.x} y1={arrow.from.y} x2={arrow.to.x} y2={arrow.to.y}
                                markerEnd="url(#interface-tour-head)"/>}
            </svg>
            <div className="interface-tour-bubble" ref={bubbleRef} style={{top: bubble.top, left: bubble.left}} key={index}>
                <span className="interface-tour-count">{index + 1} / {shown.length}</span>
                <p>{step.text}</p>
                <div className="interface-tour-buttons">
                    {!last && <button type="button" className="link" onClick={onClose}>Passer</button>}
                    {index > 0 && <button type="button" className="secondary" onClick={() => go(-1)}>Précédent</button>}
                    <button type="button" ref={nextRef} onClick={() => {
                        if (!last) return go(1);
                        // succès « Visite guidée » : visite finie jusqu'au bout
                        achievementsService.report("tour");
                        onClose();
                    }}>
                        {last ? "C'est parti !" : "Suivant"}
                    </button>
                </div>
            </div>
        </div>,
        document.body,
    );
}
