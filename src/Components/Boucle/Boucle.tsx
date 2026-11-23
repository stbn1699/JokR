/**
 * Boucle : tracer une seule boucle fermée qui passe par toutes les cases, sans traverser de mur.
 * On glisse pour dessiner, par morceaux si on veut ; glisser sur un trait existant l'efface.
 * Boucle complète : validée automatiquement par le serveur.
 */

import {type PointerEvent, useEffect, useMemo, useRef, useState} from "react";
import "../PuzzleUI/PuzzleLayout.scss";
import "./Boucle.scss";
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
import {boucleService} from "../../Services/boucle.service.ts";
import type {BouclePuzzle} from "../../Models/boucle.model.ts";
import {cleanLinks, countLoops, fullCells, linkCells, solvedLoop, startStroke, type Stroke, strokeTo} from "./boucleRules.ts";

const CODE = "BOUCLE";

type Saved = { gameId: string; links: number[] };

const sameLinks = (a: readonly number[], b: readonly number[]) => {
    if (a.length !== b.length) return false;
    const set = new Set(a);
    return b.every(key => set.has(key));
};

export default function Boucle() {
    const flow = useGameFlow(CODE);
    const {resumable, dismissResumable} = useResumableGame<Saved, BouclePuzzle>(CODE, boucleService.getGame);
    const [puzzle, setPuzzle] = useState<BouclePuzzle | null>(null);
    const [links, setLinks] = useState<number[]>([]);
    const [past, setPast] = useState<number[][]>([]);
    const [future, setFuture] = useState<number[][]>([]);
    const [stroke, setStroke] = useState<Stroke | null>(null);
    const strokeRef = useRef<Stroke | null>(null);
    const board = useRef<SVGSVGElement>(null);
    const gameId = useRef<string | null>(null);

    const playing = puzzle !== null && !flow.showSettings && !flow.victory;
    const shown = stroke?.links ?? links;
    const size = puzzle?.size ?? 0;
    const totalCells = size * size;
    const filled = size ? fullCells(shown, size) : 0;
    const loops = size ? countLoops(shown, size) : 0;
    const loop = useMemo(() => (puzzle && !stroke ? solvedLoop(puzzle, links) : null), [puzzle, links, stroke]);

    useEffect(() => {
        if (gameId.current) saveGame<Saved>(CODE, {gameId: gameId.current, links});
    }, [links]);

    const start = (next: BouclePuzzle, id: string, initial: number[]) => {
        gameId.current = id;
        setPuzzle(next);
        setLinks(initial);
        setPast([]);
        setFuture([]);
        strokeRef.current = null;
        setStroke(null);
    };

    const handleGenerate = (nextSize: number, walls: number) => {
        dismissResumable();
        void flow.generate(async () => {
            try {
                const {gameId: id, puzzle: next} = await boucleService.generate(nextSize, walls);
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
        start(grid, saved.gameId, cleanLinks(grid, saved.links));
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
        e.currentTarget.setPointerCapture(e.pointerId);
        const next = startStroke(links, cell);
        strokeRef.current = next;
        setStroke(next);
    };

    const onPointerMove = (e: PointerEvent<SVGSVGElement>) => {
        const current = strokeRef.current;
        if (!current || !puzzle) return;
        const cell = cellAt(e);
        if (cell === null || cell === current.head) return;
        const next = strokeTo(puzzle, current, cell);
        if (next !== current) {
            strokeRef.current = next;
            setStroke(next);
        }
    };

    const endStroke = () => {
        const current = strokeRef.current;
        if (!current) return;
        strokeRef.current = null;
        setStroke(null);
        if (sameLinks(current.links, links)) return;
        setPast(p => [...p, links]);
        setFuture([]);
        setLinks(current.links);
    };

    const undo = () => {
        const previous = past[past.length - 1];
        if (!previous) return;
        setPast(p => p.slice(0, -1));
        setFuture(f => [links, ...f]);
        setLinks(previous);
    };
    const redo = () => {
        const [next, ...rest] = future;
        if (!next) return;
        setFuture(rest);
        setPast(p => [...p, links]);
        setLinks(next);
    };
    const reset = () => {
        setPast(p => [...p, links]);
        setFuture([]);
        setLinks([]);
    };
    useUndoShortcuts(undo, redo, playing);

    useAutoValidate({
        filledKey: loop ? [...links].sort((a, b) => a - b).join(",") : null,
        playing,
        hasErrors: false,
        setNotice: flow.setNotice,
        submit: () => flow.submit(async () => {
            if (!gameId.current || !loop) return {ok: false, message: "Lance une partie avant de valider."};
            try {
                const result = await boucleService.validate(gameId.current, loop);
                gameId.current = null;
                clearSavedGame(CODE);
                return {ok: true, result};
            } catch (err) {
                return {ok: false, message: (err as Error).message || "La validation a échoué, réessaie."};
            }
        }),
    });

    const canUndo = playing && past.length > 0;
    const canRedo = playing && future.length > 0;
    const center = (cell: number) => ({x: cell % size + 0.5, y: Math.floor(cell / size) + 0.5});
    const linkedCells = useMemo(() => new Set(shown.flatMap(key => (size ? linkCells(key, size) : []))), [shown, size]);

    const rules = (
        <ul>
            <li>Trace une seule boucle fermée</li>
            <li>Elle passe par toutes les cases, une seule fois</li>
            <li>Elle avance de case en case, sans diagonale</li>
            <li>Elle ne traverse jamais un mur</li>
        </ul>
    );

    return (
        <div className="puzzle-layout boucle">
            <GameToolbar gameName="Boucle" clock={flow.clock} canUndo={canUndo} canRedo={canRedo} onUndo={undo} onRedo={redo} rules={rules}/>

            <div className="options">
                <h2 className="title">Boucle</h2>
                <p className="boucle-progress">
                    {puzzle ? <><strong>{filled}</strong> / {totalCells} cases</> : "–"}
                </p>
                {loops > 1 && <p className="boucle-warning" role="status">{loops} boucles : il n'en faut qu'une</p>}
                <p className="digit-hint">Glisse de case en case pour tracer, par morceaux si tu veux, puis raccorde-les.</p>
                <p className="digit-hint">Glisse sur un trait pour l'effacer.</p>
            </div>

            <div className="game">
                <h1 className="title">Boucle</h1>
                {puzzle && (
                    <svg ref={board} className={`boucle-board ${stroke ? "drawing" : ""} ${loop ? "closed" : ""}`}
                         viewBox={`0 0 ${size} ${size}`} role="application" aria-label="Plateau : glisse de case en case pour tracer la boucle"
                         onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={endStroke} onPointerCancel={endStroke}>
                        {Array.from({length: size - 1}, (_, i) => (
                            <g key={i} className="boucle-grid">
                                <line x1={i + 1} y1={0} x2={i + 1} y2={size}/>
                                <line x1={0} y1={i + 1} x2={size} y2={i + 1}/>
                            </g>
                        ))}

                        {Array.from({length: totalCells}, (_, cell) => !linkedCells.has(cell) && (
                            <circle key={cell} className="boucle-dot" cx={center(cell).x} cy={center(cell).y} r={0.07}/>
                        ))}

                        {shown.map(key => {
                            const [a, b] = linkCells(key, size);
                            const [from, to] = [center(a), center(b)];
                            return <line key={key} className="boucle-link" x1={from.x} y1={from.y} x2={to.x} y2={to.y}/>;
                        })}

                        {puzzle.walls.map(([a, b]) => {
                            const row = Math.floor(a / size), col = a % size;
                            return b - a === 1
                                ? <line key={`${a}-${b}`} className="boucle-wall" x1={col + 1} y1={row} x2={col + 1} y2={row + 1}/>
                                : <line key={`${a}-${b}`} className="boucle-wall" x1={col} y1={row + 1} x2={col + 1} y2={row + 1}/>;
                        })}
                    </svg>
                )}
                {flow.validating && <SkeletonLabel label="Vérification…"/>}
            </div>

            <div className="actions">
                <h2 className="title">Actions</h2>
                <GameTimer clock={flow.clock}/>
                <HistoryButtons canUndo={canUndo} canRedo={canRedo} onUndo={undo} onRedo={redo}
                                onReset={reset} canReset={playing && links.length > 0}/>
                <GameNotice message={flow.notice} onClose={flow.clearNotice}/>
                <div className="rules">
                    <h3>Règles</h3>
                    {rules}
                    <p className="rules-keys">Clavier : Ctrl+Z pour annuler, Ctrl+Y pour rétablir</p>
                </div>
            </div>

            <WordSettingsPopup open={flow.showSettings} load={boucleService.getSettings} onGenerate={handleGenerate}
                               resume={resumable ? {elapsedMs: resumable.elapsedMs, onResume: handleResume} : undefined}
                               sizeLegend="Taille de la grille" sizeLabel={s => `${s}×${s}`}
                               amountLabel="Murs" easierWhenHigher/>

            {flow.victory && (
                <SuccessPopup gameName="Boucle" gameCode={CODE} xpAwarded={flow.victory.xpAwarded}
                              creditsAwarded={flow.victory.creditsAwarded} rewardMultiplier={flow.victory.rewardMultiplier}
                              before={flow.victory.before} durationMs={flow.victory.durationMs}
                              personalBest={flow.victory.personalBest} daily={flow.victory.daily}
                              onNewGame={flow.newGame} back="home"/>
            )}
        </div>
    );
}
