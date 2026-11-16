/**
 * Tutoriel guidé du Queens (niveaux du tutoriel du mode Niveaux) : pas une partie normale.
 * Juste la grille et une bulle qui explique, comme dans un jeu vidéo :
 * - un voile gris couvre la grille, sauf les cases dont on parle (en lumière) et celles où il faut agir (qui pulsent)
 * - seules les cases à marquer répondent ; l'étape suivante arrive dès que c'est fait
 * - pas de chrono, pas de panneaux
 * Les étapes viennent du guide (queensGuide.ts) : à chaque moment, la déduction la plus simple, avec son explication.
 * Chaque leçon ajoute ses étapes d'introduction et explique sa technique avant de la faire appliquer.
 * Grille finie : la partie est validée par le serveur (progression, XP la première fois), puis une popup propose la suite.
 */

import "../Queens/Queens.scss";
import "./QueensTutorial.scss";
import {type CSSProperties, useEffect, useMemo, useRef, useState} from "react";
import {Link, useNavigate} from "react-router-dom";
import {FaChevronLeft, FaCrown, FaDice, FaGraduationCap, FaMapMarkedAlt} from "react-icons/fa";
import type {QueensPuzzle} from "../../Models/queens.model.ts";
import {useAuth} from "../../Context/authContext.ts";
import {levelsService, rememberGuestLevel, guestDone} from "../../Services/levels.service.ts";
import {queensService} from "../../Services/queens.service.ts";
import {CROSS, EMPTY, type Mark, QUEEN} from "../Queens/queensRules.ts";
import QueensBoard from "../Queens/QueensBoard.tsx";
import Loader from "../Loader/Loader.tsx";
import {confetti} from "../Confetti/Confetti.tsx";
import {type GuideMark, type GuideStep, nextStep, startMarks} from "./queensGuide.ts";

type Props = {
    level: number;
    // nombre de leçons du tutoriel (null tant qu'inconnu)
    tutorial: number | null;
};

// Une étape affichée : du texte, des cases en lumière, des cases à marquer (ou un bouton pour continuer)
type Shown = {
    text: string;
    spotlight: number[];
    targets: number[];
    mark?: "cross" | "queen";
    button?: string;
};

const LESSON_TITLES = ["Les bases", "La zone coincée", "Deux zones, deux lignes"];

const plural = (line: string | undefined) => (line === "colonne" ? "colonnes" : "lignes");

// Explication d'une déduction du guide (`first` : première fois qu'on la fait dans cette leçon)
function explain(step: GuideStep, first: boolean): string {
    switch (step.rule) {
        case "attacks":
            return first
                ? "Une dame bloque sa ligne, sa colonne, sa zone et les 8 cases qui la touchent : barre toutes les cases en lumière."
                : "Barre les cases bloquées par cette dame.";
        case "single":
            return `Il ne reste qu'une case libre dans cette ${step.line} : pose la dame (deux clics).`;
        case "confined1":
            return `Barre le reste de la ${step.line} : ces cases n'auront jamais de dame.`;
        case "confined2":
            return `Barre les autres cases de ces deux ${plural(step.line)}.`;
        case "blocked":
            return `Une dame ici ne laisserait aucune place dans une ${step.line} : barre-la.`;
    }
}

// Les dames ne partagent ni ligne, ni colonne, ni zone, et ne se touchent pas
function queensFit(puzzle: QueensPuzzle, marks: GuideMark[]): boolean {
    const queens = marks.flatMap((m, i) => (m === 2 ? [i] : []));
    const n = puzzle.size;
    return queens.every((a, k) => queens.slice(k + 1).every(b => {
        const [ra, ca, rb, cb] = [Math.floor(a / n), a % n, Math.floor(b / n), b % n];
        return ra !== rb && ca !== cb && puzzle.regions[a] !== puzzle.regions[b] && (Math.abs(ra - rb) > 1 || Math.abs(ca - cb) > 1);
    }));
}

export default function QueensTutorial({level, tutorial}: Props) {
    const navigate = useNavigate();
    const auth = useAuth();
    const [puzzle, setPuzzle] = useState<QueensPuzzle | null>(null);
    const [error, setError] = useState<string | null>(null);
    const gameId = useRef<string | null>(null);
    const [marks, setMarks] = useState<GuideMark[]>([]);
    // étapes d'introduction encore à montrer (avant le guide), et explications déjà faites
    const [intro, setIntro] = useState(0);
    const [explained, setExplained] = useState<string | null>(null);
    const [seen, setSeen] = useState<Set<string>>(new Set());
    const [done, setDone] = useState<{ xp: number | null; first: boolean } | null>(null);

    // Grille de la leçon (même départ qu'un niveau)
    useEffect(() => {
        let cancelled = false;
        levelsService.start<QueensPuzzle>("QUEENS", level).then(started => {
            if (cancelled || started.alreadyDone) return;
            gameId.current = started.gameId;
            setPuzzle(started.grid);
            setMarks(startMarks(started.grid));
        }).catch((err: Error) => !cancelled && setError(err.message || "Impossible de charger la leçon."));
        return () => {
            cancelled = true;
        };
    }, [level]);

    // toutes les dames posées, sans qu'aucune en gêne une autre (une dame mal placée : on attend la correction)
    const solved = marks.length > 0 && puzzle !== null && marks.filter(m => m === 2).length === puzzle.size && queensFit(puzzle, marks);
    // Étape en cours : figée jusqu'à ce que ses cases soient toutes marquées (le premier clic d'une dame pose une
    // croix : sans ça, le guide croirait la case exclue et changerait d'étape)
    const [step, setStep] = useState<GuideStep | null>(null);
    const stepDone = (s: GuideStep) => s.targets.every(t => marks[t] === (s.mark === "queen" ? 2 : 1));
    useEffect(() => {
        if (!puzzle || solved || (step && !stepDone(step))) return;
        const next = nextStep(puzzle, marks);
        const timer = window.setTimeout(() => setStep(next), 0);
        return () => window.clearTimeout(timer);
        // stepDone dépend de marks et step, déjà suivis
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [puzzle, marks, solved, step]);

    // Introduction de la leçon (avant la première déduction)
    const intros: Shown[] = useMemo(() => {
        if (!puzzle) return [];
        const all = marks.map((_, i) => i);
        if (level === 1) {
            return [
                {text: "Bienvenue dans le Queens ! Le but : une dame ♛ dans chaque ligne, chaque colonne et chaque zone de couleur.", spotlight: all, targets: [], button: "C'est parti"},
                {text: "Une dame est déjà posée. Deux dames ne se touchent jamais, même en diagonale.", spotlight: puzzle.queens, targets: [], button: "Suivant"},
            ];
        }
        if (level === 2) {
            return [{text: "Leçon 2 : la zone coincée. Quand une zone tient sur une seule ligne, on en déduit beaucoup.", spotlight: all, targets: [], button: "Voyons ça"}];
        }
        return [{text: "Leçon 3 : deux zones, deux lignes. La même idée que la zone coincée, mais à deux.", spotlight: all, targets: [], button: "Voyons ça"}];
    }, [puzzle, level, marks]);

    // Étape montrée maintenant
    const shown: Shown | null = useMemo(() => {
        if (!puzzle || solved) return null;
        if (intro < intros.length) return intros[intro]!;
        if (!step) return {text: "À toi de finir la grille !", spotlight: marks.map((_, i) => i), targets: marks.map((_, i) => i)};
        const key = `${step.rule}:${step.targets.join(",")}`;
        // techniques des leçons : d'abord l'explication, cases de la zone en lumière
        if ((step.rule === "confined1" || step.rule === "confined2") && explained !== key) {
            const text = step.rule === "confined1"
                ? `Cette zone tient sur une seule ${step.line}. Sa dame sera forcément sur cette ${step.line}…`
                : `Ces deux zones tiennent sur les deux mêmes ${plural(step.line)}. Leurs deux dames prendront ces deux ${plural(step.line)}…`;
            return {text, spotlight: step.spotlight, targets: [], button: "Je vois"};
        }
        let targets = step.targets;
        let text = explain(step, !seen.has(step.rule));
        // leçon 1 : on apprend les gestes un par un (un clic, puis un glissé, puis deux clics)
        const crosses = marks.filter(m => m === 1).length;
        const placed = marks.filter(m => m === 2).length - puzzle.queens.length;
        if (level === 1 && step.rule === "attacks" && crosses === 0) {
            targets = [step.targets[0]!];
            text = "Clique une fois sur la case qui pulse : une croix ✕ veut dire « pas de dame ici ».";
        } else if (level === 1 && step.rule === "attacks" && placed === 0) {
            text = "Bien ! Cette dame bloque aussi sa ligne, sa colonne, sa zone et ses voisines. Glisse sur toutes les cases qui pulsent pour les barrer d'un coup.";
        } else if (level === 1 && step.rule === "single" && placed === 0) {
            text = `Il ne reste qu'une case libre dans cette ${step.line}. Clique une fois, puis une deuxième fois : ça pose une dame ♛.`;
        }
        return {text, spotlight: step.spotlight, targets, mark: step.mark};
    }, [puzzle, solved, intro, intros, step, explained, seen, level, marks]);

    // Techniques déjà faites dans cette leçon (textes plus courts ensuite) : retenues quand on passe à l'étape d'après
    const stepKey = step ? `${step.rule}:${step.targets.join(",")}` : null;
    const lastRule = useRef<string | null>(null);
    useEffect(() => {
        const previous = lastRule.current;
        lastRule.current = stepKey ? stepKey.split(":")[0]! : null;
        if (!previous) return;
        const timer = window.setTimeout(() => setSeen(s => (s.has(previous) ? s : new Set(s).add(previous))), 0);
        return () => window.clearTimeout(timer);
    }, [stepKey]);

    // Grille finie : validée par le serveur, puis la popup de fin de leçon
    useEffect(() => {
        if (!solved || !puzzle || !gameId.current || done) return;
        const queens = marks.map((m, i) => (m === 2 ? i : -1)).filter(i => i >= 0);
        const id = gameId.current;
        gameId.current = null;
        const firstGuest = !auth.isLoggedIn && !guestDone("QUEENS").includes(level);
        if (!auth.isLoggedIn) rememberGuestLevel("QUEENS", level);
        queensService.validate(id, queens).then(result => {
            setDone({xp: result.xp ?? null, first: auth.isLoggedIn ? result.level?.first === true : firstGuest});
            if (result.xp !== undefined) void auth.refresh();
            confetti();
        }).catch((err: Error) => setError(err.message || "La validation a échoué."));
    }, [solved, puzzle, marks, done, auth, level]);

    if (error) return <main className="level-tutorial"><p className="tutorial-error" role="alert">{error}</p></main>;
    if (!puzzle) return <main className="level-tutorial"><Loader label="Chargement de la leçon…"/></main>;

    const targets = new Set(shown?.targets ?? []);
    const spotlight = new Set([...(shown?.spotlight ?? []), ...targets]);
    const veiled = shown !== null && (shown.spotlight.length > 0 || targets.size > 0) && spotlight.size < marks.length;
    const free = shown !== null && targets.size === marks.length;

    // Seules les cases à marquer répondent ; une case « croix » se barre d'un clic, une case « dame » en deux
    const allowed = (i: number) => !solved && (free || targets.has(i));
    const setMark = (i: number, mark: Mark) => {
        if (!allowed(i) || puzzle.queens.includes(i)) return;
        setMarks(m => m.map((old, k) => (k === i ? mark as GuideMark : old)));
    };
    const cycle = (i: number) => {
        if (!allowed(i) || puzzle.queens.includes(i)) return;
        const current = marks[i]!;
        if (!free && shown?.mark === "cross") return setMark(i, CROSS);
        setMark(i, (current === EMPTY ? CROSS : current === CROSS ? QUEEN : EMPTY) as Mark);
    };
    const crossIfEmpty = (i: number) => {
        if (marks[i] === 0) setMark(i, CROSS);
    };

    // Dernière leçon réussie pour la première fois : le tutoriel est fini
    const tutorialDone = done !== null && done.first && tutorial !== null && level === tutorial;
    const last = tutorial !== null && level >= tutorial;
    const next = () => navigate(`/niveaux/QUEENS/${level + 1}`);

    return (
        <main className="level-tutorial queens">
            <div className="tutorial-top">
                <Link to="/niveaux/QUEENS" className="tutorial-back"><FaChevronLeft aria-hidden/> Niveaux</Link>
                <span className="tutorial-badge"><FaGraduationCap aria-hidden/> Leçon {level}{tutorial ? `/${tutorial}` : ""} · {LESSON_TITLES[level - 1] ?? "Queens"}</span>
            </div>

            <div className={`tutorial-stage ${veiled ? "veiled" : ""}`} style={{"--size": puzzle.size} as CSSProperties}>
                <QueensBoard puzzle={puzzle} marks={marks as Mark[]} isHint={i => puzzle.queens.includes(i)} disabled={solved}
                             onCycle={cycle} onSetMark={setMark} onCrossIfEmpty={crossIfEmpty} errors={null} autoCrosses={null}/>
                {/* voile : sombre partout sauf les cases dont on parle ; les cases à marquer pulsent */}
                <div className="tutorial-veil" aria-hidden>
                    {marks.map((_, i) => (
                        <span key={i} className={targets.has(i) && !free ? "target" : spotlight.has(i) || !veiled ? "lit" : "dark"}/>
                    ))}
                </div>
            </div>

            {shown && (
                <div className="tutorial-bubble" role="status" key={shown.text}>
                    <p>{shown.text}</p>
                    {shown.button && (
                        <button type="button" onClick={() => {
                            if (intro < intros.length) setIntro(n => n + 1);
                            else if (step) setExplained(`${step.rule}:${step.targets.join(",")}`);
                        }}>{shown.button}</button>
                    )}
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
                                <p>Le tutoriel est terminé : tu sais maintenant jouer au Queens ! Continue les niveaux ou génère des grilles aléatoires.</p>
                            </>
                        ) : (
                            <>
                                <FaCrown className="lesson-done-icon" aria-hidden/>
                                <h2 id="lesson-done">Leçon réussie !</h2>
                                <p>{last ? "Tu as fini les leçons du Queens." : "La suite t'attend : une nouvelle technique."}</p>
                            </>
                        )}
                        {done.xp !== null && <p className="lesson-done-xp">+{done.xp} XP</p>}
                        <div className="modal-buttons">
                            <button type="button" className="modal-button" onClick={next}>
                                {last ? "Continuer les niveaux" : "Leçon suivante"}
                            </button>
                            {last && (
                                <button type="button" className="modal-button secondary" onClick={() => navigate("/playgame/QUEENS")}>
                                    <FaDice aria-hidden/> Grille aléatoire
                                </button>
                            )}
                            <button type="button" className="modal-button secondary" onClick={() => navigate("/niveaux/QUEENS")}>
                                <FaMapMarkedAlt aria-hidden/> Carte
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </main>
    );
}
