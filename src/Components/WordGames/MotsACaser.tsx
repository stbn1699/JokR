import {type GridChallengeProps, useGridChallenge} from "../PuzzleUI/useGridChallenge.tsx";
import {type CSSProperties, useEffect, useMemo, useRef, useState} from "react";
import {useGameFlow} from "../PuzzleUI/useGameFlow.ts";
import {useAutoValidate} from "../PuzzleUI/useAutoValidate.ts";
import {useUndoShortcuts} from "../PuzzleUI/useMoveHistory.ts";
import {clearSavedGame, saveGame, useResumableGame} from "../PuzzleUI/savedGame.ts";
import {motsACaserService} from "../../Services/wordGames.service.ts";
import type {MotsACaserPuzzle} from "../../Models/wordGames.model.ts";
import {isTouchOnly} from "../../Services/useSmallScreen.ts";
import PhoneKeyboard from "./PhoneKeyboard.tsx";
import {useLetterKeys} from "./useLetterKeys.ts";
import WordGameShell from "./WordGameShell.tsx";
import WordSettingsPopup from "./WordSettingsPopup.tsx";
import {lessonClass, useLessonCoach} from "../Lessons/useLessonCoach.tsx";
import {MOTS_A_CASER_LESSONS} from "../Lessons/wordLessons.ts";

const CODE = "MOTSACASER";
const ARROWS: Record<string, [number, number]> = {ArrowUp: [-1, 0], ArrowDown: [1, 0], ArrowLeft: [0, -1], ArrowRight: [0, 1]};

type Saved = { gameId: string; letters: string };
type Direction = "across" | "down";

// Emplacements de mots : suites d'au moins deux cases blanches, en ligne puis en colonne
function wordSlots(cells: string, size: number): number[][] {
    const slots: number[][] = [];
    const scan = (at: (line: number, position: number) => number) => {
        for (let line = 0; line < size; line++) {
            let run: number[] = [];
            for (let position = 0; position <= size; position++) {
                const cell = position < size ? at(line, position) : -1;
                if (cell >= 0 && cells[cell] !== "#") {
                    run.push(cell);
                } else {
                    if (run.length >= 2) slots.push(run);
                    run = [];
                }
            }
        }
    };
    scan((row, col) => row * size + col);
    scan((col, row) => row * size + col);
    return slots;
}

const directionOf = (slot: number[]): Direction => (slot[1]! - slot[0]! === 1 ? "across" : "down");
const startLetters = (puzzle: MotsACaserPuzzle) => Array.from(puzzle.cells, cell => (cell === "." ? "" : cell));

/**
 * Mots à caser : placer chaque mot de la liste dans la grille.
 * Un clic choisit une case, un second clic (ou Entrée) change le sens d'écriture.
 * Le serveur vérifie la grille dès qu'elle est remplie.
 */
export default function MotsACaser({daily = false, replayDate, challengeId, level, levelInfo}: GridChallengeProps = {}) {
    const flow = useGameFlow(CODE, daily || replayDate !== undefined || challengeId !== undefined || level !== undefined);
    const challenge = useGridChallenge<Saved, MotsACaserPuzzle>({
        code: CODE, gameName: "Mots à caser", playName: "aux Mots à caser", daily, replayDate, challengeId, level, levelInfo, lessonTitles: MOTS_A_CASER_LESSONS.titles,
        fetchStatus: motsACaserService.getGame,
        emptySave: gameId => ({gameId, letters: ""}),
        onLoad: (grid, saved, elapsedMs) => {
            restore(grid, saved);
            flow.resume(elapsedMs);
        },
    });
    const {resumable, dismissResumable} = useResumableGame<Saved, MotsACaserPuzzle>(challenge.saveKey, motsACaserService.getGame, !challenge.challenge);
    const [puzzle, setPuzzle] = useState<MotsACaserPuzzle | null>(null);
    const [letters, setLetters] = useState<string[]>([]);
    const [past, setPast] = useState<string[][]>([]);
    const [future, setFuture] = useState<string[][]>([]);
    const [selected, setSelected] = useState<number | null>(null);
    const [direction, setDirection] = useState<Direction>("across");
    const gameId = useRef<string | null>(null);

    const playing = puzzle !== null && !flow.showSettings && !flow.victory;
    const coach = useLessonCoach(MOTS_A_CASER_LESSONS, level, challenge.lesson, puzzle ? {letters} : null, playing);
    const slots = useMemo(() => (puzzle ? wordSlots(puzzle.cells, puzzle.size) : []), [puzzle]);
    const isGiven = (cell: number) => puzzle !== null && puzzle.cells[cell] !== ".";
    const isBlack = (cell: number) => puzzle?.cells[cell] === "#";
    const slotAt = (cell: number, wanted: Direction) => slots.find(slot => directionOf(slot) === wanted && slot.includes(cell));
    const activeSlot = selected === null ? undefined
        : slotAt(selected, direction) ?? slotAt(selected, direction === "across" ? "down" : "across");

    // Emplacements complets : bons s'ils contiennent un mot de la liste (une seule fois), faux sinon
    const {placedWords, placedCells, wrongCells} = useMemo(() => {
        const placed = new Set<string>();
        const good = new Set<number>();
        const wrong = new Set<number>();
        if (!puzzle) return {placedWords: placed, placedCells: good, wrongCells: wrong};

        const complete = slots.map(slot => ({slot, text: slot.map(c => letters[c] ?? "").join("")}))
            .filter(({slot, text}) => text.length === slot.length);
        const uses = new Map<string, number>();
        complete.forEach(({text}) => uses.set(text, (uses.get(text) ?? 0) + 1));
        for (const {slot, text} of complete) {
            const valid = puzzle.words.includes(text) && uses.get(text) === 1;
            if (valid) placed.add(text);
            slot.forEach(c => (valid ? good : wrong).add(c));
        }
        return {placedWords: placed, placedCells: good, wrongCells: wrong};
    }, [puzzle, slots, letters]);

    const wordGroups = useMemo(() => {
        const groups = new Map<number, string[]>();
        for (const word of puzzle?.words ?? []) groups.set(word.length, [...(groups.get(word.length) ?? []), word]);
        return [...groups].sort((a, b) => a[0] - b[0]);
    }, [puzzle]);

    useEffect(() => {
        if (gameId.current && letters.length > 0) {
            saveGame<Saved>(challenge.saveKey, {gameId: gameId.current, letters: letters.map(l => l || ".").join("")});
        }
    }, [letters, challenge.saveKey]);

    const start = (next: MotsACaserPuzzle, id: string, initial: string[]) => {
        gameId.current = id;
        setPuzzle(next);
        setLetters(initial);
        setPast([]);
        setFuture([]);
        const firstEmpty = initial.findIndex(letter => letter === "");
        setSelected(firstEmpty >= 0 ? firstEmpty : null);
        const nextSlots = wordSlots(next.cells, next.size);
        setDirection(nextSlots.some(slot => directionOf(slot) === "across" && slot.includes(firstEmpty)) ? "across" : "down");
    };

    const handleGenerate = (size: number, amount: number) => {
        dismissResumable();
        void flow.generate(async () => {
            try {
                const {gameId: id, puzzle: next} = await motsACaserService.generate(size, amount);
                start(next, id, startLetters(next));
                return null;
            } catch (err) {
                return (err as Error).message || "Impossible de lancer la partie.";
            }
        });
    };

    // Partie sauvegardée (reprise ou défi) : grille de départ et saisies du joueur
    const restore = (grid: MotsACaserPuzzle, saved: Saved) => {
        const restored = saved.letters?.length === grid.cells.length
            ? Array.from(saved.letters, letter => (letter === "." ? "" : letter))
            : startLetters(grid);
        start(grid, saved.gameId, restored);
    };

    const handleResume = () => {
        if (!resumable) return;
        restore(resumable.grid, resumable.saved);
        flow.resume(resumable.elapsedMs + Date.now() - resumable.checkedAt);
        dismissResumable();
    };

    const commit = (next: string[]) => {
        setPast(p => [...p, letters]);
        setFuture([]);
        setLetters(next);
    };

    const writeLetter = (letter: string) => {
        if (!playing || coach.locked || selected === null || !activeSlot) return;
        let index = activeSlot.indexOf(selected);
        // une lettre donnée ne s'écrase pas : on écrit dans la case libre suivante du mot
        while (isGiven(activeSlot[index]!) && index < activeSlot.length - 1) index++;
        const cell = activeSlot[index]!;
        if (!isGiven(cell) && letters[cell] !== letter) {
            const next = [...letters];
            next[cell] = letter;
            commit(next);
        }
        let after = index + 1;
        while (after < activeSlot.length - 1 && isGiven(activeSlot[after]!)) after++;
        setSelected(activeSlot[Math.min(after, activeSlot.length - 1)]!);
    };

    // Clic sur un mot de la liste : il remplit la zone active depuis son début. Trop long, il est coupé ;
    // trop court, la fin de la zone reste vide. Les lettres données ne bougent pas. Un seul « Annuler » suffit.
    const insertWord = (word: string) => {
        if (!playing || coach.locked) return;
        if (!activeSlot) {
            flow.setNotice("Choisis d'abord une case de la grille.");
            return;
        }
        flow.clearNotice();
        const next = [...letters];
        activeSlot.forEach((cell, i) => {
            if (!isGiven(cell)) next[cell] = word[i] ?? "";
        });
        if (next.some((letter, cell) => letter !== letters[cell])) commit(next);
        setSelected(activeSlot.find(cell => next[cell] === "") ?? activeSlot[activeSlot.length - 1]!);
    };

    const erase = () => {
        if (!playing || coach.locked || selected === null) return;
        if (!isGiven(selected) && letters[selected]) {
            const next = [...letters];
            next[selected] = "";
            commit(next);
            return;
        }
        if (!activeSlot) return;
        let index = activeSlot.indexOf(selected) - 1;
        while (index > 0 && isGiven(activeSlot[index]!)) index--;
        if (index < 0) return;
        const cell = activeSlot[index]!;
        setSelected(cell);
        if (!isGiven(cell) && letters[cell]) {
            const next = [...letters];
            next[cell] = "";
            commit(next);
        }
    };

    const toggleDirection = () => {
        if (selected === null) return;
        const other = direction === "across" ? "down" : "across";
        if (slotAt(selected, other)) setDirection(other);
    };

    const chooseCell = (cell: number) => {
        // leçon : seules les cases qui brillent répondent
        if (!playing || !coach.allows(cell)) return;
        if (cell === selected) return toggleDirection();
        setSelected(cell);
        if (!slotAt(cell, direction)) setDirection(direction === "across" ? "down" : "across");
    };

    useLetterKeys(playing, {onLetter: writeLetter, onBackspace: erase, onEnter: toggleDirection});

    // Flèches : case blanche suivante dans ce sens, en sautant les cases noires
    const moveRef = useRef<(key: string) => void>(() => undefined);
    useEffect(() => {
        moveRef.current = (key: string) => {
            if (!puzzle || selected === null) return;
            const [dr, dc] = ARROWS[key]!;
            let row = Math.floor(selected / puzzle.size) + dr;
            let col = selected % puzzle.size + dc;
            while (row >= 0 && col >= 0 && row < puzzle.size && col < puzzle.size) {
                const cell = row * puzzle.size + col;
                if (!isBlack(cell) && coach.allows(cell)) {
                    const wanted: Direction = dc !== 0 ? "across" : "down";
                    setSelected(cell);
                    if (slotAt(cell, wanted)) setDirection(wanted);
                    return;
                }
                row += dr;
                col += dc;
            }
        };
    });
    useEffect(() => {
        if (!playing) return;
        const onKeyDown = (e: KeyboardEvent) => {
            if (!ARROWS[e.key]) return;
            e.preventDefault();
            moveRef.current(e.key);
        };
        window.addEventListener("keydown", onKeyDown);
        return () => window.removeEventListener("keydown", onKeyDown);
    }, [playing]);

    const undo = () => {
        const previous = past[past.length - 1];
        if (!previous) return;
        setPast(p => p.slice(0, -1));
        setFuture(f => [letters, ...f]);
        setLetters(previous);
    };
    const redo = () => {
        const [next, ...rest] = future;
        if (!next) return;
        setFuture(rest);
        setPast(p => [...p, letters]);
        setLetters(next);
    };
    const reset = () => {
        if (puzzle) commit(startLetters(puzzle));
    };
    useUndoShortcuts(undo, redo, playing);

    const hasInput = puzzle !== null && letters.some((letter, cell) => letter !== "" && !isGiven(cell));
    const full = letters.length > 0 && letters.every(letter => letter !== "");

    useAutoValidate({
        filledKey: full ? letters.join("") : null,
        playing,
        hasErrors: wrongCells.size > 0,
        setNotice: flow.setNotice,
        submit: () => flow.submit(async () => {
            if (!gameId.current) return {ok: false, message: "Lance une partie avant de valider."};
            try {
                const result = await motsACaserService.validate(gameId.current, letters.join(""));
                gameId.current = null;
                clearSavedGame(challenge.saveKey);
                return {ok: true, result};
            } catch (err) {
                return {ok: false, message: (err as Error).message || "La validation a échoué, réessaie."};
            }
        }),
    });

    const rules = (
        <ul>
            <li>Place tous les mots de la liste dans la grille</li>
            <li>Il n'y a qu'une seule façon de tous les caser</li>
            <li>Les mots s'écrivent de gauche à droite ou de haut en bas, et se croisent sur leurs lettres</li>
            <li>Commence par les longueurs où il y a peu de mots</li>
            <li>Clic sur la case choisie ou Entrée : change le sens d'écriture</li>
            <li>Clic sur un mot de la liste : il s'écrit dans la zone sélectionnée</li>
        </ul>
    );

    const wordGroupList = wordGroups.map(([length, words]) => (
        <section className="caser-group" key={length}>
            <h3>{length} lettres</h3>
            <ul>
                {words.map(word => (
                    <li key={word} className={placedWords.has(word) ? "found" : ""}>
                        <button type="button" disabled={!playing} title="Insérer dans la zone sélectionnée"
                                onMouseDown={e => e.preventDefault()} onClick={() => insertWord(word)}>
                            {word}
                        </button>
                    </li>
                ))}
            </ul>
        </section>
    ));

    return (
        <WordGameShell
            challenge={challenge}
            className="mots-a-caser" gameCode={CODE} gameName="Mots à caser" flow={flow} rules={rules}
            info={puzzle ? (
                <>
                    <p><strong>{placedWords.size}</strong> / {puzzle.words.length} mots</p>
                    {wordGroupList}
                </>
            ) : <p>–</p>}
            history={{
                canUndo: playing && past.length > 0, canRedo: playing && future.length > 0,
                canReset: playing && hasInput, onUndo: undo, onRedo: redo, onReset: reset,
            }}
            settings={
                <WordSettingsPopup open={flow.showSettings && !challenge.challenge} load={motsACaserService.getSettings} onGenerate={handleGenerate}
                                   resume={resumable ? {elapsedMs: resumable.elapsedMs, onResume: handleResume} : undefined}
                                   sizeLegend="Taille de la grille" sizeLabel={s => `${s}×${s}`}
                                   amountLabel="Mots déjà placés" easierWhenHigher/>
            }
        >
            {puzzle && isTouchOnly() && coach.controls && (
                <PhoneKeyboard disabled={!playing} onLetter={writeLetter} onBackspace={erase} onEnter={toggleDirection}/>
            )}
            {puzzle && (
                <div className={`caser-board ${coach.locked ? "lesson-locked" : ""}`} style={{"--size": puzzle.size} as CSSProperties} role="grid" aria-label="Grille de mots à caser">
                    {Array.from(puzzle.cells, (cell, i) => {
                        if (cell === "#") return <span key={i} className="caser-cell black" aria-hidden/>;
                        const classes = ["caser-cell", isGiven(i) ? "given" : "", activeSlot?.includes(i) ? "active" : "",
                            placedCells.has(i) ? "placed" : "", wrongCells.has(i) ? "wrong" : "", i === selected ? "selected" : "",
                            lessonClass(coach.lit, i)];
                        return (
                            <button key={i} type="button" role="gridcell" className={classes.join(" ")} disabled={!playing}
                                    aria-label={`Ligne ${Math.floor(i / puzzle.size) + 1}, colonne ${i % puzzle.size + 1}${letters[i] ? `, ${letters[i]}` : ""}`}
                                    onMouseDown={e => e.preventDefault()} onClick={() => chooseCell(i)}>
                                {letters[i]}
                            </button>
                        );
                    })}
                </div>
            )}
            {coach.bubble}
            {challenge.lesson && coach.controls && <div className="lesson-controls caser-lesson-words">{wordGroupList}</div>}
        </WordGameShell>
    );
}
