/**
 * Bouchon : faire coulisser les véhicules, chacun dans son axe, pour amener le taxi jusqu'à la sortie à droite.
 * On glisse un véhicule à la souris, ou on le déplace aux flèches après l'avoir choisi avec Tab.
 * Taxi à la sortie : les coups sont rejoués et validés par le serveur.
 */

import {type CSSProperties, type KeyboardEvent, type PointerEvent, useEffect, useMemo, useRef, useState} from "react";
import "../PuzzleUI/PuzzleLayout.scss";
import "./Bouchon.scss";
import {SuccessPopup} from "../SuccessPopup/SuccessPopup.tsx";
import GameNotice from "../PuzzleUI/GameNotice.tsx";
import GameTimer from "../PuzzleUI/GameTimer.tsx";
import GameToolbar from "../PuzzleUI/GameToolbar.tsx";
import HistoryButtons from "../PuzzleUI/HistoryButtons.tsx";
import {SkeletonLabel} from "../PuzzleUI/GridSkeleton.tsx";
import {clearSavedGame, saveGame, useResumableGame} from "../PuzzleUI/savedGame.ts";
import {useAutoValidate} from "../PuzzleUI/useAutoValidate.ts";
import {useGameFlow} from "../PuzzleUI/useGameFlow.ts";
import {useUndoShortcuts} from "../PuzzleUI/useMoveHistory.ts";
import WordSettingsPopup from "../WordGames/WordSettingsPopup.tsx";
import {bouchonService} from "../../Services/bouchon.service.ts";
import type {BouchonMove, BouchonPuzzle, BouchonVehicle} from "../../Models/bouchon.model.ts";
import {countMoves, isOut, positionsAfter, slideRange} from "./bouchonRules.ts";

const CODE = "BOUCHON";
// Place à droite du plateau pour dessiner la sortie
const EXIT_WIDTH = 0.5;
const TAXI = "#facc15";
const COLORS = ["#3b82f6", "#22c55e", "#a855f7", "#ec4899", "#14b8a6", "#f97316", "#64748b", "#ef4444", "#6366f1", "#84cc16", "#0ea5e9", "#d946ef"];

type Saved = { gameId: string; moves: BouchonMove[] };
type Drag = { index: number; from: number; min: number; max: number; pointer: number; value: number };

// Véhicule dessiné à l'horizontale ; les verticaux sont simplement tournés
function VehicleShape({vehicle, taxi}: { vehicle: BouchonVehicle; taxi: boolean }) {
    const {length} = vehicle;
    const truck = length === 3;
    return (
        <g transform={vehicle.horizontal ? undefined : "translate(1 0) rotate(90)"}>
            <rect className="bouchon-body" x={0.07} y={0.11} width={length - 0.14} height={0.78} rx={0.2}/>
            {truck ? (
                <>
                    <rect className="bouchon-cargo" x={0.2} y={0.2} width={1.85} height={0.6} rx={0.07}/>
                    <rect className="bouchon-glass" x={2.4} y={0.24} width={0.2} height={0.52} rx={0.06}/>
                </>
            ) : (
                <>
                    <rect className="bouchon-glass" x={1.32} y={0.22} width={0.26} height={0.56} rx={0.08}/>
                    <rect className="bouchon-glass" x={0.3} y={0.26} width={0.17} height={0.48} rx={0.06}/>
                    {taxi && (
                        <g className="bouchon-checker">
                            {[0, 1, 2, 3].map(i => <rect key={i} x={0.66 + i * 0.12} y={i % 2 ? 0.5 : 0.38} width={0.12} height={0.12}/>)}
                        </g>
                    )}
                </>
            )}
        </g>
    );
}

export default function Bouchon() {
    const flow = useGameFlow(CODE);
    const {resumable, dismissResumable} = useResumableGame<Saved, BouchonPuzzle>(CODE, bouchonService.getGame);
    const [puzzle, setPuzzle] = useState<BouchonPuzzle | null>(null);
    const [moves, setMoves] = useState<BouchonMove[]>([]);
    const [future, setFuture] = useState<BouchonMove[]>([]);
    const [drag, setDrag] = useState<Drag | null>(null);
    const [keyboardVehicle, setKeyboardVehicle] = useState<number | null>(null);
    const dragRef = useRef<Drag | null>(null);
    const board = useRef<SVGSVGElement>(null);
    const gameId = useRef<string | null>(null);

    const playing = puzzle !== null && !flow.showSettings && !flow.victory;
    const positions = useMemo(() => (puzzle ? positionsAfter(puzzle, moves) : []), [puzzle, moves]);
    const solved = puzzle !== null && drag === null && isOut(puzzle, positions);

    useEffect(() => {
        if (gameId.current) saveGame<Saved>(CODE, {gameId: gameId.current, moves});
    }, [moves]);

    const start = (next: BouchonPuzzle, id: string, initial: BouchonMove[]) => {
        gameId.current = id;
        setPuzzle(next);
        setMoves(initial);
        setFuture([]);
        dragRef.current = null;
        setDrag(null);
        setKeyboardVehicle(null);
    };

    const handleGenerate = (size: number, minMoves: number) => {
        dismissResumable();
        void flow.generate(async () => {
            try {
                const {gameId: id, puzzle: next} = await bouchonService.generate(size, minMoves);
                start(next, id, []);
                return null;
            } catch (err) {
                return (err as Error).message || "Impossible de lancer la partie.";
            }
        });
    };

    const handleResume = () => {
        if (!resumable) return;
        const {grid, saved} = resumable;
        start(grid, saved.gameId, Array.isArray(saved.moves) ? saved.moves : []);
        flow.resume(resumable.elapsedMs + Date.now() - resumable.checkedAt);
        dismissResumable();
    };

    const play = (index: number, to: number) => {
        setMoves(m => [...m, [index, to]]);
        setFuture([]);
    };

    // Position de la souris sur l'axe du véhicule, en cases
    const pointerAlong = (e: PointerEvent, vehicle: BouchonVehicle) => {
        const rect = board.current!.getBoundingClientRect();
        return vehicle.horizontal
            ? (e.clientX - rect.left) / rect.width * (puzzle!.size + EXIT_WIDTH)
            : (e.clientY - rect.top) / rect.height * puzzle!.size;
    };

    const onVehicleDown = (e: PointerEvent<SVGGElement>, index: number) => {
        if (!playing || e.button !== 0) return;
        setKeyboardVehicle(null);
        const [min, max] = slideRange(puzzle, positions, index);
        const from = positions[index]!;
        board.current?.setPointerCapture(e.pointerId);
        const next = {index, from, min, max, pointer: pointerAlong(e, puzzle.vehicles[index]!), value: from};
        dragRef.current = next;
        setDrag(next);
    };

    const onPointerMove = (e: PointerEvent<SVGSVGElement>) => {
        const current = dragRef.current;
        if (!current || !puzzle) return;
        const delta = pointerAlong(e, puzzle.vehicles[current.index]!) - current.pointer;
        const next = {...current, value: Math.min(current.max, Math.max(current.min, current.from + delta))};
        dragRef.current = next;
        setDrag(next);
    };

    const endDrag = () => {
        const current = dragRef.current;
        if (!current) return;
        dragRef.current = null;
        setDrag(null);
        const to = Math.round(current.value);
        if (to !== current.from) play(current.index, to);
    };

    const onVehicleKey = (e: KeyboardEvent<SVGGElement>, index: number) => {
        if (!playing || !e.key.startsWith("Arrow")) return;
        e.preventDefault();
        setKeyboardVehicle(index);
        const vehicle = puzzle.vehicles[index]!;
        const step = vehicle.horizontal
            ? (e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0)
            : (e.key === "ArrowDown" ? 1 : e.key === "ArrowUp" ? -1 : 0);
        if (step === 0) return;
        const [min, max] = slideRange(puzzle, positions, index);
        const to = positions[index]! + step;
        if (to >= min && to <= max) play(index, to);
    };

    const undo = () => {
        const last = moves[moves.length - 1];
        if (!last) return;
        setMoves(m => m.slice(0, -1));
        setFuture(f => [last, ...f]);
    };
    const redo = () => {
        const [next, ...rest] = future;
        if (!next) return;
        setFuture(rest);
        setMoves(m => [...m, next]);
    };
    const reset = () => {
        setMoves([]);
        setFuture([]);
    };
    useUndoShortcuts(undo, redo, playing);

    useAutoValidate({
        filledKey: solved ? JSON.stringify(moves) : null,
        playing,
        hasErrors: false,
        setNotice: flow.setNotice,
        submit: () => flow.submit(async () => {
            if (!gameId.current) return {ok: false, message: "Lance une partie avant de valider."};
            try {
                const result = await bouchonService.validate(gameId.current, moves);
                gameId.current = null;
                clearSavedGame(CODE);
                return {ok: true, result};
            } catch (err) {
                return {ok: false, message: (err as Error).message || "La validation a échoué, réessaie."};
            }
        }),
    });

    const canUndo = playing && moves.length > 0;
    const canRedo = playing && future.length > 0;

    const rules = (
        <ul>
            <li>Amène le taxi jaune jusqu'à la sortie, à droite</li>
            <li>Chaque véhicule avance ou recule dans son axe, sans tourner</li>
            <li>Les véhicules ne se traversent pas</li>
            <li>Déplacer plusieurs fois de suite le même véhicule compte pour un seul coup</li>
        </ul>
    );

    return (
        <div className="puzzle-layout bouchon">
            <GameToolbar gameName="Bouchon" clock={flow.clock} canUndo={canUndo} canRedo={canRedo} onUndo={undo} onRedo={redo} rules={rules}/>

            <div className="options">
                <h2 className="title">Bouchon</h2>
                <p className="bouchon-progress">
                    {puzzle ? <><strong>{countMoves(moves)}</strong> coup{countMoves(moves) > 1 ? "s" : ""}</> : "–"}
                </p>
                {puzzle && <p className="bouchon-best">Solution la plus courte : {puzzle.minMoves} coups</p>}
                <p className="digit-hint">Glisse un véhicule pour le déplacer et libère le passage du taxi.</p>
            </div>

            <div className="game">
                <h1 className="title">Bouchon</h1>
                {puzzle && (
                    <svg ref={board} className={`bouchon-board ${drag ? "dragging" : ""}`}
                         viewBox={`0 0 ${puzzle.size + EXIT_WIDTH} ${puzzle.size}`}
                         role="application" aria-label="Parking : glisse les véhicules pour libérer le taxi"
                         onPointerMove={onPointerMove} onPointerUp={endDrag} onPointerCancel={endDrag}>
                        <rect className="bouchon-floor" width={puzzle.size} height={puzzle.size}/>
                        {Array.from({length: puzzle.size + 1}, (_, i) => (
                            <g key={i} className="bouchon-grid">
                                <line x1={i} y1={0} x2={i} y2={puzzle.size}/>
                                <line x1={0} y1={i} x2={puzzle.size} y2={i}/>
                            </g>
                        ))}
                        <rect className="bouchon-exit" x={puzzle.size} y={puzzle.exitRow} width={EXIT_WIDTH} height={1}/>
                        <path className="bouchon-arrow" transform={`translate(${puzzle.size + 0.13} ${puzzle.exitRow + 0.5})`} d="M0 -0.15 L0.2 0 L0 0.15"/>

                        {puzzle.vehicles.map((vehicle, index) => {
                            const along = drag?.index === index ? drag.value : positions[index]!;
                            // Le taxi quitte le parking une fois la sortie atteinte
                            const shown = index === 0 && solved ? puzzle.size + 1 : along;
                            const x = vehicle.horizontal ? shown : vehicle.col;
                            const y = vehicle.horizontal ? vehicle.row : shown;
                            return (
                                <g key={index} tabIndex={playing ? 0 : -1} role="button"
                                   aria-label={index === 0 ? "Taxi" : `Véhicule ${index}`}
                                   className={`bouchon-vehicle ${vehicle.horizontal ? "horizontal" : "vertical"} ${drag?.index === index ? "held" : ""} ${keyboardVehicle === index ? "keyboard" : ""}`}
                                   style={{transform: `translate(${x}px, ${y}px)`, "--car": index === 0 ? TAXI : COLORS[(index - 1) % COLORS.length]} as CSSProperties}
                                   onPointerDown={e => onVehicleDown(e, index)} onKeyDown={e => onVehicleKey(e, index)}
                                   onBlur={() => setKeyboardVehicle(null)}>
                                    <VehicleShape vehicle={vehicle} taxi={index === 0}/>
                                </g>
                            );
                        })}
                    </svg>
                )}
                {flow.validating && <SkeletonLabel label="Vérification…"/>}
            </div>

            <div className="actions">
                <h2 className="title">Actions</h2>
                <GameTimer clock={flow.clock}/>
                <HistoryButtons canUndo={canUndo} canRedo={canRedo} onUndo={undo} onRedo={redo}
                                onReset={reset} canReset={playing && moves.length > 0}/>
                <GameNotice message={flow.notice} onClose={flow.clearNotice}/>
                <div className="rules">
                    <h3>Règles</h3>
                    {rules}
                    <p className="rules-keys">Clavier : Tab pour choisir un véhicule, flèches pour le déplacer, Ctrl+Z pour annuler, Ctrl+Y pour rétablir</p>
                </div>
            </div>

            <WordSettingsPopup open={flow.showSettings} load={bouchonService.getSettings} onGenerate={handleGenerate}
                               resume={resumable ? {elapsedMs: resumable.elapsedMs, onResume: handleResume} : undefined}
                               sizeLegend="Taille du parking" sizeLabel={s => `${s}×${s}`}
                               amountLabel="Coups minimum"/>

            {flow.victory && (
                <SuccessPopup gameName="Bouchon" gameCode={CODE} xpAwarded={flow.victory.xpAwarded}
                              creditsAwarded={flow.victory.creditsAwarded} rewardMultiplier={flow.victory.rewardMultiplier}
                              before={flow.victory.before} durationMs={flow.victory.durationMs}
                              personalBest={flow.victory.personalBest} daily={flow.victory.daily}
                              onNewGame={flow.newGame} back="home"/>
            )}
        </div>
    );
}
