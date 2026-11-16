/**
 * Tutoriel guidé des Galaxies (niveaux du tutoriel du mode Niveaux), sur le modèle de celui du Queens :
 * la grille seule et une bulle qui explique, pas de chrono ni de panneaux.
 * - une ombre couvre les cases dont on ne parle pas ; les murs à tracer brillent
 * - seuls ces murs se tracent ; l'étape suivante arrive dès qu'ils le sont tous
 * Les étapes viennent du guide (galaxiesGuide.ts) : une case trouve sa galaxie (avec l'explication, et un bouton
 * pour continuer), puis les murs qui la séparent de ses voisines.
 * Grille finie : la partie est validée par le serveur (progression, XP la première fois), puis une popup propose la suite.
 */

import "../Galaxies/Galaxies.scss";
import "./QueensTutorial.scss";
import "./GalaxiesTutorial.scss";
import {useEffect, useMemo, useRef, useState} from "react";
import {Link, useNavigate} from "react-router-dom";
import {FaChevronLeft, FaDice, FaGraduationCap, FaMapMarkedAlt, FaStar} from "react-icons/fa";
import type {GalaxiesPuzzle} from "../../Models/galaxies.model.ts";
import {useAuth} from "../../Context/authContext.ts";
import {guestDone, levelsService, rememberGuestLevel} from "../../Services/levels.service.ts";
import {galaxiesService} from "../../Services/galaxies.service.ts";
import {analyzeBoard, coreCells} from "../Galaxies/galaxiesRules.ts";
import GalaxiesBoard from "../Galaxies/GalaxiesBoard.tsx";
import Loader from "../Loader/Loader.tsx";
import {confetti} from "../Confetti/Confetti.tsx";
import {type GalaxiesStep, planGalaxies} from "./galaxiesGuide.ts";

type Props = {
    level: number;
    // nombre de leçons du tutoriel (null tant qu'inconnu)
    tutorial: number | null;
};

// Une bulle d'introduction : du texte, des cases en lumière, un bouton
type Intro = { text: string; lit: number[] | null; button: string };

const LESSON_TITLES = ["Les bases", "Le miroir", "La case enfermée"];

// Explication d'une case qui trouve sa galaxie (`first` : première fois dans cette leçon)
function explainLearn(step: Extract<GalaxiesStep, { kind: "learn" }>, first: boolean): string {
    switch (step.why) {
        case "mirror-of":
            return first
                ? "Une galaxie est symétrique autour de son point : la case en face, de l'autre côté du point, est forcément dans la même galaxie."
                : "Par symétrie, la case en face est aussi dans cette galaxie.";
        case "mirror":
            return first
                ? "Cette case ne peut aller qu'à ce point : pour chacun des autres, sa case symétrique sortirait de la grille ou serait déjà dans une autre galaxie."
                : "Par symétrie, seul ce point peut prendre cette case.";
        case "reach":
            return first
                ? "Cette case est enfermée : une galaxie est d'un seul morceau, et à part ce point, aucun ne peut l'atteindre sans traverser une autre galaxie."
                : "Seul ce point peut atteindre cette case.";
    }
}

export default function GalaxiesTutorial({level, tutorial}: Props) {
    const navigate = useNavigate();
    const auth = useAuth();
    const [puzzle, setPuzzle] = useState<GalaxiesPuzzle | null>(null);
    const [error, setError] = useState<string | null>(null);
    const gameId = useRef<string | null>(null);
    const [placed, setPlaced] = useState<Set<number>>(new Set());
    // introductions déjà lues, étapes « une case trouve sa galaxie » déjà lues
    const [intro, setIntro] = useState(0);
    const [read, setRead] = useState<Set<number>>(new Set());
    const [done, setDone] = useState<{ xp: number | null; first: boolean } | null>(null);

    // Grille de la leçon (même départ qu'un niveau)
    useEffect(() => {
        let cancelled = false;
        levelsService.start<GalaxiesPuzzle>("GALAXIES", level).then(started => {
            if (cancelled || started.alreadyDone) return;
            gameId.current = started.gameId;
            setPuzzle(started.grid);
        }).catch((err: Error) => !cancelled && setError(err.message || "Impossible de charger la leçon."));
        return () => {
            cancelled = true;
        };
    }, [level]);

    const plan = useMemo(() => (puzzle ? planGalaxies(puzzle).steps : []), [puzzle]);
    const hintWalls = useMemo(() => new Set(puzzle?.walls ?? []), [puzzle]);
    const walls = useMemo(() => new Set([...hintWalls, ...placed]), [hintWalls, placed]);
    const analysis = useMemo(() => (puzzle ? analyzeBoard(puzzle, walls) : null), [puzzle, walls]);
    const solved = analysis?.solution != null;

    // Étape en cours : la première pas encore faite (murs pas tous tracés, ou explication pas encore lue)
    const index = plan.findIndex((s, i) => (s.kind === "walls" ? s.walls.some(w => !placed.has(w)) : !read.has(i)));
    const step = index >= 0 ? plan[index]! : null;

    const intros: Intro[] = useMemo(() => {
        if (!puzzle) return [];
        const cores = [...new Set(puzzle.dots.flatMap(d => coreCells(d, puzzle.width)))];
        if (level === 1) {
            return [
                {text: "Bienvenue dans les Galaxies ! Le but : découper la grille en galaxies, avec un seul point ○ dans chacune.", lit: null, button: "C'est parti"},
                {text: "Une galaxie est symétrique autour de son point : si on la fait tourner d'un demi-tour autour du point, elle retombe exactement sur elle-même.", lit: null, button: "Suivant"},
                {text: "Un point peut être au centre d'une case, au milieu d'un côté ou sur un coin : les cases qu'il touche sont à lui.", lit: cores, button: "Suivant"},
            ];
        }
        if (level === 2) {
            return [{text: "Leçon 2 : le miroir. Chaque galaxie est symétrique autour de son point : ça dit à qui sont les cases.", lit: null, button: "Voyons ça"}];
        }
        return [{text: "Leçon 3 : la case enfermée. Une galaxie est d'un seul morceau : un point ne prend que les cases qu'il peut atteindre.", lit: null, button: "Voyons ça"}];
    }, [puzzle, level]);

    // Ce qu'on montre maintenant : bulle, cases en lumière, cases montrées du doigt, murs à tracer
    const shown = useMemo(() => {
        if (!puzzle || solved) return null;
        if (intro < intros.length) {
            const i = intros[intro]!;
            return {text: i.text, button: i.button, lit: i.lit, focus: [] as number[], targets: [] as number[]};
        }
        if (!step) return null;
        const before = plan.slice(0, index);
        if (step.kind === "learn") {
            const first = !before.some(s => s.kind === "learn" && s.why === step.why);
            const lit = step.why === "mirror-of" ? [...step.spotlight, ...coreCells(puzzle.dots[step.dot]!, puzzle.width)] : step.spotlight;
            return {text: explainLearn(step, first), button: first ? "Je vois" : "Suivant", lit, focus: [step.cell], targets: []};
        }
        // murs : la galaxie (cases connues) en lumière, et leurs voisines
        let targets = step.walls.filter(w => !placed.has(w));
        let text = "Ces cases sont à ce point, leurs voisines à d'autres : trace les murs qui les séparent.";
        // leçon 1 : un clic d'abord, puis le glissé à la première étape qui a plusieurs murs
        const firstLong = plan.findIndex((s, i) => i > 0 && s.kind === "walls" && s.walls.length >= 2);
        if (level === 1 && placed.size === 0) {
            targets = [targets[0]!];
            text = "Ces deux cases touchent deux points différents : elles sont dans deux galaxies. Clique sur le trait qui brille, entre elles, pour tracer un mur.";
        } else if (level === 1 && index === 0) {
            text = "Bien ! Trace aussi l'autre mur qui brille, de la même façon.";
        } else if (level === 1 && index === firstLong) {
            text = "Pour tracer plusieurs murs d'un coup, glisse le long des traits qui brillent.";
        } else if (before.at(-1)?.kind === "learn") {
            text = "Trace les murs qui séparent cette galaxie de ses voisines.";
        }
        const neighbours = step.walls.flatMap(w => wallSides(puzzle, w));
        return {text, button: null, lit: [...step.spotlight, ...neighbours], focus: [] as number[], targets};
    }, [puzzle, solved, intro, intros, step, plan, index, placed, level]);

    // Grille finie : validée par le serveur, puis la popup de fin de leçon
    useEffect(() => {
        if (!solved || !analysis?.solution || !gameId.current || done) return;
        const id = gameId.current;
        gameId.current = null;
        const firstGuest = !auth.isLoggedIn && !guestDone("GALAXIES").includes(level);
        if (!auth.isLoggedIn) rememberGuestLevel("GALAXIES", level);
        galaxiesService.validate(id, analysis.solution).then(result => {
            setDone({xp: result.xp ?? null, first: auth.isLoggedIn ? result.level?.first === true : firstGuest});
            if (result.xp !== undefined) void auth.refresh();
            confetti();
        }).catch((err: Error) => setError(err.message || "La validation a échoué."));
    }, [solved, analysis, done, auth, level]);

    if (error) return <main className="level-tutorial"><p className="tutorial-error" role="alert">{error}</p></main>;
    if (!puzzle || !analysis) return <main className="level-tutorial"><Loader label="Chargement de la leçon…"/></main>;

    const targets = new Set(shown?.targets ?? []);
    // seuls les murs qui brillent se tracent (et ne s'effacent pas)
    const paint = (w: number, on: boolean) => {
        if (!on || !targets.has(w) || placed.has(w)) return;
        setPlaced(p => new Set(p).add(w));
    };

    const tutorialDone = done !== null && done.first && tutorial !== null && level === tutorial;
    const last = tutorial !== null && level >= tutorial;
    const next = () => navigate(`/niveaux/GALAXIES/${level + 1}`);
    const onButton = () => {
        if (intro < intros.length) setIntro(n => n + 1);
        else if (index >= 0) setRead(r => new Set(r).add(index));
    };

    return (
        <main className="level-tutorial galaxies">
            <div className="tutorial-top">
                <Link to="/niveaux/GALAXIES" className="tutorial-back"><FaChevronLeft aria-hidden/> Niveaux</Link>
                <span className="tutorial-badge"><FaGraduationCap aria-hidden/> Leçon {level}{tutorial ? `/${tutorial}` : ""} · {LESSON_TITLES[level - 1] ?? "Galaxies"}</span>
            </div>

            <GalaxiesBoard puzzle={puzzle} walls={walls} hintWalls={hintWalls} analysis={analysis} disabled={solved}
                           onToggleWall={w => paint(w, true)} onPaintWall={paint} onEndStroke={() => undefined} showErrors={false}
                           guide={shown ? {lit: shown.lit === null ? null : new Set(shown.lit), focus: shown.focus, targets} : undefined}/>

            {shown && (
                <div className="tutorial-bubble" role="status" key={shown.text}>
                    <p>{shown.text}</p>
                    {shown.button && <button type="button" onClick={onButton}>{shown.button}</button>}
                </div>
            )}

            {solved && !done && <div className="tutorial-bubble" role="status"><p>Bravo ! Vérification…</p></div>}

            {done && (
                <div className="modal-overlay success-overlay" role="dialog" aria-modal="true" aria-labelledby="lesson-done">
                    <div className="modal success-modal lesson-done">
                        {tutorialDone ? (
                            <>
                                <FaGraduationCap className="lesson-done-icon" aria-hidden/>
                                <h2 id="lesson-done">Bravo !</h2>
                                <p>Le tutoriel est terminé : tu sais maintenant jouer aux Galaxies ! Génère des grilles aléatoires en attendant les niveaux.</p>
                            </>
                        ) : (
                            <>
                                <FaStar className="lesson-done-icon" aria-hidden/>
                                <h2 id="lesson-done">Leçon réussie !</h2>
                                <p>{last ? "Tu as fini les leçons des Galaxies." : "La suite t'attend : une nouvelle technique."}</p>
                            </>
                        )}
                        {done.xp !== null && <p className="lesson-done-xp">+{done.xp} XP</p>}
                        <div className="modal-buttons">
                            {!last && <button type="button" className="modal-button" onClick={next}>Leçon suivante</button>}
                            {last && (
                                <button type="button" className="modal-button" onClick={() => navigate("/playgame/GALAXIES")}>
                                    <FaDice aria-hidden/> Grille aléatoire
                                </button>
                            )}
                            <button type="button" className="modal-button secondary" onClick={() => navigate("/niveaux/GALAXIES")}>
                                <FaMapMarkedAlt aria-hidden/> Carte
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </main>
    );
}

// Les deux cases de part et d'autre d'un mur
function wallSides(puzzle: GalaxiesPuzzle, wall: number): number[] {
    const {width, height} = puzzle;
    const horizontal = (height - 1) * width;
    if (wall < horizontal) return [wall, wall + width];
    const v = wall - horizontal;
    const r = Math.floor(v / (width - 1)), c = v % (width - 1);
    return [r * width + c, r * width + c + 1];
}
