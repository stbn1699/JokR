/**
 * Haut d'une leçon du tutoriel : lien vers la carte et badge « Leçon n/3 · titre ».
 * Aussi utilisé par les jeux ajoutés depuis 3.3, dont la leçon se joue dans le jeu lui-même (useGridChallenge).
 */
export function LessonTop({gameCode, level, tutorial, title}: { gameCode: string; level: number; tutorial: number | null; title: string }) {
    return (
        <div className="tutorial-top">
            <Link to={`/niveaux/${gameCode}`} className="tutorial-back"><FaChevronLeft aria-hidden/> Niveaux</Link>
            <span className="tutorial-badge">
                <FaGraduationCap aria-hidden/> Leçon {level}{tutorial ? `/${tutorial}` : ""}{title ? ` · ${title}` : ""}
            </span>
        </div>
    );
}

type DoneProps = {
    gameCode: string;
    playName: string;
    level: number;
    tutorial: number | null;
    xp: number | null;
    // dernière leçon réussie pour la première fois
    tutorialDone: boolean;
    // ce qu'apprend la leçon suivante (« La suite t'attend : une nouvelle technique »)
    novelty?: string;
};

/**
 * Popup de fin de leçon : leçon suivante, ou la fin du tutoriel (premier niveau, grille aléatoire, carte).
 * Tous les jeux du mode Niveaux ont des niveaux après leurs leçons.
 */
export function LessonDonePopup({gameCode, playName, level, tutorial, xp, tutorialDone, novelty = "technique"}: DoneProps) {
    const navigate = useNavigate();
    const map = `/niveaux/${gameCode}`;
    const last = tutorial !== null && level >= tutorial;
    return (
        <div className="modal-overlay success-overlay" role="dialog" aria-modal="true" aria-labelledby="lesson-done">
            <div className="modal success-modal lesson-done">
                {tutorialDone ? (
                    <>
                        <FaGraduationCap className="lesson-done-icon" aria-hidden/>
                        <h2 id="lesson-done">Bravo !</h2>
                        <p>Le tutoriel est terminé : tu sais maintenant jouer {playName} ! Place aux niveaux, de plus en plus corsés.</p>
                    </>
                ) : (
                    <>
                        <FaStar className="lesson-done-icon" aria-hidden/>
                        <h2 id="lesson-done">Leçon réussie !</h2>
                        <p>{last ? "Tu as fini les leçons : place aux niveaux." : `La suite t'attend : une nouvelle ${novelty}.`}</p>
                    </>
                )}
                {xp !== null && <p className="lesson-done-xp">+{xp} XP</p>}
                <div className="modal-buttons">
                    <button type="button" className="modal-button" onClick={() => navigate(`${map}/${level + 1}`)}>
                        {last ? "Premier niveau" : "Leçon suivante"}
                    </button>
                    {last && (
                        <button type="button" className="modal-button secondary" onClick={() => navigate(`/playgame/${gameCode}`)}>
                            <FaDice aria-hidden/> Grille aléatoire
                        </button>
                    )}
                    <button type="button" className="modal-button secondary" onClick={() => navigate(map)}>
                        <FaMapMarkedAlt aria-hidden/> Carte
                    </button>
                </div>
            </div>
        </div>
    );
}

/**
 * Cadre d'une leçon du tutoriel : lien vers la carte, badge « Leçon n/3 · titre », la grille (enfants),
 * la bulle qui explique (avec son bouton), et la popup de fin de leçon.
 * Les styles sont dans QueensTutorial.scss (classe level-tutorial).
 */

import "./QueensTutorial.scss";
import type {ReactNode} from "react";
import {Link, useNavigate} from "react-router-dom";
import {FaChevronLeft, FaDice, FaGraduationCap, FaMapMarkedAlt, FaStar} from "react-icons/fa";
import Loader from "../Loader/Loader.tsx";
import type {LessonDone} from "./useLesson.ts";

export type Bubble = { text: string; button?: string; onButton?: () => void };

type Props = {
    gameCode: string;
    // « au Sudoku », « aux Galaxies » (fin du tutoriel : « tu sais maintenant jouer au Sudoku »)
    playName: string;
    className: string;
    level: number;
    tutorial: number | null;
    titles: string[];
    loading: boolean;
    error: string | null;
    bubble: Bubble | null;
    // grille finie, en cours de validation
    checking: boolean;
    done: LessonDone | null;
    children: ReactNode;
};

export default function LessonFrame(props: Props) {
    const {gameCode, level, tutorial, done} = props;

    if (props.error) return <main className="level-tutorial"><p className="tutorial-error" role="alert">{props.error}</p></main>;
    if (props.loading) return <main className="level-tutorial"><Loader label="Chargement de la leçon…"/></main>;

    return (
        <main className={`level-tutorial ${props.className}`}>
            <LessonTop gameCode={gameCode} level={level} tutorial={tutorial} title={props.titles[level - 1] ?? ""}/>

            {props.children}

            {props.bubble && (
                <div className="tutorial-bubble" role="status" key={props.bubble.text}>
                    <p>{props.bubble.text}</p>
                    {props.bubble.button && <button type="button" onClick={props.bubble.onButton}>{props.bubble.button}</button>}
                </div>
            )}

            {props.checking && !done && <div className="tutorial-bubble" role="status"><p>Bravo ! Vérification…</p></div>}

            {done && (
                <LessonDonePopup gameCode={gameCode} playName={props.playName} level={level} tutorial={tutorial} xp={done.xp}
                                 tutorialDone={done.first && tutorial !== null && level === tutorial}/>
            )}
        </main>
    );
}
