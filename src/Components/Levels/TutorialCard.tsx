import {useState} from "react";
import {FaChevronDown, FaChevronUp, FaGraduationCap} from "react-icons/fa";
import type {TutorialStep} from "./queensTutorial.ts";

/**
 * Encadré du tutoriel, au-dessus de la grille d'un niveau du tutoriel : ce qu'on apprend et ce qu'il faut faire.
 * Repliable (pour jouer sans la cacher sur un petit écran ; replié au départ sur un écran peu haut).
 */
// placement : au-dessus de la grille (grand écran) ou au-dessus de toute la zone de jeu (téléphone) ; un seul des deux s'affiche
export default function TutorialCard({step, index, total, placement}: { step: TutorialStep; index: number; total: number; placement: "in-game" | "above" }) {
    // au-dessus de la zone de jeu sur un écran peu haut : replié au départ, pour laisser la place à la grille
    const [open, setOpen] = useState(() => placement === "in-game" || window.innerHeight >= 760);
    return (
        <section className={`tutorial-card ${placement} ${open ? "open" : ""}`} aria-label="Tutoriel">
            <button type="button" className="tutorial-card-head" aria-expanded={open} onClick={() => setOpen(o => !o)}>
                <span className="tutorial-card-badge"><FaGraduationCap aria-hidden/> Tutoriel {index}/{total}</span>
                <strong>{step.title}</strong>
                {open ? <FaChevronUp aria-hidden/> : <FaChevronDown aria-hidden/>}
            </button>
            {open && (
                <div className="tutorial-card-body">
                    {step.lines.map((line, i) => <p key={i}>{line}</p>)}
                    <p className="tutorial-card-goal">{step.goal}</p>
                </div>
            )}
        </section>
    );
}
