/**
 * Pâturages : découper tout le pré en carrés, avec exactement une vache dans chaque carré.
 * On glisse d'un coin à l'autre pour tracer un carré ; un clic sur un carré l'enlève, un clic sur une case vide pose un 1×1.
 * Pré entièrement découpé : validé automatiquement par le serveur.
 */

import {type PointerEvent, useEffect, useMemo, useRef, useState} from "react";
import "../PuzzleUI/PuzzleLayout.scss";
import "./Paturages.scss";
import {SuccessPopup} from "../SuccessPopup/SuccessPopup.tsx";
import GameNotice from "../PuzzleUI/GameNotice.tsx";
import Loader from "../Loader/Loader.tsx";
import {type GridChallengeProps, useGridChallenge} from "../PuzzleUI/useGridChallenge.tsx";
import GameTimer from "../PuzzleUI/GameTimer.tsx";
import GameToolbar from "../PuzzleUI/GameToolbar.tsx";
import HistoryButtons from "../PuzzleUI/HistoryButtons.tsx";
import {SkeletonLabel} from "../PuzzleUI/GridSkeleton.tsx";
import {regionColor} from "../PuzzleUI/regionColors.ts";
import {clearSavedGame, saveGame, useResumableGame} from "../PuzzleUI/savedGame.ts";
import {useAutoValidate} from "../PuzzleUI/useAutoValidate.ts";
import {useGameFlow} from "../PuzzleUI/useGameFlow.ts";
import {useUndoShortcuts} from "../PuzzleUI/useMoveHistory.ts";
import WordSettingsPopup from "../WordGames/WordSettingsPopup.tsx";
import {paturagesService} from "../../Services/paturages.service.ts";
import type {PaturagesPuzzle, PaturagesSquare} from "../../Models/paturages.model.ts";
import {contains, cowsIn, initialSquares, isGiven, isSolved, overlaps, placeSquare, type PlacedSquare, squareFromDrag} from "./paturagesRules.ts";
import {useLessonCoach} from "../Lessons/useLessonCoach.tsx";
import LessonSpots from "../Lessons/LessonSpots.tsx";
import {PATURAGES_LESSONS} from "../Lessons/paturagesLessons.ts";

const CODE = "PATURAGES";

type Saved = { gameId: string; squares: PlacedSquare[] };
type Drag = { row: number; col: number; square: PaturagesSquare; moved: boolean };

// Tête de vache, centrée sur (0, 0)
function Cow({row, col}: { row: number; col: number }) {
    return (
        <g className="paturages-cow" transform={`translate(${col + 0.5} ${row + 0.52}) scale(0.82)`}>
            <path className="horn" d="M-0.17 -0.28 Q-0.3 -0.38 -0.2 -0.47 M0.17 -0.28 Q0.3 -0.38 0.2 -0.47"/>
            <ellipse className="hide" cx={-0.33} cy={-0.14} rx={0.14} ry={0.07}/>
            <ellipse className="hide" cx={0.33} cy={-0.14} rx={0.14} ry={0.07}/>
            <rect className="hide" x={-0.25} y={-0.32} width={0.5} height={0.6} rx={0.2}/>
            <path className="patch" d="M-0.25 -0.14 Q-0.25 -0.32 -0.06 -0.32 Q-0.01 -0.14 -0.11 -0.03 Q-0.2 0 -0.25 -0.03Z"/>
            <circle className="eye" cx={-0.11} cy={-0.1} r={0.035}/>
            <circle className="eye" cx={0.11} cy={-0.1} r={0.035}/>
            <ellipse className="muzzle" cx={0} cy={0.15} rx={0.22} ry={0.14}/>
            <circle className="eye" cx={-0.08} cy={0.14} r={0.022}/>
            <circle className="eye" cx={0.08} cy={0.14} r={0.022}/>
        </g>
    );
}

export default function Paturages({daily = false, replayDate, challengeId, level, levelInfo}: GridChallengeProps = {}) {
    const flow = useGameFlow(CODE, daily || replayDate !== undefined || challengeId !== undefined || level !== undefined);
    const challenge = useGridChallenge<Saved, PaturagesPuzzle>({
        code: CODE, gameName: "Pâturages", daily, replayDate, challengeId, level, levelInfo, lessonTitles: PATURAGES_LESSONS.titles,
        fetchStatus: paturagesService.getGame,
        emptySave: gameId => ({gameId, squares: []}),
        onLoad: (grid, saved, elapsedMs) => {
            restore(grid, saved);
            flow.resume(elapsedMs);
        },
    });
    const {resumable, dismissResumable} = useResumableGame<Saved, PaturagesPuzzle>(challenge.saveKey, paturagesService.getGame, !challenge.challenge);
    const [puzzle, setPuzzle] = useState<PaturagesPuzzle | null>(null);
    const [squares, setSquares] = useState<PlacedSquare[]>([]);
    const [past, setPast] = useState<PlacedSquare[][]>([]);
    const [future, setFuture] = useState<PlacedSquare[][]>([]);
    const [drag, setDrag] = useState<Drag | null>(null);
    const dragRef = useRef<Drag | null>(null);
    const board = useRef<SVGSVGElement>(null);
    const gameId = useRef<string | null>(null);

    const playing = puzzle !== null && !flow.showSettings && !flow.victory;
    const solved = puzzle !== null && drag === null && isSolved(puzzle, squares);
    const coach = useLessonCoach(PATURAGES_LESSONS, level, challenge.lesson, puzzle ? {size: puzzle.size, squares} : null, playing && drag === null);
    const settled = useMemo(
        () => (puzzle ? squares.filter(square => cowsIn(square, puzzle.cows, puzzle.size) === 1).length : 0),
        [puzzle, squares],
    );

    useEffect(() => {
        if (gameId.current) saveGame<Saved>(challenge.saveKey, {gameId: gameId.current, squares});
    }, [squares, challenge.saveKey]);

    const start = (next: PaturagesPuzzle, id: string, initial: PlacedSquare[]) => {
        gameId.current = id;
        setPuzzle(next);
        setSquares(initial);
        setPast([]);
        setFuture([]);
        dragRef.current = null;
        setDrag(null);
    };

    const handleGenerate = (size: number, given: number) => {
        dismissResumable();
        void flow.generate(async () => {
            try {
                const {gameId: id, puzzle: next} = await paturagesService.generate(size, given);
                start(next, id, initialSquares(next));
                return null;
            } catch (err) {
                return (err as Error).message || "Impossible de lancer la partie.";
            }
        });
    };

    // Partie sauvegardée (reprise ou défi) : grille de départ et saisies du joueur
    const restore = (grid: PaturagesPuzzle, saved: Saved) => {
        start(grid, saved.gameId, saved.squares?.length ? saved.squares : initialSquares(grid));
    };

    const handleResume = () => {
        if (!resumable) return;
        restore(resumable.grid, resumable.saved);
        flow.resume(resumable.elapsedMs + Date.now() - resumable.checkedAt);
        dismissResumable();
    };

    const commit = (next: PlacedSquare[]) => {
        setPast(p => [...p, squares]);
        setFuture([]);
        setSquares(next);
    };

    const cellAt = (e: PointerEvent<SVGSVGElement>) => {
        const rect = board.current?.getBoundingClientRect();
        if (!rect || !puzzle) return null;
        const col = Math.floor((e.clientX - rect.left) / rect.width * puzzle.size);
        const row = Math.floor((e.clientY - rect.top) / rect.height * puzzle.size);
        return {
            row: Math.max(0, Math.min(puzzle.size - 1, row)),
            col: Math.max(0, Math.min(puzzle.size - 1, col)),
        };
    };

    const onPointerDown = (e: PointerEvent<SVGSVGElement>) => {
        if (!playing || e.button !== 0) return;
        const cell = cellAt(e);
        if (!cell) return;
        e.currentTarget.setPointerCapture(e.pointerId);
        const next = {...cell, square: {...cell, side: 1}, moved: false};
        dragRef.current = next;
        setDrag(next);
    };

    const onPointerMove = (e: PointerEvent<SVGSVGElement>) => {
        const current = dragRef.current;
        if (!current || !puzzle) return;
        const cell = cellAt(e);
        if (!cell) return;
        const square = squareFromDrag(puzzle.size, current.row, current.col, cell.row, cell.col);
        const moved = current.moved || cell.row !== current.row || cell.col !== current.col;
        if (moved === current.moved && square.row === current.square.row && square.col === current.square.col && square.side === current.square.side) return;
        const next = {...current, square, moved};
        dragRef.current = next;
        setDrag(next);
    };

    const endDrag = () => {
        const current = dragRef.current;
        if (!current || !puzzle) return;
        dragRef.current = null;
        setDrag(null);

        // Simple clic : enlève le carré sous la souris, ou pose un 1×1 sur une case vide
        if (!current.moved) {
            const under = squares.find(square => contains(square, current.row, current.col));
            if (under) {
                if (!isGiven(puzzle, under)) commit(squares.filter(square => square !== under));
                return;
            }
        }
        const next = placeSquare(puzzle, squares, current.square);
        if (next) commit(next);
    };

    const undo = () => {
        const previous = past[past.length - 1];
        if (!previous) return;
        setPast(p => p.slice(0, -1));
        setFuture(f => [squares, ...f]);
        setSquares(previous);
    };
    const redo = () => {
        const [next, ...rest] = future;
        if (!next) return;
        setFuture(rest);
        setPast(p => [...p, squares]);
        setSquares(next);
    };
    const reset = () => {
        if (puzzle) commit(initialSquares(puzzle));
    };
    useUndoShortcuts(undo, redo, playing);

    useAutoValidate({
        filledKey: solved ? JSON.stringify(squares) : null,
        playing,
        hasErrors: false,
        setNotice: flow.setNotice,
        submit: () => flow.submit(async () => {
            if (!gameId.current) return {ok: false, message: "Lance une partie avant de valider."};
            try {
                const result = await paturagesService.validate(gameId.current, squares.map(({row, col, side}) => ({row, col, side})));
                gameId.current = null;
                clearSavedGame(challenge.saveKey);
                return {ok: true, result};
            } catch (err) {
                return {ok: false, message: (err as Error).message || "La validation a échoué, réessaie."};
            }
        }),
    });

    const canUndo = playing && past.length > 0;
    const canRedo = playing && future.length > 0;
    const canReset = playing && puzzle !== null && squares.length > puzzle.given.length;
    // Pendant un tracé, les carrés recouverts sont estompés
    const previewValid = drag && puzzle
        ? !puzzle.given.some(g => overlaps(g, drag.square)) && cowsIn(drag.square, puzzle.cows, puzzle.size) === 1
        : false;

    const rules = (
        <ul>
            <li>Découpe tout le pré en carrés, sans laisser de trou</li>
            <li>Chaque carré contient exactement une vache</li>
            <li>Les carrés peuvent être de tailles différentes</li>
            <li>Les carrés ne se chevauchent pas</li>
        </ul>
    );

    return (
        <div className="puzzle-layout paturages">
            <GameToolbar gameName="Pâturages" label={challenge.toolbarLabel} clock={flow.clock} canUndo={canUndo} canRedo={canRedo} onUndo={undo} onRedo={redo} rules={rules}/>

            <div className="options">
                <h2 className="title">Pâturages</h2>
                <p className="paturages-progress">
                    {puzzle ? <><strong>{settled}</strong> / {puzzle.cows.length} vaches installées</> : "–"}
                </p>
                <p className="digit-hint">Glisse d'un coin à l'autre pour tracer un carré.</p>
                <p className="digit-hint">Clique sur un carré pour l'enlever, ou sur une case vide pour poser un carré d'une case.</p>
            </div>

            <div className="game">
                {challenge.banner}
                <h1 className="title">Pâturages</h1>
                {challenge.loading && <Loader size="small" label="Chargement du défi…"/>}
                {puzzle && (
                    <svg ref={board} className="paturages-board" viewBox={`0 0 ${puzzle.size} ${puzzle.size}`}
                         role="application" aria-label="Pré : glisse pour tracer un carré autour de chaque vache"
                         onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={endDrag} onPointerCancel={endDrag}>
                        {Array.from({length: puzzle.size + 1}, (_, i) => (
                            <g key={i} className="paturages-grid">
                                <line x1={i} y1={0} x2={i} y2={puzzle.size}/>
                                <line x1={0} y1={i} x2={puzzle.size} y2={i}/>
                            </g>
                        ))}

                        {squares.map(square => {
                            const wrong = cowsIn(square, puzzle.cows, puzzle.size) !== 1;
                            const covered = drag?.moved && overlaps(square, drag.square) && !isGiven(puzzle, square);
                            return (
                                <rect key={`${square.row}-${square.col}-${square.side}`} x={square.col + 0.03} y={square.row + 0.03}
                                      width={square.side - 0.06} height={square.side - 0.06} rx={0.1}
                                      fill={wrong ? "var(--board-error-bg)" : regionColor(square.color)}
                                      className={`paturages-square ${wrong ? "wrong" : ""} ${isGiven(puzzle, square) ? "given" : ""} ${covered ? "covered" : ""}`}/>
                            );
                        })}

                        {puzzle.cows.map(cell => <Cow key={cell} row={Math.floor(cell / puzzle.size)} col={cell % puzzle.size}/>)}

                        {drag?.moved && (
                            <rect x={drag.square.col + 0.03} y={drag.square.row + 0.03} width={drag.square.side - 0.06} height={drag.square.side - 0.06} rx={0.1}
                                  className={`paturages-preview ${previewValid ? "valid" : "invalid"}`}/>
                        )}
                        <LessonSpots size={puzzle.size} lit={coach.lit}/>
                    </svg>
                )}
                {coach.bubble}
                {flow.validating && <SkeletonLabel label="Vérification…"/>}
            </div>

            <div className="actions">
                <h2 className="title">Actions</h2>
                <GameTimer clock={flow.clock}/>
                <HistoryButtons canUndo={canUndo} canRedo={canRedo} onUndo={undo} onRedo={redo}
                                onReset={reset} canReset={canReset}/>
                <GameNotice message={challenge.error ?? flow.notice} onClose={flow.clearNotice}/>
                <div className="rules">
                    <h3>Règles</h3>
                    {rules}
                    <p className="rules-keys">Clavier : Ctrl+Z pour annuler, Ctrl+Y pour rétablir</p>
                </div>
            </div>

            <WordSettingsPopup open={flow.showSettings && !challenge.challenge} load={paturagesService.getSettings} onGenerate={handleGenerate}
                               resume={resumable ? {elapsedMs: resumable.elapsedMs, onResume: handleResume} : undefined}
                               sizeLegend="Taille du pré" sizeLabel={s => `${s}×${s}`}
                               amountLabel="Carrés donnés" easierWhenHigher/>

            {challenge.donePopup}

            {challenge.levelVictory(flow.victory)}

            {flow.victory && level === undefined && (
                <SuccessPopup gameName="Pâturages" gameCode={CODE} xpAwarded={flow.victory.xpAwarded}
                              creditsAwarded={flow.victory.creditsAwarded} rewardMultiplier={flow.victory.rewardMultiplier}
                              before={flow.victory.before} durationMs={flow.victory.durationMs}
                              personalBest={flow.victory.personalBest} daily={flow.victory.daily}
                              streak={flow.victory.streak} {...challenge.victory(flow.newGame)}/>
            )}
        </div>
    );
}
