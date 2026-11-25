/**
 * Tutoriel guidé des jeux ajoutés depuis 3.3 : la leçon se joue dans le jeu lui-même (sa grille, ses règles, sa
 * validation), présentée comme les tutoriels des jeux d'origine (Levels/LessonFrame.tsx) : la grille seule
 * (pas de chrono ni de panneaux, voir la classe in-lesson de useGridChallenge), une bulle sous la grille qui explique
 * pas à pas, et des cases mises en avant (le reste dans l'ombre).
 * Chaque jeu décrit ses leçons (fichiers *Lessons.ts de ce dossier) : une suite d'étapes, chacune
 * - une explication, avec un bouton pour continuer : la grille ne répond pas tant qu'on n'a pas lu (`locked`),
 * - ou une action à faire : l'étape passe toute seule dès que `done` est vrai sur l'état du jeu ; si elle met des cases
 *   en avant, seules celles-ci répondent (`allows`).
 * Les commandes du jeu (palette, clavier, liste de mots…) n'apparaissent qu'à la première action (`controls`).
 * L'étape affichée est la première pas encore faite : annuler un coup ramène l'étape correspondante.
 * Les grilles des leçons sont dans backend/src/utils/gridLessons.ts.
 */

import "./Lessons.scss";
import {type ReactNode, useState} from "react";

export type CoachStep<S> = {
    text: string | ((state: S) => string);
    // cases mises en avant (numéro de case du plateau) ; absent : rien dans l'ombre
    lit?: readonly number[] | ((state: S) => readonly number[]);
    // étape d'action : faite quand c'est vrai ; sans `done`, l'étape attend le bouton
    done?: (state: S) => boolean;
    button?: string;
};

export type GameLessons<S> = {
    titles: readonly string[];
    // étapes de la leçon n (à partir de 1)
    steps: (level: number) => CoachStep<S>[];
};

type Coach = {
    bubble: ReactNode;
    lit: Set<number> | null;
    // explication en cours : la grille attend le bouton de la bulle
    locked: boolean;
    // la case (ou la zone, le véhicule… selon le jeu) peut être jouée maintenant
    allows: (cell: number) => boolean;
    // commandes du jeu à montrer (hors leçon : toujours)
    controls: boolean;
};

const NONE: Coach = {bubble: null, lit: null, locked: false, allows: () => true, controls: true};

/**
 * `lesson` : la partie est une leçon du tutoriel ; `state` : l'état du jeu (null tant que la grille n'est pas là) ;
 * `active` : la partie est en cours (pas de bulle sur la popup de victoire).
 */
export function useLessonCoach<S>(lessons: GameLessons<S>, level: number | undefined, lesson: boolean, state: S | null, active: boolean): Coach {
    // explications déjà lues (numéro d'étape)
    const [read, setRead] = useState<Set<number>>(new Set());
    if (!lesson || level === undefined) return NONE;
    // leçon pas encore chargée ou finie : pas de bulle, et les commandes restent cachées tant que rien n'a commencé
    if (state === null || !active) return {...NONE, controls: state !== null};

    const steps = lessons.steps(level);
    const index = steps.findIndex((step, i) => (step.done ? !step.done(state) : !read.has(i)));
    const step = steps[index];
    if (!step) return NONE;
    const firstAction = steps.findIndex(s => s.done);

    const text = typeof step.text === "function" ? step.text(state) : step.text;
    const lit = typeof step.lit === "function" ? step.lit(state) : step.lit;
    const firstRead = !steps.slice(0, index).some(s => !s.done);
    const button = step.done ? null : step.button ?? (firstRead ? "C'est parti" : "Suivant");
    const bubble = (
        <div className="lesson-coach" role="status" key={`${index}:${text}`}>
            <p>{text}</p>
            {button && <button type="button" onClick={() => setRead(r => new Set(r).add(index))}>{button}</button>}
        </div>
    );
    const litSet = lit ? new Set(lit) : null;
    const locked = !step.done;
    return {
        bubble,
        lit: litSet,
        locked,
        allows: cell => !locked && (!litSet || litSet.has(cell)),
        controls: firstAction >= 0 && index >= firstAction,
    };
}

// Classes d'une case HTML pendant une leçon : dans l'ombre, ou mise en avant
export const lessonClass = (lit: Set<number> | null, cell: number) => (!lit ? "" : lit.has(cell) ? "lesson-lit" : "lesson-dim");
