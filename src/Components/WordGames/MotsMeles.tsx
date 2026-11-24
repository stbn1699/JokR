import {type GridChallengeProps, useGridChallenge} from "../PuzzleUI/useGridChallenge.tsx";
import {type CSSProperties, type PointerEvent, useEffect, useRef, useState} from "react";
import {useGameFlow} from "../PuzzleUI/useGameFlow.ts";
import {useUndoShortcuts} from "../PuzzleUI/useMoveHistory.ts";
import {clearSavedGame, saveGame, useResumableGame} from "../PuzzleUI/savedGame.ts";
import {motsMelesService} from "../../Services/wordGames.service.ts";
import type {FoundWord, MotsMelesPuzzle} from "../../Models/wordGames.model.ts";
import WordGameShell from "./WordGameShell.tsx";
import WordSettingsPopup from "./WordSettingsPopup.tsx";
import {regionColor} from "../PuzzleUI/regionColors.ts";
import {lessonClass, useLessonCoach} from "../Lessons/useLessonCoach.tsx";
import {MOTS_MELES_LESSONS} from "../Lessons/wordLessons.ts";

const CODE = "MOTSMELES";

type Saved = { gameId: string; found: FoundWord[] };

// Trait arrondi d'une case à l'autre, passant par le centre des lettres (1 unité = 1 case)
function WordStroke({size, from, to, className, color}: { size: number; from: number; to: number; className: string; color?: string }) {
    return (
        <line x1={from % size + 0.5} y1={Math.floor(from / size) + 0.5} x2={to % size + 0.5} y2={Math.floor(to / size) + 0.5}
              className={className} style={color ? {stroke: color} : undefined}/>
    );
}

// Cases d'une ligne droite entre deux cases alignées
function lineCells(size: number, from: number, to: number): number[] {
    const dRow = Math.floor(to / size) - Math.floor(from / size);
    const dCol = (to % size) - (from % size);
    const steps = Math.max(Math.abs(dRow), Math.abs(dCol));
    return Array.from({length: steps + 1}, (_, i) => from + (Math.sign(dRow) * size + Math.sign(dCol)) * i);
}

// Case d'arrivée ramenée sur la direction la plus proche (8 directions), sans sortir de la grille
function snapToLine(size: number, from: number, hover: number): number {
    const row = Math.floor(from / size);
    const col = from % size;
    const dRow = Math.floor(hover / size) - row;
    const dCol = (hover % size) - col;
    if (dRow === 0 && dCol === 0) return from;

    const angle = Math.round(Math.atan2(dRow, dCol) / (Math.PI / 4)) * (Math.PI / 4);
    const stepRow = Math.round(Math.sin(angle));
    const stepCol = Math.round(Math.cos(angle));
    let steps = Math.max(Math.abs(dRow), Math.abs(dCol));
    while (steps > 0) {
        const r = row + stepRow * steps;
        const c = col + stepCol * steps;
        if (r >= 0 && r < size && c >= 0 && c < size) return r * size + c;
        steps--;
    }
    return from;
}

/**
 * Mots mêlés : glisser d'une lettre à l'autre pour entourer chaque mot de la liste.
 * Le serveur relit les lettres sélectionnées à la fin de la partie.
 */
export default function MotsMeles({daily = false, replayDate, challengeId, level, levelInfo}: GridChallengeProps = {}) {
    const flow = useGameFlow(CODE, daily || replayDate !== undefined || challengeId !== undefined || level !== undefined);
    const challenge = useGridChallenge<Saved, MotsMelesPuzzle>({
        code: CODE, gameName: "Mots mêlés", daily, replayDate, challengeId, level, levelInfo, lessonTitles: MOTS_MELES_LESSONS.titles,
        fetchStatus: motsMelesService.getGame,
        emptySave: gameId => ({gameId, found: []}),
        onLoad: (grid, saved, elapsedMs) => {
            restore(grid, saved);
            flow.resume(elapsedMs);
        },
    });
    const {resumable, dismissResumable} = useResumableGame<Saved, MotsMelesPuzzle>(challenge.saveKey, motsMelesService.getGame, !challenge.challenge);
    const [puzzle, setPuzzle] = useState<MotsMelesPuzzle | null>(null);
    const [found, setFound] = useState<FoundWord[]>([]);
    const [undone, setUndone] = useState<FoundWord[]>([]);
    const [selection, setSelection] = useState<{ from: number; to: number } | null>(null);
    const gameId = useRef<string | null>(null);
    const board = useRef<HTMLDivElement>(null);

    const playing = puzzle !== null && !flow.showSettings && !flow.victory;
    const coach = useLessonCoach(MOTS_MELES_LESSONS, level, challenge.lesson, puzzle ? {found} : null, playing);

    useEffect(() => {
        if (gameId.current) saveGame<Saved>(challenge.saveKey, {gameId: gameId.current, found});
    }, [found, challenge.saveKey]);

    const start = (next: MotsMelesPuzzle, id: string, words: FoundWord[]) => {
        gameId.current = id;
        setPuzzle(next);
        setFound(words);
        setUndone([]);
        setSelection(null);
    };

    const handleGenerate = (size: number, amount: number) => {
        dismissResumable();
        void flow.generate(async () => {
            try {
                const {gameId: id, puzzle: next} = await motsMelesService.generate(size, amount);
                start(next, id, []);
                saveGame<Saved>(challenge.saveKey, {gameId: id, found: []});
                return null;
            } catch (err) {
                return (err as Error).message || "Impossible de lancer la partie.";
            }
        });
    };

    // Partie sauvegardée (reprise ou défi) : grille de départ et saisies du joueur
    const restore = (grid: MotsMelesPuzzle, saved: Saved) => {
        start(grid, saved.gameId, Array.isArray(saved.found) ? saved.found : []);
    };

    const handleResume = () => {
        if (!resumable) return;
        restore(resumable.grid, resumable.saved);
        flow.resume(resumable.elapsedMs + Date.now() - resumable.checkedAt);
        dismissResumable();
    };

    // Chaque mot garde sa couleur, quel que soit l'ordre dans lequel on le trouve
    const wordColor = (word: string) => regionColor(puzzle?.words.indexOf(word) ?? 0);

    const cellAt = (e: PointerEvent<HTMLDivElement>) => {
        const rect = board.current?.getBoundingClientRect();
        if (!rect || !puzzle) return null;
        const col = Math.floor((e.clientX - rect.left) / rect.width * puzzle.size);
        const row = Math.floor((e.clientY - rect.top) / rect.height * puzzle.size);
        if (row < 0 || row >= puzzle.size || col < 0 || col >= puzzle.size) return null;
        return row * puzzle.size + col;
    };

    const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
        if (!playing) return;
        const cell = cellAt(e);
        if (cell === null) return;
        e.currentTarget.setPointerCapture(e.pointerId);
        setSelection({from: cell, to: cell});
    };

    const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
        if (!selection || !puzzle) return;
        const cell = cellAt(e);
        if (cell !== null) setSelection({from: selection.from, to: snapToLine(puzzle.size, selection.from, cell)});
    };

    const onPointerUp = () => {
        if (!selection || !puzzle) return;
        const text = lineCells(puzzle.size, selection.from, selection.to).map(c => puzzle.letters[c]).join("");
        const reversed = text.split("").reverse().join("");
        const word = puzzle.words.find(w => (w === text || w === reversed) && !found.some(f => f.word === w));
        setSelection(null);
        if (!word) return;

        const next = [...found, {word, from: selection.from, to: selection.to}];
        setFound(next);
        setUndone([]);
        if (next.length === puzzle.words.length && gameId.current) {
            const id = gameId.current;
            void flow.submit(async () => {
                try {
                    const result = await motsMelesService.validate(id, next);
                    gameId.current = null;
                    clearSavedGame(challenge.saveKey);
                    return {ok: true, result};
                } catch (err) {
                    return {ok: false, message: (err as Error).message || "La validation a échoué, réessaie."};
                }
            });
        }
    };

    const undo = () => {
        const last = found[found.length - 1];
        if (!last) return;
        setUndone(u => [last, ...u]);
        setFound(f => f.slice(0, -1));
    };
    const redo = () => {
        const [next, ...rest] = undone;
        if (!next) return;
        setUndone(rest);
        setFound(f => [...f, next]);
    };
    const reset = () => {
        // les mots retirés restent disponibles avec Rétablir
        setUndone(found);
        setFound([]);
    };
    useUndoShortcuts(undo, redo, playing);

    const directions = !puzzle ? "" : puzzle.size >= 12 ? "Dans tous les sens, même à l'envers"
        : puzzle.size >= 10 ? "À l'horizontale, à la verticale et en diagonale" : "À l'horizontale et à la verticale";
    const rules = (
        <ul>
            <li>Retrouve tous les mots de la liste dans la grille</li>
            <li>Glisse de la première à la dernière lettre d'un mot</li>
            <li>8×8 : horizontal et vertical. 10×10 : aussi en diagonale. 12×12 : aussi à l'envers</li>
            <li>Une même lettre peut servir à plusieurs mots</li>
        </ul>
    );

    return (
        <WordGameShell
            challenge={challenge}
            className="mots-meles" gameCode={CODE} gameName="Mots mêlés" flow={flow} rules={rules}
            info={puzzle ? (
                <>
                    <p><strong>{found.length}</strong> / {puzzle.words.length} mots</p>
                    <ul className="word-list">
                        {puzzle.words.map(word => (
                            <li key={word} className={found.some(f => f.word === word) ? "found" : ""}
                                style={{"--word-color": wordColor(word)} as CSSProperties}>{word}</li>
                        ))}
                    </ul>
                    <p className="word-hint">{directions}</p>
                </>
            ) : <p>–</p>}
            history={{
                canUndo: playing && found.length > 0, canRedo: playing && undone.length > 0,
                canReset: playing && found.length > 0, onUndo: undo, onRedo: redo, onReset: reset,
            }}
            settings={
                <WordSettingsPopup open={flow.showSettings && !challenge.challenge} load={motsMelesService.getSettings} onGenerate={handleGenerate}
                                   resume={resumable ? {elapsedMs: resumable.elapsedMs, onResume: handleResume} : undefined}
                                   sizeLegend="Taille de la grille" sizeLabel={s => `${s}×${s}`}
                                   amountLabel="Mots à trouver"/>
            }
        >
            {puzzle && (
                <div ref={board} className="search-board" style={{"--size": puzzle.size} as CSSProperties}
                     onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp}
                     onPointerCancel={() => setSelection(null)} role="grid" aria-label="Grille de lettres">
                    {/* Traits sous les lettres : mots trouvés, puis sélection en cours */}
                    <svg className="search-strokes" viewBox={`0 0 ${puzzle.size} ${puzzle.size}`} aria-hidden>
                        {found.map(item => (
                            <WordStroke key={item.word} size={puzzle.size} from={item.from} to={item.to}
                                        className="search-stroke" color={wordColor(item.word)}/>
                        ))}
                        {selection && <WordStroke size={puzzle.size} from={selection.from} to={selection.to} className="search-stroke selecting"/>}
                    </svg>
                    {Array.from(puzzle.letters, (letter, cell) => (
                        <span key={cell} role="gridcell" className={`search-cell ${lessonClass(coach.lit, cell)}`}>{letter}</span>
                    ))}
                </div>
            )}
            {coach.bubble}
        </WordGameShell>
    );
}
