/**
 * Visite de l'écran de jeu, au premier niveau après le tutoriel : tout est grisé sauf un élément à la fois
 * (panneaux de gauche et de droite, barre d'outils sur téléphone, grille), avec une bulle qui dit à quoi il sert.
 * Les éléments absents ou cachés à cette taille d'écran sont sautés.
 */

import "./LevelTour.scss";
import {useEffect, useLayoutEffect, useState} from "react";

export type TourStep = { selector: string; text: string };

type Box = { top: number; left: number; width: number; height: number };

const visible = (selector: string) => {
    const el = document.querySelector<HTMLElement>(selector);
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0 ? el : null;
};

export default function LevelTour({steps, onDone}: { steps: TourStep[]; onDone: () => void }) {
    // étapes dont l'élément est visible, cherchées une fois la page affichée (pas pendant le premier rendu)
    const [shown, setShown] = useState<TourStep[] | null>(null);
    useEffect(() => {
        const timer = window.setTimeout(() => setShown(steps.filter(s => visible(s.selector))), 150);
        return () => window.clearTimeout(timer);
    }, [steps]);
    const [index, setIndex] = useState(0);
    const [box, setBox] = useState<Box | null>(null);
    const step = shown?.[index];

    // cadre lumineux autour de l'élément, recalculé si la page bouge
    useLayoutEffect(() => {
        if (!step) return;
        const measure = () => {
            const el = visible(step.selector);
            if (!el) return;
            el.scrollIntoView({block: "nearest"});
            const r = el.getBoundingClientRect();
            setBox({top: r.top - 6, left: r.left - 6, width: r.width + 12, height: r.height + 12});
        };
        measure();
        window.addEventListener("resize", measure);
        window.addEventListener("scroll", measure, true);
        return () => {
            window.removeEventListener("resize", measure);
            window.removeEventListener("scroll", measure, true);
        };
    }, [step]);

    // rien à montrer : fini tout de suite
    useEffect(() => {
        if (shown === null || shown.length > 0) return;
        const timer = window.setTimeout(onDone, 0);
        return () => window.clearTimeout(timer);
    }, [shown, onDone]);

    if (!shown || !step || !box) return null;

    const last = index === shown.length - 1;
    // bulle : à côté d'un grand élément (au milieu de l'écran, du côté le plus libre), sinon dessous ou au-dessus
    const vw = window.innerWidth, vh = window.innerHeight;
    const bubbleWidth = Math.min(416, vw - 32);
    const tall = box.height > vh * 0.5;
    const spaceRight = vw - (box.left + box.width), spaceLeft = box.left;
    let bubbleStyle: { top: number; left?: number; transform?: string };
    if (tall && Math.max(spaceLeft, spaceRight) >= bubbleWidth + 24) {
        const left = spaceRight >= spaceLeft ? box.left + box.width + 16 : box.left - bubbleWidth - 16;
        bubbleStyle = {top: Math.max(16, vh / 2 - 80), left, transform: "none"};
    } else if (tall) {
        bubbleStyle = {top: Math.max(16, vh / 2 - 80)};
    } else if (box.top + box.height + 180 < vh) {
        bubbleStyle = {top: Math.min(vh - 170, box.top + box.height + 14)};
    } else {
        bubbleStyle = {top: Math.max(10, box.top - 170)};
    }

    return (
        <div className="level-tour" role="dialog" aria-modal="true" aria-label="Découverte de l'écran de jeu">
            <div className="level-tour-hole" style={box}/>
            <div className="level-tour-bubble" style={bubbleStyle} key={index}>
                <span className="level-tour-count">{index + 1} / {shown.length}</span>
                <p>{step.text}</p>
                <div className="level-tour-buttons">
                    {!last && <button type="button" className="secondary" onClick={onDone}>Passer</button>}
                    <button type="button" onClick={() => (last ? onDone() : setIndex(i => i + 1))}>
                        {last ? "C'est parti !" : "Suivant"}
                    </button>
                </div>
            </div>
        </div>
    );
}
