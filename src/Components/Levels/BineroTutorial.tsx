/**
 * Tutoriel guidé du Binero (niveaux du tutoriel du mode Niveaux), sur le modèle de celui du Queens :
 * la grille seule et une bulle qui explique, pas de chrono ni de panneaux.
 * - un voile gris couvre la grille, sauf les cases dont on parle (en lumière) et celles à remplir (qui pulsent)
 * - seules ces cases répondent ; l'étape suivante arrive dès qu'elles ont le bon chiffre
 * Les étapes viennent du guide (bineroGuide.ts) : à chaque moment, la déduction la plus simple, avec son explication.
 * Grille finie : la partie est validée par le serveur (progression, XP la première fois), puis une popup propose la suite.
 */

import "../Binero/Binero.scss";
import "./QueensTutorial.scss";
import "./BineroTutorial.scss";
import {type CSSProperties, useEffect, useMemo, useRef, useState} from "react";
import {Link, useNavigate} from "react-router-dom";
import {FaChevronLeft, FaDice, FaGraduationCap, FaMapMarkedAlt, FaStar} from "react-icons/fa";
import type {BineroCell} from "../../Models/bineroSettings.model.ts";
import {useAuth} from "../../Context/authContext.ts";
import {guestDone, levelsService, rememberGuestLevel} from "../../Services/levels.service.ts";
import {bineroService} from "../../Services/binero.service.ts";
import BineroGrid from "../Binero/BineroGrid.tsx";
import Loader from "../Loader/Loader.tsx";
import {confetti} from "../Confetti/Confetti.tsx";
import {type BineroStep, nextBineroStep} from "./bineroGuide.ts";

type Props = {
    level: number;
    // nombre de leçons du tutoriel (null tant qu'inconnu)
    tutorial: number | null;
};

type Shown = { text: string; spotlight: number[]; targets: number[]; button?: string };

const LESSON_TITLES = ["Pas trois à la suite", "Autant de 0 que de 1", "Pas deux lignes pareilles"];
const NUMBERS = ["zéro", "un", "deux", "trois", "quatre", "cinq", "six"];

// Explication d'une déduction du guide (`first` : première fois qu'on la fait dans cette leçon)
function explain(step: BineroStep, first: boolean, size: number): string {
    const d = step.rule === "duplicate" ? 0 : 1 - step.targets[0]!.digit;
    const o = 1 - d;
    switch (step.rule) {
        case "pair":
            return first
                ? `Deux ${d} côte à côte : un troisième ferait trois à la suite. Les cases qui les touchent prennent un ${o}.`
                : `Deux ${d} côte à côte : mets un ${o} ${step.targets.length > 1 ? "de chaque côté" : "à côté"}.`;
        case "sandwich":
            return first
                ? `Deux ${d} avec une case vide entre eux : un ${d} au milieu ferait trois à la suite. Mets un ${o} au milieu.`
                : `Un ${o} entre ces deux ${d}.`;
        case "count":
            return first
                ? `Cette ${step.line} a déjà ${NUMBERS[size / 2]} ${d}, la moitié de ses cases : toutes les autres sont des ${o}.`
                : `Cette ${step.line} a tous ses ${d} : complète-la avec des ${o}.`;
        case "duplicate":
            return first
                ? `Elle doit donc se compléter à l'envers : là où l'autre ${step.line} a un 0, mets un 1, et inversement.`
                : `Pour ne pas copier l'autre ${step.line}, complète celle-ci à l'envers.`;
    }
}

export default function BineroTutorial({level, tutorial}: Props) {
    const navigate = useNavigate();
    const auth = useAuth();
    const [size, setSize] = useState(0);
    const [values, setValues] = useState<BineroCell[]>([]);
    const [clues, setClues] = useState<Set<number>>(new Set());
    const [error, setError] = useState<string | null>(null);
    const gameId = useRef<string | null>(null);
    const [intro, setIntro] = useState(0);
    const [explained, setExplained] = useState<string | null>(null);
    const [seen, setSeen] = useState<Set<string>>(new Set());
    const [selected, setSelected] = useState<number | null>(null);
    const [done, setDone] = useState<{ xp: number | null; first: boolean } | null>(null);

    // Grille de la leçon (même départ qu'un niveau)
    useEffect(() => {
        let cancelled = false;
        levelsService.start<(number | null)[][]>("BINERO", level).then(started => {
            if (cancelled || started.alreadyDone) return;
            gameId.current = started.gameId;
            const flat = started.grid.flat().map(v => (v === null ? null : v as 0 | 1));
            setSize(started.grid.length);
            setValues(flat);
            setClues(new Set(flat.flatMap((v, i) => (v === null ? [] : [i]))));
        }).catch((err: Error) => !cancelled && setError(err.message || "Impossible de charger la leçon."));
        return () => {
            cancelled = true;
        };
    }, [level]);

    const loaded = size > 0;
    // Étape en cours : figée jusqu'à ce que ses cases aient le bon chiffre (en passant par 0 pour mettre un 1,
    // le guide verrait sinon une autre étape)
    const [step, setStep] = useState<BineroStep | null>(null);
    const stepDone = (s: BineroStep) => s.targets.every(t => values[t.cell] === t.digit);
    // grille pleine avec la dernière étape juste (pleine avec un mauvais chiffre : on attend la correction)
    const solved = loaded && values.every(v => v !== null) && (step === null || stepDone(step));
    useEffect(() => {
        if (!loaded || solved || (step && !stepDone(step))) return;
        // le guide ne voit que les chiffres justes (une case en cours de cycle compte comme vide)
        const next = nextBineroStep(size, values);
        const timer = window.setTimeout(() => setStep(next), 0);
        return () => window.clearTimeout(timer);
        // stepDone dépend de values et step, déjà suivis
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [loaded, size, values, solved, step]);

    const intros: Shown[] = useMemo(() => {
        if (!loaded) return [];
        const all = values.map((_, i) => i);
        if (level === 1) {
            return [
                {text: "Bienvenue dans le Binero ! Le but : remplir la grille avec des 0 et des 1.", spotlight: all, targets: [], button: "C'est parti"},
                {text: "Trois règles : jamais trois chiffres pareils à la suite, autant de 0 que de 1 dans chaque ligne et chaque colonne, et jamais deux lignes (ou deux colonnes) identiques.", spotlight: all, targets: [], button: "Suivant"},
                {text: "Les chiffres verts sont donnés. Commençons par la première règle : pas trois à la suite.", spotlight: [...clues], targets: [], button: "Suivant"},
            ];
        }
        if (level === 2) {
            return [{text: `Leçon 2 : autant de 0 que de 1. Une ligne de ${size} cases a exactement ${NUMBERS[size / 2]} 0 et ${NUMBERS[size / 2]} 1.`, spotlight: all, targets: [], button: "Voyons ça"}];
        }
        return [{text: "Leçon 3 : pas deux lignes pareilles. Deux lignes (ou deux colonnes) complètes ne sont jamais identiques.", spotlight: all, targets: [], button: "Voyons ça"}];
        // values : seulement pour la taille de la grille, qui ne change pas
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [loaded, level, size, clues]);

    const shown: Shown | null = useMemo(() => {
        if (!loaded || solved) return null;
        if (intro < intros.length) return intros[intro]!;
        if (!step) return null;
        const key = `${step.rule}:${step.targets.map(t => t.cell).join(",")}`;
        const cells = step.targets.map(t => t.cell);
        // techniques des leçons 2 et 3 : d'abord l'explication
        if ((step.rule === "count" || step.rule === "duplicate") && explained !== key && !seen.has(step.rule)) {
            const text = step.rule === "count"
                ? `Compte les ${1 - step.targets[0]!.digit} de cette ${step.line}…`
                : `Il manque deux chiffres à cette ${step.line}, et tout le reste est pareil que l'autre ${step.line} en lumière. Si on la complétait comme elle, elles seraient identiques…`;
            return {text, spotlight: step.spotlight, targets: [], button: "Je vois"};
        }
        let text = explain(step, !seen.has(step.rule), size);
        // leçon 1 : on apprend le geste sur la première case
        if (level === 1 && values.filter((v, i) => v !== null && !clues.has(i)).length === 0) {
            text += " Touche la case qui pulse : elle passe à 0, puis à 1 (au clavier : tape 0 ou 1).";
        }
        return {text, spotlight: step.spotlight, targets: cells};
    }, [loaded, solved, intro, intros, step, explained, seen, level, values, clues, size]);

    // Techniques déjà faites dans cette leçon (textes plus courts ensuite) : retenues quand on passe à l'étape d'après
    const stepKey = step ? `${step.rule}:${step.targets.map(t => t.cell).join(",")}` : null;
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
        if (!solved || !gameId.current || done) return;
        const id = gameId.current;
        gameId.current = null;
        const firstGuest = !auth.isLoggedIn && !guestDone("BINERO").includes(level);
        if (!auth.isLoggedIn) rememberGuestLevel("BINERO", level);
        const grid = Array.from({length: size}, (_, r) => values.slice(r * size, r * size + size) as number[]);
        bineroService.validate(id, grid).then(result => {
            setDone({xp: result.xp ?? null, first: auth.isLoggedIn ? result.level?.first === true : firstGuest});
            if (result.xp !== undefined) void auth.refresh();
            confetti();
        }).catch((err: Error) => setError(err.message || "La validation a échoué."));
    }, [solved, values, size, done, auth, level]);

    if (error) return <main className="level-tutorial"><p className="tutorial-error" role="alert">{error}</p></main>;
    if (!loaded) return <main className="level-tutorial"><Loader label="Chargement de la leçon…"/></main>;

    const targets = new Set(shown?.targets ?? []);
    const spotlight = new Set([...(shown?.spotlight ?? []), ...targets]);
    const veiled = shown !== null && spotlight.size < values.length;
    // case choisie d'avance : celle touchée si elle reste à remplir, sinon la première case qui pulse pas encore juste
    const unfinished = (step?.targets ?? []).filter(t => targets.has(t.cell) && values[t.cell] !== t.digit).map(t => t.cell);
    const focusCell = selected !== null && unfinished.includes(selected) ? selected : unfinished[0] ?? null;
    // seules les cases qui pulsent répondent
    const setCell = (i: number, v: BineroCell) => {
        if (solved || !targets.has(i)) return;
        setValues(old => old.map((x, k) => (k === i ? v : x)));
    };

    const tutorialDone = done !== null && done.first && tutorial !== null && level === tutorial;
    const last = tutorial !== null && level >= tutorial;
    const next = () => navigate(`/niveaux/BINERO/${level + 1}`);
    const onButton = () => {
        if (intro < intros.length) setIntro(n => n + 1);
        else if (step) setExplained(`${step.rule}:${step.targets.map(t => t.cell).join(",")}`);
    };

    return (
        <main className="level-tutorial binero">
            <div className="tutorial-top">
                <Link to="/niveaux/BINERO" className="tutorial-back"><FaChevronLeft aria-hidden/> Niveaux</Link>
                <span className="tutorial-badge"><FaGraduationCap aria-hidden/> Leçon {level}{tutorial ? `/${tutorial}` : ""} · {LESSON_TITLES[level - 1] ?? "Binero"}</span>
            </div>

            <div className={`tutorial-stage game ${veiled ? "veiled" : ""}`} style={{"--size": size} as CSSProperties}>
                <BineroGrid size={size} values={values} isClue={i => clues.has(i)} revealed={values.length} disabled={solved}
                            selectedCell={focusCell} onSelectCell={setSelected} highlightDigit={null} onSetCell={setCell} errors={null}
                            focusCell={solved ? null : focusCell} oneTap/>
                {/* voile : sombre partout sauf les cases dont on parle ; les cases à remplir pulsent */}
                <div className="tutorial-veil" aria-hidden>
                    {values.map((_, i) => (
                        <span key={i} className={targets.has(i) ? "target" : spotlight.has(i) || !veiled ? "lit" : "dark"}/>
                    ))}
                </div>
            </div>

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
                                <p>Le tutoriel est terminé : tu sais maintenant jouer au Binero ! Génère des grilles aléatoires en attendant les niveaux.</p>
                            </>
                        ) : (
                            <>
                                <FaStar className="lesson-done-icon" aria-hidden/>
                                <h2 id="lesson-done">Leçon réussie !</h2>
                                <p>{last ? "Tu as fini les leçons du Binero." : "La suite t'attend : une nouvelle règle."}</p>
                            </>
                        )}
                        {done.xp !== null && <p className="lesson-done-xp">+{done.xp} XP</p>}
                        <div className="modal-buttons">
                            {!last && <button type="button" className="modal-button" onClick={next}>Leçon suivante</button>}
                            {last && (
                                <button type="button" className="modal-button" onClick={() => navigate("/playgame/BINERO")}>
                                    <FaDice aria-hidden/> Grille aléatoire
                                </button>
                            )}
                            <button type="button" className="modal-button secondary" onClick={() => navigate("/niveaux/BINERO")}>
                                <FaMapMarkedAlt aria-hidden/> Carte
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </main>
    );
}
