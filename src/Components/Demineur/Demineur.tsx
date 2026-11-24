/**
 * Démineur : libérer toutes les cases sans mine.
 * Clic : libère la case. Clic droit ou appui long (téléphone) : pose ou retire un drapeau.
 * Clic sur un chiffre entouré d'autant de drapeaux : libère ses autres voisines ; sinon, elles clignotent.
 * Les mines restent sur le serveur, qui répond case par case ; la partie gagnée est validée toute seule.
 */

import {type PointerEvent, useEffect, useMemo, useRef, useState} from "react";
import "../PuzzleUI/PuzzleLayout.scss";
import "./Demineur.scss";
import {SuccessPopup} from "../SuccessPopup/SuccessPopup.tsx";
import GameNotice from "../PuzzleUI/GameNotice.tsx";
import GameTimer from "../PuzzleUI/GameTimer.tsx";
import GameToolbar from "../PuzzleUI/GameToolbar.tsx";
import {SkeletonLabel} from "../PuzzleUI/GridSkeleton.tsx";
import {clearSavedGame, saveGame, useResumableGame} from "../PuzzleUI/savedGame.ts";
import {useAutoValidate} from "../PuzzleUI/useAutoValidate.ts";
import {useGameFlow} from "../PuzzleUI/useGameFlow.ts";
import WordSettingsPopup from "../WordGames/WordSettingsPopup.tsx";
import {demineurService} from "../../Services/demineur.service.ts";
import type {DemineurPuzzle} from "../../Models/demineur.model.ts";
import {planClick} from "./demineurRules.ts";
import LostPopup from "./LostPopup.tsx";
import {coveredShape} from "./coveredShape.ts";

const CODE = "DEMINEUR";
// Durée d'appui pour poser un drapeau au doigt, et distance au-delà de laquelle l'appui est annulé
const LONG_PRESS_MS = 380;
const MOVE_TOLERANCE_PX = 12;
const HIGHLIGHT_MS = 550;
// Arrondi des coins de la zone couverte (en cases)
const CORNER_RADIUS = 0.32;
// Temps laissé pour voir la mine avant la popup
const LOST_POPUP_DELAY_MS = 900;

type Saved = { gameId: string; flags: number[] };
type Lost = { cell: number; mines: Set<number>; durationMs: number };
type Press = { pointerId: number; cell: number; x: number; y: number; timer: number; flagged: boolean };

const noop = () => undefined;

export default function Demineur() {
    const flow = useGameFlow(CODE);
    const {resumable, dismissResumable} = useResumableGame<Saved, DemineurPuzzle>(CODE, demineurService.getGame);
    const [puzzle, setPuzzle] = useState<DemineurPuzzle | null>(null);
    const [revealed, setRevealed] = useState<Map<number, number>>(new Map());
    const [flags, setFlags] = useState<Set<number>>(new Set());
    const [lost, setLost] = useState<Lost | null>(null);
    const [highlight, setHighlight] = useState<Set<number>>(new Set());
    const [showLost, setShowLost] = useState(false);
    const board = useRef<SVGSVGElement>(null);
    const gameId = useRef<string | null>(null);
    const press = useRef<Press | null>(null);
    const highlightTimer = useRef<number | undefined>(undefined);

    const playing = puzzle !== null && !flow.showSettings && !flow.victory && !lost;
    const size = puzzle?.size ?? 0;
    const totalCells = size * size;
    const cleared = puzzle !== null && !lost && revealed.size === totalCells - puzzle.mines;

    useEffect(() => {
        if (gameId.current) saveGame<Saved>(CODE, {gameId: gameId.current, flags: [...flags]});
    }, [flags]);

    useEffect(() => () => window.clearTimeout(highlightTimer.current), []);

    const start = (next: DemineurPuzzle, id: string, initialFlags: number[]) => {
        gameId.current = id;
        setPuzzle(next);
        const open = new Map(next.revealed);
        setRevealed(open);
        setFlags(new Set(initialFlags.filter(cell => !open.has(cell))));
        setLost(null);
        setShowLost(false);
        setHighlight(new Set());
    };

    const handleGenerate = (nextSize: number, mines: number) => {
        dismissResumable();
        void flow.generate(async () => {
            try {
                const {gameId: id, puzzle: next} = await demineurService.generate(nextSize, mines);
                start(next, id, []);
                return null;
            } catch (err) {
                return (err as Error).message || "Impossible de lancer la partie.";
            }
        });
    };

    const handleResume = () => {
        if (!resumable) return;
        start(resumable.grid, resumable.saved.gameId, resumable.saved.flags ?? []);
        flow.resume(resumable.elapsedMs + Date.now() - resumable.checkedAt);
        dismissResumable();
    };

    const revealCells = async (cells: number[]) => {
        const id = gameId.current;
        if (!id) return;
        try {
            const outcome = await demineurService.reveal(id, cells);
            if (gameId.current !== id) return;
            if (outcome.kind === "exploded") {
                gameId.current = null;
                clearSavedGame(CODE);
                flow.stop();
                const {startedAt} = flow.clock;
                setLost({cell: outcome.cell, mines: new Set(outcome.mines), durationMs: startedAt === null ? 0 : Date.now() - startedAt});
                window.setTimeout(() => setShowLost(true), LOST_POPUP_DELAY_MS);
                return;
            }
            setRevealed(previous => {
                const next = new Map(previous);
                for (const [cell, count] of outcome.cells) next.set(cell, count);
                return next;
            });
            // un drapeau posé sur une case libérée par propagation n'a plus lieu d'être
            setFlags(previous => {
                const opened = outcome.cells.filter(([cell]) => previous.has(cell));
                if (!opened.length) return previous;
                const next = new Set(previous);
                for (const [cell] of opened) next.delete(cell);
                return next;
            });
        } catch (err) {
            flow.setNotice((err as Error).message || "La case n'a pas pu être libérée, réessaie.");
        }
    };

    const toggleFlag = (cell: number) => {
        if (revealed.has(cell)) return;
        setFlags(previous => {
            const next = new Set(previous);
            if (!next.delete(cell)) next.add(cell);
            return next;
        });
    };

    const clickCell = (cell: number) => {
        const plan = planClick(cell, size, revealed, flags);
        if (plan.kind === "reveal") void revealCells(plan.cells);
        else if (plan.kind === "highlight") {
            window.clearTimeout(highlightTimer.current);
            setHighlight(new Set(plan.cells));
            highlightTimer.current = window.setTimeout(() => setHighlight(new Set()), HIGHLIGHT_MS);
        }
    };

    const cellAt = (e: PointerEvent<SVGSVGElement>) => {
        const rect = board.current?.getBoundingClientRect();
        if (!rect || !size) return null;
        const col = Math.floor((e.clientX - rect.left) / rect.width * size);
        const row = Math.floor((e.clientY - rect.top) / rect.height * size);
        if (row < 0 || col < 0 || row >= size || col >= size) return null;
        return row * size + col;
    };

    const cancelPress = () => {
        if (press.current) window.clearTimeout(press.current.timer);
        press.current = null;
    };

    const onPointerDown = (e: PointerEvent<SVGSVGElement>) => {
        if (!playing) return;
        const cell = cellAt(e);
        if (cell === null) return;
        // clic droit : drapeau tout de suite
        if (e.button === 2) {
            toggleFlag(cell);
            return;
        }
        if (e.button !== 0) return;
        cancelPress();
        const current: Press = {pointerId: e.pointerId, cell, x: e.clientX, y: e.clientY, flagged: false, timer: 0};
        // appui long : drapeau, sans attendre que le doigt se lève
        current.timer = window.setTimeout(() => {
            current.flagged = true;
            toggleFlag(cell);
            navigator.vibrate?.(25);
        }, LONG_PRESS_MS);
        press.current = current;
    };

    const onPointerMove = (e: PointerEvent<SVGSVGElement>) => {
        const current = press.current;
        if (!current || current.pointerId !== e.pointerId) return;
        if (Math.hypot(e.clientX - current.x, e.clientY - current.y) > MOVE_TOLERANCE_PX) cancelPress();
    };

    const onPointerUp = (e: PointerEvent<SVGSVGElement>) => {
        const current = press.current;
        if (!current || current.pointerId !== e.pointerId) return;
        cancelPress();
        if (!current.flagged && playing) clickCell(current.cell);
    };

    useAutoValidate({
        filledKey: cleared ? String(revealed.size) : null,
        playing,
        hasErrors: false,
        setNotice: flow.setNotice,
        submit: () => flow.submit(async () => {
            if (!gameId.current) return {ok: false, message: "Lance une partie avant de valider."};
            try {
                const result = await demineurService.validate(gameId.current);
                gameId.current = null;
                clearSavedGame(CODE);
                return {ok: true, result};
            } catch (err) {
                return {ok: false, message: (err as Error).message || "La validation a échoué, réessaie."};
            }
        }),
    });

    const minesLeft = puzzle ? puzzle.mines - flags.size : 0;

    // Case encore couverte (la zone bleue) : ni libérée, ni mine montrée après l'explosion
    const covered = (cell: number) =>
        !revealed.has(cell) && !(lost && lost.mines.has(cell) && !flags.has(cell));

    const shape = useMemo(() => coveredShape(size, covered, CORNER_RADIUS),
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [revealed, lost, flags, size]);

    const renderContent = (cell: number) => {
        const x = cell % size, y = Math.floor(cell / size);
        const count = revealed.get(cell);
        if (count !== undefined) {
            return count > 0 ? <text key={cell} className={`dm-count dm-n${count}`} x={x + 0.5} y={y + 0.54}>{count}</text> : null;
        }
        const mine = lost?.mines.has(cell) ?? false;
        if (flags.has(cell)) return <Flag key={cell} x={x} y={y} wrong={lost !== null && !mine}/>;
        return lost && mine ? <Mine key={cell} x={x} y={y}/> : null;
    };

    const rules = (
        <ul>
            <li>Libère toutes les cases qui ne cachent pas de mine</li>
            <li>Un chiffre indique combien de mines touchent la case, diagonales comprises</li>
            <li>Clic droit, ou appui long au doigt : pose un drapeau</li>
            <li>Un chiffre entouré d'autant de drapeaux : clique dessus pour libérer ses autres voisines</li>
            <li>Le premier clic ne tombe jamais sur une mine</li>
        </ul>
    );

    return (
        <div className="puzzle-layout demineur">
            <GameToolbar gameName="Démineur" clock={flow.clock} canUndo={false} canRedo={false} onUndo={noop} onRedo={noop} rules={rules}/>

            <div className="options">
                <h2 className="title">Démineur</h2>
                <p className="demineur-progress">
                    {puzzle ? <><strong>{minesLeft}</strong> {Math.abs(minesLeft) > 1 ? "mines restantes" : "mine restante"}</> : "–"}
                </p>
                <p className="digit-hint">Clic : libère la case. Clic droit ou appui long : drapeau.</p>
                <p className="digit-hint">Clique sur un chiffre entouré de ses drapeaux pour libérer ses voisines.</p>
            </div>

            <div className="game">
                <h1 className="title">Démineur</h1>
                {puzzle && (
                    <svg ref={board} className={`demineur-board ${lost ? "lost" : ""} ${size >= 16 ? "dense" : ""}`}
                         viewBox={`0 0 ${size} ${size}`} role="application"
                         aria-label="Plateau : clic pour libérer une case, clic droit ou appui long pour un drapeau"
                         onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp}
                         onPointerCancel={cancelPress} onPointerLeave={cancelPress}
                         onContextMenu={e => e.preventDefault()}>
                        {lost && <rect className="dm-exploded" x={lost.cell % size} y={Math.floor(lost.cell / size)} width={1} height={1}/>}
                        {Array.from({length: size - 1}, (_, i) => (
                            <g key={i} className="demineur-grid">
                                <line x1={i + 1} y1={0} x2={i + 1} y2={size}/>
                                <line x1={0} y1={i + 1} x2={size} y2={i + 1}/>
                            </g>
                        ))}
                        {shape.cells.map(({cell, d}) => <path key={cell} className={`dm-hidden ${highlight.has(cell) ? "dm-highlight" : ""}`} d={d}/>)}
                        {shape.fillets.map(({key, d}) => <path key={key} className="dm-fillet" d={d}/>)}
                        {shape.dashes.map(({key, d}) => <path key={key} className="dm-hidden-dash" d={d}/>)}
                        {shape.borders.map(({key, d}) => <path key={key} className="dm-border" d={d}/>)}
                        {Array.from({length: totalCells}, (_, cell) => renderContent(cell))}
                    </svg>
                )}
                {flow.validating && <SkeletonLabel label="Vérification…"/>}
            </div>

            <div className="actions">
                <h2 className="title">Actions</h2>
                <GameTimer clock={flow.clock}/>
                <GameNotice message={flow.notice} onClose={flow.clearNotice}/>
                <div className="rules">
                    <h3>Règles</h3>
                    {rules}
                </div>
            </div>

            <WordSettingsPopup open={flow.showSettings} load={demineurService.getSettings} onGenerate={handleGenerate}
                               resume={resumable ? {elapsedMs: resumable.elapsedMs, onResume: handleResume} : undefined}
                               sizeLegend="Taille de la grille" sizeLabel={s => `${s}×${s}`}
                               amountLabel="Mines"/>

            {lost && showLost && !flow.showSettings && (
                <LostPopup durationMs={lost.durationMs} onNewGame={() => {
                    setShowLost(false);
                    flow.newGame();
                }}/>
            )}

            {flow.victory && (
                <SuccessPopup gameName="Démineur" gameCode={CODE} xpAwarded={flow.victory.xpAwarded}
                              creditsAwarded={flow.victory.creditsAwarded} rewardMultiplier={flow.victory.rewardMultiplier}
                              before={flow.victory.before} durationMs={flow.victory.durationMs}
                              personalBest={flow.victory.personalBest} daily={flow.victory.daily}
                              onNewGame={flow.newGame} back="home"/>
            )}
        </div>
    );
}

function Flag({x, y, wrong}: { x: number; y: number; wrong: boolean }) {
    return (
        <g className="dm-flag" transform={`translate(${x} ${y})`}>
            <line className="dm-flag-pole" x1={0.38} y1={0.22} x2={0.38} y2={0.8}/>
            <path className="dm-flag-cloth" d="M0.38 0.2 L0.76 0.36 L0.38 0.52 Z"/>
            {wrong && <path className="dm-flag-wrong" d="M0.2 0.2 L0.8 0.8 M0.8 0.2 L0.2 0.8"/>}
        </g>
    );
}

function Mine({x, y}: { x: number; y: number }) {
    return (
        <g className="dm-mine" transform={`translate(${x + 0.5} ${y + 0.5})`}>
            <path className="dm-mine-spikes" d="M0 -0.33 V0.33 M-0.33 0 H0.33 M-0.24 -0.24 L0.24 0.24 M0.24 -0.24 L-0.24 0.24"/>
            <circle r={0.22}/>
        </g>
    );
}
