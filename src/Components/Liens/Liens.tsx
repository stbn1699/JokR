/**
 * Liens : relier chaque paire de lettres par une ligne continue, sans croisement, en remplissant toute la grille.
 * On glisse depuis une lettre (ou depuis une ligne pour la reprendre) ; passer sur une autre ligne la coupe.
 * Toutes les paires reliées et grille pleine : validé automatiquement par le serveur.
 */

import {type CSSProperties, type PointerEvent, useEffect, useMemo, useRef, useState} from "react";
import "../PuzzleUI/PuzzleLayout.scss";
import "./Liens.scss";
import {SuccessPopup} from "../SuccessPopup/SuccessPopup.tsx";
import GameNotice from "../PuzzleUI/GameNotice.tsx";
import Loader from "../Loader/Loader.tsx";
import {type GridChallengeProps, useGridChallenge} from "../PuzzleUI/useGridChallenge.tsx";
import GameTimer from "../PuzzleUI/GameTimer.tsx";
import GameToolbar from "../PuzzleUI/GameToolbar.tsx";
import HistoryButtons from "../PuzzleUI/HistoryButtons.tsx";
import {SkeletonLabel} from "../PuzzleUI/GridSkeleton.tsx";
import {clearSavedGame, saveGame, useResumableGame} from "../PuzzleUI/savedGame.ts";
import {useAutoValidate} from "../PuzzleUI/useAutoValidate.ts";
import {useGameFlow} from "../PuzzleUI/useGameFlow.ts";
import {useUndoShortcuts} from "../PuzzleUI/useMoveHistory.ts";
import WordSettingsPopup from "../WordGames/WordSettingsPopup.tsx";
import {liensService} from "../../Services/liens.service.ts";
import type {LiensPuzzle} from "../../Models/liens.model.ts";
import {drawTo, type Drawing, filledCells, isLinked, isSolved, overlayDrawing, startDrawing} from "./liensRules.ts";

const CODE = "LIENS";
// Une couleur franche par paire (jusqu'à 20), en plus de la lettre
const COLORS = ["#ef4444", "#3b82f6", "#22c55e", "#eab308", "#f97316", "#a855f7", "#06b6d4", "#ec4899", "#84cc16", "#14b8a6",
    "#b45309", "#6366f1", "#d946ef", "#0f766e", "#0ea5e9", "#be123c", "#64748b", "#65a30d", "#7c3aed", "#c2410c"];

type Saved = { gameId: string; paths: number[][] };

export default function Liens({daily = false, replayDate}: GridChallengeProps = {}) {
    const flow = useGameFlow(CODE, daily || replayDate !== undefined);
    const challenge = useGridChallenge<Saved, LiensPuzzle>({
        code: CODE, gameName: "Liens", daily, replayDate,
        fetchStatus: liensService.getGame,
        emptySave: gameId => ({gameId, paths: []}),
        onLoad: (grid, saved, elapsedMs) => {
            restore(grid, saved);
            flow.resume(elapsedMs);
        },
    });
    const {resumable, dismissResumable} = useResumableGame<Saved, LiensPuzzle>(challenge.saveKey, liensService.getGame, !challenge.challenge);
    const [puzzle, setPuzzle] = useState<LiensPuzzle | null>(null);
    const [paths, setPaths] = useState<number[][]>([]);
    const [past, setPast] = useState<number[][][]>([]);
    const [future, setFuture] = useState<number[][][]>([]);
    const [drawing, setDrawing] = useState<Drawing | null>(null);
    const drawingRef = useRef<Drawing | null>(null);
    const board = useRef<SVGSVGElement>(null);
    const gameId = useRef<string | null>(null);

    const playing = puzzle !== null && !flow.showSettings && !flow.victory;
    const shown = useMemo(() => overlayDrawing(paths, drawing), [paths, drawing]);
    const linked = puzzle ? shown.filter((path, pair) => isLinked(puzzle, pair, path)).length : 0;
    const totalCells = puzzle ? puzzle.size * puzzle.size : 0;
    const emptyCells = totalCells - filledCells(shown);
    const solved = puzzle !== null && drawing === null && isSolved(puzzle, paths);

    useEffect(() => {
        if (gameId.current && paths.length > 0) saveGame<Saved>(challenge.saveKey, {gameId: gameId.current, paths});
    }, [paths, challenge.saveKey]);

    const start = (next: LiensPuzzle, id: string, initial: number[][]) => {
        gameId.current = id;
        setPuzzle(next);
        setPaths(initial);
        setPast([]);
        setFuture([]);
        drawingRef.current = null;
        setDrawing(null);
    };

    const handleGenerate = (size: number, pairs: number) => {
        dismissResumable();
        void flow.generate(async () => {
            try {
                const {gameId: id, puzzle: next} = await liensService.generate(size, pairs);
                start(next, id, next.pairs.map(() => []));
                return null;
            } catch (err) {
                return (err as Error).message || "Impossible de lancer la partie.";
            }
        });
    };

    // Partie sauvegardée (reprise ou défi) : grille de départ et saisies du joueur
    const restore = (grid: LiensPuzzle, saved: Saved) => {
        start(grid, saved.gameId, saved.paths?.length === grid.pairs.length ? saved.paths : grid.pairs.map(() => []));
    };

    const handleResume = () => {
        if (!resumable) return;
        restore(resumable.grid, resumable.saved);
        flow.resume(resumable.elapsedMs + Date.now() - resumable.checkedAt);
        dismissResumable();
    };

    const cellAt = (e: PointerEvent<SVGSVGElement>) => {
        const rect = board.current?.getBoundingClientRect();
        if (!rect || !puzzle) return null;
        const col = Math.floor((e.clientX - rect.left) / rect.width * puzzle.size);
        const row = Math.floor((e.clientY - rect.top) / rect.height * puzzle.size);
        if (row < 0 || col < 0 || row >= puzzle.size || col >= puzzle.size) return null;
        return row * puzzle.size + col;
    };

    const onPointerDown = (e: PointerEvent<SVGSVGElement>) => {
        if (!playing || e.button !== 0) return;
        const cell = cellAt(e);
        if (cell === null) return;
        const next = startDrawing(puzzle, paths, cell);
        if (!next) return;
        e.currentTarget.setPointerCapture(e.pointerId);
        drawingRef.current = next;
        setDrawing(next);
    };

    const onPointerMove = (e: PointerEvent<SVGSVGElement>) => {
        const current = drawingRef.current;
        if (!current || !puzzle) return;
        const cell = cellAt(e);
        if (cell === null) return;
        const next = drawTo(puzzle, current, cell);
        if (next !== current) {
            drawingRef.current = next;
            setDrawing(next);
        }
    };

    const endDrawing = () => {
        const current = drawingRef.current;
        if (!current) return;
        drawingRef.current = null;
        setDrawing(null);
        // Une lettre seule n'est pas une ligne
        const finished = overlayDrawing(paths, current.path.length > 1 ? current : {pair: current.pair, path: []});
        if (JSON.stringify(finished) === JSON.stringify(paths)) return;
        setPast(p => [...p, paths]);
        setFuture([]);
        setPaths(finished);
    };

    const undo = () => {
        const previous = past[past.length - 1];
        if (!previous) return;
        setPast(p => p.slice(0, -1));
        setFuture(f => [paths, ...f]);
        setPaths(previous);
    };
    const redo = () => {
        const [next, ...rest] = future;
        if (!next) return;
        setFuture(rest);
        setPast(p => [...p, paths]);
        setPaths(next);
    };
    const reset = () => {
        if (!puzzle) return;
        setPast(p => [...p, paths]);
        setFuture([]);
        setPaths(puzzle.pairs.map(() => []));
    };
    useUndoShortcuts(undo, redo, playing);

    useAutoValidate({
        filledKey: solved ? JSON.stringify(paths) : null,
        playing,
        hasErrors: false,
        setNotice: flow.setNotice,
        submit: () => flow.submit(async () => {
            if (!gameId.current) return {ok: false, message: "Lance une partie avant de valider."};
            try {
                const result = await liensService.validate(gameId.current, paths);
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
    const hasInput = paths.some(path => path.length > 0);
    const point = (cell: number, size: number) => `${cell % size + 0.5},${Math.floor(cell / size) + 0.5}`;

    const rules = (
        <ul>
            <li>Relie chaque lettre à sa jumelle par une ligne continue</li>
            <li>Les lignes avancent de case en case, sans diagonale</li>
            <li>Deux lignes ne se croisent jamais et ne passent pas sur la même case</li>
            <li>Toutes les cases de la grille doivent être remplies</li>
        </ul>
    );

    return (
        <div className="puzzle-layout liens">
            <GameToolbar gameName="Liens" label={challenge.toolbarLabel} clock={flow.clock} canUndo={canUndo} canRedo={canRedo} onUndo={undo} onRedo={redo} rules={rules}/>

            <div className="options">
                <h2 className="title">Liens</h2>
                <p className="liens-progress">
                    {puzzle ? <><strong>{linked}</strong> / {puzzle.pairs.length} paires reliées</> : "–"}
                </p>
                {puzzle && (
                    <p className="liens-progress">
                        <strong>{totalCells - emptyCells}</strong> / {totalCells} cases remplies
                    </p>
                )}
                <p className="digit-hint">
                    Glisse depuis une lettre jusqu'à sa jumelle. Reviens sur ta ligne pour l'effacer, ou repars d'un point de la ligne pour la modifier.
                </p>
                <p className="digit-hint">Passer sur une autre ligne la coupe à cet endroit.</p>
            </div>

            <div className="game">
                {challenge.banner}
                <h1 className="title">Liens</h1>
                {challenge.loading && <Loader size="small" label="Chargement du défi…"/>}
                {puzzle && (
                    <svg ref={board} className={`liens-board ${drawing ? "drawing" : ""}`} viewBox={`0 0 ${puzzle.size} ${puzzle.size}`}
                         role="application" aria-label="Plateau : glisse d'une lettre à sa jumelle"
                         onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={endDrawing} onPointerCancel={endDrawing}>
                        {Array.from({length: puzzle.size + 1}, (_, i) => (
                            <g key={i} className="liens-grid">
                                <line x1={i} y1={0} x2={i} y2={puzzle.size}/>
                                <line x1={0} y1={i} x2={puzzle.size} y2={i}/>
                            </g>
                        ))}

                        {shown.map((path, pair) => path.length > 0 && (
                            <g key={pair} style={{"--pair": COLORS[pair % COLORS.length]} as CSSProperties}
                               className={isLinked(puzzle, pair, path) ? "linked" : ""}>
                                {path.map(cell => (
                                    <rect key={cell} x={cell % puzzle.size} y={Math.floor(cell / puzzle.size)} width={1} height={1} className="liens-trail"/>
                                ))}
                                {path.length > 1 && <polyline points={path.map(cell => point(cell, puzzle.size)).join(" ")} className="liens-line"/>}
                            </g>
                        ))}

                        {puzzle.pairs.flatMap(([a, b], pair) => [a, b].map(cell => (
                            <g key={cell} className="liens-dot" style={{"--pair": COLORS[pair % COLORS.length]} as CSSProperties}
                               transform={`translate(${cell % puzzle.size + 0.5} ${Math.floor(cell / puzzle.size) + 0.5})`}>
                                <circle r={0.38}/>
                                <text>{String.fromCharCode(65 + pair)}</text>
                            </g>
                        )))}
                    </svg>
                )}
                {flow.validating && <SkeletonLabel label="Vérification…"/>}
            </div>

            <div className="actions">
                <h2 className="title">Actions</h2>
                <GameTimer clock={flow.clock}/>
                <HistoryButtons canUndo={canUndo} canRedo={canRedo} onUndo={undo} onRedo={redo}
                                onReset={reset} canReset={playing && hasInput}/>
                <GameNotice message={challenge.error ?? flow.notice} onClose={flow.clearNotice}/>
                <div className="rules">
                    <h3>Règles</h3>
                    {rules}
                    <p className="rules-keys">Clavier : Ctrl+Z pour annuler, Ctrl+Y pour rétablir</p>
                </div>
            </div>

            <WordSettingsPopup open={flow.showSettings && !challenge.challenge} load={liensService.getSettings} onGenerate={handleGenerate}
                               resume={resumable ? {elapsedMs: resumable.elapsedMs, onResume: handleResume} : undefined}
                               sizeLegend="Taille de la grille" sizeLabel={s => `${s}×${s}`}
                               amountLabel="Paires à relier"/>

            {challenge.donePopup}

            {flow.victory && (
                <SuccessPopup gameName="Liens" gameCode={CODE} xpAwarded={flow.victory.xpAwarded}
                              creditsAwarded={flow.victory.creditsAwarded} rewardMultiplier={flow.victory.rewardMultiplier}
                              before={flow.victory.before} durationMs={flow.victory.durationMs}
                              personalBest={flow.victory.personalBest} daily={flow.victory.daily}
                              streak={flow.victory.streak} {...challenge.victory(flow.newGame)}/>
            )}
        </div>
    );
}
