/**
 * Bouton « Règles » des jeux de hasard : ouvre une fenêtre avec les règles du jeu (le contenu est donné
 * par chaque jeu). Échap, un clic à côté ou « Compris » la ferment.
 * Avec `tour`, il porte aussi la visite guidée de l'interface du jeu : proposée à la première ouverture de la page,
 * et relancée par le bouton « Visite guidée » de la fenêtre des règles.
 */

import "./RulesButton.scss";
import {type ReactNode, useEffect, useRef, useState} from "react";
import {createPortal} from "react-dom";
import {FaQuestionCircle, FaTimes} from "react-icons/fa";
import GameTour from "../InterfaceTour/GameTour.tsx";
import type {TourStep} from "../InterfaceTour/InterfaceTour.tsx";

type RulesButtonProps = {
    title: string;
    children: ReactNode;
    // visite de l'interface : code du jeu (pour retenir qu'elle a été proposée) et ses étapes
    tour?: { code: string; steps: TourStep[] };
};

export default function RulesButton({title, children, tour}: RulesButtonProps) {
    const [open, setOpen] = useState(false);
    const [touring, setTouring] = useState(false);
    const closeRef = useRef<HTMLButtonElement>(null);

    useEffect(() => {
        if (!open) return;
        closeRef.current?.focus();
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") setOpen(false);
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [open]);

    return (
        <>
            <button type="button" className="rules-button" onClick={() => setOpen(true)}>
                <FaQuestionCircle aria-hidden/> Règles
            </button>
            {open && createPortal(
                <div className="rules-overlay" onClick={e => {
                    if (e.target === e.currentTarget) setOpen(false);
                }}>
                    <div className="rules-dialog" role="dialog" aria-modal="true" aria-labelledby="rules-title">
                        <div className="rules-head">
                            <h2 id="rules-title">{title}</h2>
                            <button type="button" className="rules-close" aria-label="Fermer" onClick={() => setOpen(false)}>
                                <FaTimes aria-hidden/>
                            </button>
                        </div>
                        <div className="rules-body">{children}</div>
                        <div className="rules-foot">
                            {tour && <button type="button" className="rules-tour" onClick={() => {
                                setOpen(false);
                                setTouring(true);
                            }}>Visite guidée</button>}
                            <button type="button" className="rules-ok" ref={closeRef} onClick={() => setOpen(false)}>Compris</button>
                        </div>
                    </div>
                </div>,
                document.body,
            )}
            {tour && <GameTour code={tour.code} steps={tour.steps} running={touring} onRunningChange={setTouring}/>}
        </>
    );
}
