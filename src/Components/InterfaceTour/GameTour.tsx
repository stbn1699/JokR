/**
 * Visite de l'interface d'un jeu de hasard, proposée à la première ouverture de sa page : une petite fenêtre
 * demande « Voulez-vous un petit tutoriel ? ». La réponse (oui ou non) est retenue par jeu dans le navigateur
 * (jokr:tour:<CODE>), la question ne revient plus. `running` / `onRunningChange` permettent de la relancer
 * (bouton « Visite guidée » de la fenêtre des règles). Attend que la popup des nouveautés soit fermée.
 */

import {useEffect, useRef, useState} from "react";
import {createPortal} from "react-dom";
import InterfaceTour, {type TourStep} from "./InterfaceTour.tsx";
import {markTourSeen, tourSeen} from "./tourLayout.ts";
import {useWhatsNewOpen} from "../../Services/popupQueue.ts";

// la page a le temps de s'afficher avant la question (puis on revérifie à ce rythme si une fenêtre est ouverte)
const ASK_DELAY_MS = 600;

type GameTourProps = {
    code: string;
    steps: TourStep[];
    running: boolean;
    onRunningChange: (running: boolean) => void;
};

export default function GameTour({code, steps, running, onRunningChange}: GameTourProps) {
    const [asking, setAsking] = useState(false);
    const whatsNewOpen = useWhatsNewOpen();
    const yesRef = useRef<HTMLButtonElement>(null);

    // question posée une fois la page affichée, quand plus aucune autre fenêtre (cadeau, récompense…) n'est ouverte
    useEffect(() => {
        if (whatsNewOpen || running || tourSeen(code)) return;
        const timer = window.setInterval(() => {
            if (document.querySelector("[aria-modal='true']")) return;
            window.clearInterval(timer);
            setAsking(true);
        }, ASK_DELAY_MS);
        return () => window.clearInterval(timer);
    }, [code, whatsNewOpen, running]);

    useEffect(() => {
        if (!asking) return;
        yesRef.current?.focus();
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") answer(false);
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    });

    function answer(yes: boolean) {
        markTourSeen(code);
        setAsking(false);
        if (yes) onRunningChange(true);
    }

    if (running) return <InterfaceTour steps={steps} onClose={() => onRunningChange(false)}/>;
    if (!asking) return null;

    return createPortal(
        <div className="interface-tour-ask-overlay">
            <div className="interface-tour-ask" role="dialog" aria-modal="true" aria-labelledby="interface-tour-ask-title">
                <h2 id="interface-tour-ask-title">Première fois ici ?</h2>
                <p>Voulez-vous un petit tutoriel de l'écran de jeu ? Ça prend une minute.</p>
                <div className="interface-tour-buttons">
                    <button type="button" className="secondary" onClick={() => answer(false)}>Non merci</button>
                    <button type="button" ref={yesRef} onClick={() => answer(true)}>Oui</button>
                </div>
            </div>
        </div>,
        document.body,
    );
}
