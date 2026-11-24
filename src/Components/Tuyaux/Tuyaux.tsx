/**
 * Tuyaux : tourner les pièces pour que tous les tuyaux forment un seul réseau, sans boucle ni sortie ouverte.
 * Clic : quart de tour à droite. Clic droit : à gauche. Maj + clic : bloque la pièce pour ne plus la tourner par erreur.
 * Réseau complet : validé automatiquement par le serveur.
 */

import {type CSSProperties, type MouseEvent, useEffect, useMemo, useRef, useState} from "react";
import "../PuzzleUI/PuzzleLayout.scss";
import "./Tuyaux.scss";
import {SuccessPopup} from "../SuccessPopup/SuccessPopup.tsx";
import ErrorsToggle from "../PuzzleUI/ErrorsToggle.tsx";
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
import {useShowErrors} from "../PuzzleUI/useShowErrors.ts";
import WordSettingsPopup from "../WordGames/WordSettingsPopup.tsx";
import {tuyauxService} from "../../Services/tuyaux.service.ts";
import type {TuyauxPuzzle} from "../../Models/tuyaux.model.ts";
import {DIRECTIONS, isSolved, nextFills, openEnds, rotateTile, type WaterFill, type WaterStep, waterFlow} from "./tuyauxRules.ts";

const CODE = "TUYAUX";
const ARROWS: Record<string, [number, number]> = {ArrowUp: [-1, 0], ArrowDown: [1, 0], ArrowLeft: [0, -1], ArrowRight: [0, 1]};
// Extrémité de chaque sortie, depuis le centre de la case
const ENDS: Record<number, [number, number]> = {1: [0, -0.5], 2: [0.5, 0], 4: [0, 0.5], 8: [-0.5, 0]};

type Saved = { gameId: string; turns: number[]; pins?: number[] };
const normalize = (turn: number) => ((turn % 4) + 4) % 4;

// Dessin d'une pièce, centré sur 0,0 : le contour sombre, puis le tuyau par-dessus
function Pipe({mask}: { mask: number }) {
    const exits = DIRECTIONS.filter(bit => mask & bit);
    const lines = (className: string) => exits.map(bit => (
        <line key={`${className}-${bit}`} x1={0} y1={0} x2={ENDS[bit]![0]} y2={ENDS[bit]![1]} className={className}/>
    ));
    return (
        <>
            {lines("tuyaux-outline")}
            <circle r={0.19} className="tuyaux-joint-outline"/>
            {lines("tuyaux-water")}
            <circle r={0.13} className="tuyaux-joint"/>
            {/* bout d'un tuyau : un réservoir rond */}
            {exits.length === 1 && <circle r={0.22} className="tuyaux-end"/>}
        </>
    );
}

// L'eau dans une pièce : elle arrive par `inlet` jusqu'au centre, puis repart vers les autres sorties
function Water({mask, inlet, fill}: { mask: number; inlet: number; fill: WaterFill }) {
    const exits = DIRECTIONS.filter(bit => mask & bit);
    const style = {"--fill-delay": `${fill.delay ?? 0}ms`, "--fill-step": `${fill.step}ms`} as CSSProperties;
    return (
        <g className={`tuyaux-fill ${fill.delay === null ? "instant" : ""}`} style={style}>
            {exits.map(bit => {
                const [x, y] = ENDS[bit]!;
                return bit === inlet
                    ? <line key={bit} x1={x} y1={y} x2={0} y2={0} pathLength={1} className="fill-in"/>
                    : <line key={bit} x1={0} y1={0} x2={x} y2={y} pathLength={1} className="fill-out"/>;
            })}
            <circle r={0.13} className="fill-joint"/>
            {exits.length === 1 && <circle r={0.185} className="fill-end"/>}
        </g>
    );
}

export default function Tuyaux({daily = false, replayDate}: GridChallengeProps = {}) {
    const flow = useGameFlow(CODE, daily || replayDate !== undefined);
    const challenge = useGridChallenge<Saved, TuyauxPuzzle>({
        code: CODE, gameName: "Tuyaux", daily, replayDate,
        fetchStatus: tuyauxService.getGame,
        emptySave: gameId => ({gameId, turns: []}),
        onLoad: (grid, saved, elapsedMs) => {
            restore(grid, saved);
            flow.resume(elapsedMs);
        },
    });
    const {resumable, dismissResumable} = useResumableGame<Saved, TuyauxPuzzle>(challenge.saveKey, tuyauxService.getGame, !challenge.challenge);
    const [puzzle, setPuzzle] = useState<TuyauxPuzzle | null>(null);
    // Quarts de tour cumulés : la pièce tourne toujours dans le bon sens à l'écran
    const [turns, setTurns] = useState<number[]>([]);
    const [past, setPast] = useState<number[][]>([]);
    const [future, setFuture] = useState<number[][]>([]);
    const [pins, setPins] = useState<Set<number>>(new Set());
    const [cursor, setCursor] = useState<number | null>(null);
    // Le carré de sélection n'apparaît qu'au clavier (flèches) et disparaît au premier clic
    const [cursorShown, setCursorShown] = useState(false);
    const [showErrors, setShowErrors] = useShowErrors();
    const gameId = useRef<string | null>(null);

    const playing = puzzle !== null && !flow.showSettings && !flow.victory;
    const lockedCells = useMemo(() => new Set(puzzle?.locked ?? []), [puzzle]);
    const masks = useMemo(() => puzzle?.tiles.map((tile, i) => rotateTile(tile, turns[i] ?? 0)) ?? [], [puzzle, turns]);
    const source = puzzle ? Math.floor(puzzle.size / 2) * puzzle.size + Math.floor(puzzle.size / 2) : 0;
    const waterPath = useMemo(() => (puzzle ? waterFlow(masks, puzzle.size, source) : new Map<number, WaterStep>()), [puzzle, masks, source]);

    // Cases remplies : seules celles qui viennent d'être reliées s'animent (rien à l'ouverture d'une partie)
    const [water, setWater] = useState<{ path: Map<number, WaterStep> | null; puzzle: TuyauxPuzzle | null; fills: Map<number, WaterFill> }>(
        {path: null, puzzle: null, fills: new Map()},
    );
    if (water.path !== waterPath) {
        const instant = water.puzzle !== puzzle;
        setWater({path: waterPath, puzzle, fills: nextFills(instant ? new Map() : water.fills, waterPath, instant)});
    }
    const open = useMemo(() => (puzzle ? openEnds(masks, puzzle.size) : new Set<number>()), [puzzle, masks]);
    const solved = puzzle !== null && isSolved(masks, puzzle.size);

    useEffect(() => {
        if (gameId.current && turns.length > 0) saveGame<Saved>(challenge.saveKey, {gameId: gameId.current, turns, pins: [...pins]});
    }, [turns, pins, challenge.saveKey]);

    const start = (next: TuyauxPuzzle, id: string, initial: number[], pinned: number[] = []) => {
        gameId.current = id;
        setPuzzle(next);
        setTurns(initial);
        setPast([]);
        setFuture([]);
        setPins(new Set(pinned));
        setCursor(Math.floor(next.size / 2) * next.size + Math.floor(next.size / 2));
        setCursorShown(false);
    };

    const handleGenerate = (size: number, hints: number) => {
        dismissResumable();
        void flow.generate(async () => {
            try {
                const {gameId: id, puzzle: next} = await tuyauxService.generate(size, hints);
                start(next, id, next.tiles.map(() => 0));
                return null;
            } catch (err) {
                return (err as Error).message || "Impossible de lancer la partie.";
            }
        });
    };

    // Partie sauvegardée (reprise ou défi) : grille de départ et saisies du joueur
    const restore = (grid: TuyauxPuzzle, saved: Saved) => {
        const restored = saved.turns?.length === grid.tiles.length ? saved.turns : grid.tiles.map(() => 0);
        start(grid, saved.gameId, restored, saved.pins ?? []);
    };

    const handleResume = () => {
        if (!resumable) return;
        restore(resumable.grid, resumable.saved);
        flow.resume(resumable.elapsedMs + Date.now() - resumable.checkedAt);
        dismissResumable();
    };

    const commit = (next: number[]) => {
        setPast(p => [...p, turns]);
        setFuture([]);
        setTurns(next);
    };

    const rotate = (cell: number, direction: 1 | -1) => {
        if (!playing || lockedCells.has(cell) || pins.has(cell)) return;
        const next = [...turns];
        next[cell] = next[cell]! + direction;
        commit(next);
    };

    const togglePin = (cell: number) => {
        if (!playing || lockedCells.has(cell)) return;
        setPins(current => {
            const next = new Set(current);
            if (!next.delete(cell)) next.add(cell);
            return next;
        });
    };

    const undo = () => {
        const previous = past[past.length - 1];
        if (!previous) return;
        setPast(p => p.slice(0, -1));
        setFuture(f => [turns, ...f]);
        setTurns(previous);
    };
    const redo = () => {
        const [next, ...rest] = future;
        if (!next) return;
        setFuture(rest);
        setPast(p => [...p, turns]);
        setTurns(next);
    };
    const reset = () => {
        if (puzzle) commit(puzzle.tiles.map(() => 0));
        setPins(new Set());
    };
    useUndoShortcuts(undo, redo, playing);

    // Clavier : flèches pour se déplacer, Espace pour tourner (Maj : l'autre sens), B pour bloquer
    const keyRef = useRef<(e: KeyboardEvent) => void>(() => undefined);
    useEffect(() => {
        keyRef.current = (e: KeyboardEvent) => {
            if (!puzzle || cursor === null || e.ctrlKey || e.metaKey || e.altKey) return;
            const arrow = ARROWS[e.key];
            if (arrow) {
                e.preventDefault();
                // Première flèche : le carré apparaît sur la dernière case touchée, sans bouger
                if (!cursorShown) {
                    setCursorShown(true);
                    return;
                }
                const row = Math.floor(cursor / puzzle.size) + arrow[0];
                const col = cursor % puzzle.size + arrow[1];
                if (row >= 0 && col >= 0 && row < puzzle.size && col < puzzle.size) setCursor(row * puzzle.size + col);
            } else if (!cursorShown) {
                // Sans carré visible, Espace et B n'agissent pas sur une case qu'on ne voit pas
            } else if (e.key === " " || e.key === "Enter") {
                e.preventDefault();
                rotate(cursor, e.shiftKey ? -1 : 1);
            } else if (e.key.toLowerCase() === "b") {
                togglePin(cursor);
            }
        };
    });
    useEffect(() => {
        if (!playing) return;
        const onKeyDown = (e: KeyboardEvent) => keyRef.current(e);
        window.addEventListener("keydown", onKeyDown);
        return () => window.removeEventListener("keydown", onKeyDown);
    }, [playing]);

    useAutoValidate({
        filledKey: solved ? turns.map(normalize).join(",") : null,
        playing,
        hasErrors: false,
        setNotice: flow.setNotice,
        submit: () => flow.submit(async () => {
            if (!gameId.current || !puzzle) return {ok: false, message: "Lance une partie avant de valider."};
            try {
                const result = await tuyauxService.validate(gameId.current, turns.map(normalize));
                gameId.current = null;
                clearSavedGame(challenge.saveKey);
                return {ok: true, result};
            } catch (err) {
                return {ok: false, message: (err as Error).message || "La validation a échoué, réessaie."};
            }
        }),
    });

    const onCellClick = (e: MouseEvent, cell: number) => {
        setCursor(cell);
        setCursorShown(false);
        if (e.shiftKey) togglePin(cell);
        else rotate(cell, 1);
    };

    const canUndo = playing && past.length > 0;
    const canRedo = playing && future.length > 0;
    const hasInput = turns.some(turn => normalize(turn) !== 0) || pins.size > 0;
    const total = puzzle ? puzzle.size * puzzle.size : 0;

    const rules = (
        <ul>
            <li>Tourne les pièces pour relier tous les tuyaux en un seul réseau</li>
            <li>Aucune sortie ne doit rester ouverte, ni vers le bord ni vers une pièce fermée</li>
            <li>Le réseau ne doit former aucune boucle</li>
            <li>Les cases jaunes sont données et ne tournent pas</li>
        </ul>
    );

    return (
        <div className="puzzle-layout tuyaux">
            <GameToolbar gameName="Tuyaux" label={challenge.toolbarLabel} clock={flow.clock} canUndo={canUndo} canRedo={canRedo} onUndo={undo} onRedo={redo}
                         showErrors={showErrors} onToggleErrors={setShowErrors} errorCount={open.size} rules={rules}/>

            <div className="options">
                <h2 className="title">Tuyaux</h2>
                <p className="tuyaux-progress">
                    {puzzle ? <><strong>{waterPath.size}</strong> / {total} pièces reliées</> : "–"}
                </p>
                <p className="digit-hint">
                    Clic : tourne à droite. Clic droit : tourne à gauche. Maj + clic : bloque une pièce que tu es sûr d'avoir bien placée.
                </p>
                <p className="digit-hint">L'eau part du centre : les tuyaux bleus sont reliés à la source.</p>
            </div>

            <div className="game">
                {challenge.banner}
                <h1 className="title">Tuyaux</h1>
                {challenge.loading && <Loader size="small" label="Chargement du défi…"/>}
                {puzzle && (
                    <svg className={`tuyaux-board ${solved ? "solved" : ""}`} viewBox={`0 0 ${puzzle.size} ${puzzle.size}`}
                         role="grid" aria-label="Plateau de tuyaux" style={{"--size": puzzle.size} as CSSProperties}>
                        {puzzle.tiles.map((tile, cell) => {
                            const classes = [
                                "tuyaux-cell",
                                lockedCells.has(cell) ? "given" : "",
                                pins.has(cell) ? "pinned" : "",
                                cell === source ? "source" : "",
                                showErrors && open.has(cell) ? "open" : "",
                            ];
                            const fill = water.fills.get(cell);
                            return (
                                <g key={cell} role="gridcell" className={classes.join(" ")}
                                   transform={`translate(${cell % puzzle.size + 0.5} ${Math.floor(cell / puzzle.size) + 0.5})`}
                                   onClick={e => onCellClick(e, cell)}
                                   onContextMenu={e => {
                                       e.preventDefault();
                                       setCursor(cell);
                                       setCursorShown(false);
                                       rotate(cell, -1);
                                   }}>
                                    <rect x={-0.5} y={-0.5} width={1} height={1} className="tuyaux-tile"/>
                                    <g className="tuyaux-pipe" style={{transform: `rotate(${(turns[cell] ?? 0) * 90}deg)`}}>
                                        <Pipe mask={tile}/>
                                        {fill && <Water mask={tile} fill={fill}
                                                        inlet={fill.entry ? rotateTile(fill.entry, -(turns[cell] ?? 0)) : 0}/>}
                                    </g>
                                    {cursorShown && cell === cursor && playing && <rect x={-0.46} y={-0.46} width={0.92} height={0.92} className="tuyaux-cursor"/>}
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
                                onReset={reset} canReset={playing && hasInput}/>
                <ErrorsToggle checked={showErrors} onChange={setShowErrors} count={open.size}/>
                <GameNotice message={challenge.error ?? flow.notice} onClose={flow.clearNotice}/>
                <div className="rules">
                    <h3>Règles</h3>
                    {rules}
                    <p className="rules-keys">Clavier : flèches, <kbd>Espace</kbd> pour tourner (<kbd>Maj</kbd> : l'autre sens), <kbd>B</kbd> pour bloquer</p>
                </div>
            </div>

            <WordSettingsPopup open={flow.showSettings && !challenge.challenge} load={tuyauxService.getSettings} onGenerate={handleGenerate}
                               resume={resumable ? {elapsedMs: resumable.elapsedMs, onResume: handleResume} : undefined}
                               sizeLegend="Taille de la grille" sizeLabel={s => `${s}×${s}`}
                               amountLabel="Cases données" easierWhenHigher/>

            {challenge.donePopup}

            {flow.victory && (
                <SuccessPopup gameName="Tuyaux" gameCode={CODE} xpAwarded={flow.victory.xpAwarded}
                              creditsAwarded={flow.victory.creditsAwarded} rewardMultiplier={flow.victory.rewardMultiplier}
                              before={flow.victory.before} durationMs={flow.victory.durationMs}
                              personalBest={flow.victory.personalBest} daily={flow.victory.daily}
                              streak={flow.victory.streak} {...challenge.victory(flow.newGame)}/>
            )}
        </div>
    );
}
