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
    const navigate = useNavigate();
    const map = `/niveaux/${gameCode}`;

    if (props.error) return <main className="level-tutorial"><p className="tutorial-error" role="alert">{props.error}</p></main>;
    if (props.loading) return <main className="level-tutorial"><Loader label="Chargement de la leçon…"/></main>;

    const tutorialDone = done !== null && done.first && tutorial !== null && level === tutorial;
    const last = tutorial !== null && level >= tutorial;

    return (
        <main className={`level-tutorial ${props.className}`}>
            <div className="tutorial-top">
                <Link to={map} className="tutorial-back"><FaChevronLeft aria-hidden/> Niveaux</Link>
                <span className="tutorial-badge">
                    <FaGraduationCap aria-hidden/> Leçon {level}{tutorial ? `/${tutorial}` : ""} · {props.titles[level - 1] ?? ""}
                </span>
            </div>

            {props.children}

            {props.bubble && (
                <div className="tutorial-bubble" role="status" key={props.bubble.text}>
                    <p>{props.bubble.text}</p>
                    {props.bubble.button && <button type="button" onClick={props.bubble.onButton}>{props.bubble.button}</button>}
                </div>
            )}

            {props.checking && !done && <div className="tutorial-bubble" role="status"><p>Bravo ! Vérification…</p></div>}

            {done && (
                <div className="modal-overlay success-overlay" role="dialog" aria-modal="true" aria-labelledby="lesson-done">
                    <div className="modal success-modal lesson-done">
                        {tutorialDone ? (
                            <>
                                <FaGraduationCap className="lesson-done-icon" aria-hidden/>
                                <h2 id="lesson-done">Bravo !</h2>
                                <p>Le tutoriel est terminé : tu sais maintenant jouer {props.playName} ! Génère des grilles aléatoires en attendant les niveaux.</p>
                            </>
                        ) : (
                            <>
                                <FaStar className="lesson-done-icon" aria-hidden/>
                                <h2 id="lesson-done">Leçon réussie !</h2>
                                <p>{last ? "Tu as fini les leçons." : "La suite t'attend : une nouvelle technique."}</p>
                            </>
                        )}
                        {done.xp !== null && <p className="lesson-done-xp">+{done.xp} XP</p>}
                        <div className="modal-buttons">
                            {!last && <button type="button" className="modal-button" onClick={() => navigate(`${map}/${level + 1}`)}>Leçon suivante</button>}
                            {last && (
                                <button type="button" className="modal-button" onClick={() => navigate(`/playgame/${gameCode}`)}>
                                    <FaDice aria-hidden/> Grille aléatoire
                                </button>
                            )}
                            <button type="button" className="modal-button secondary" onClick={() => navigate(map)}>
                                <FaMapMarkedAlt aria-hidden/> Carte
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </main>
    );
}
