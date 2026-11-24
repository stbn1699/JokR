/**
 * Coloria : colorier chaque zone pour que deux zones qui se touchent n'aient jamais la même couleur.
 * On choisit une couleur (palette ou touches 1 à 5), puis un clic sur une zone la colorie ; un second clic l'efface.
 * Grille complète et sans conflit : validée automatiquement par le serveur.
 */

import {type CSSProperties, useEffect, useMemo, useRef, useState} from "react";
import "../PuzzleUI/PuzzleLayout.scss";
import "./Coloria.scss";
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
import {coloriaService} from "../../Services/coloria.service.ts";
import type {ColoriaPuzzle} from "../../Models/coloria.model.ts";
import {lessonClass, useLessonCoach} from "../Lessons/useLessonCoach.tsx";
import {COLORIA_LESSONS} from "../Lessons/coloriaLessons.ts";

const CODE = "COLORIA";
// Couleurs du thème des grilles, choisies pour bien se distinguer
const PALETTE = ["var(--board-region-1)", "var(--board-region-0)", "var(--board-region-3)", "var(--board-region-2)", "var(--board-region-4)"];

type Saved = { gameId: string; colors: number[] };

export default function Coloria({daily = false, replayDate, challengeId, level, levelInfo}: GridChallengeProps = {}) {
    const flow = useGameFlow(CODE, daily || replayDate !== undefined || challengeId !== undefined || level !== undefined);
    const challenge = useGridChallenge<Saved, ColoriaPuzzle>({
        code: CODE, gameName: "Coloria", daily, replayDate, challengeId, level, levelInfo, lessonTitles: COLORIA_LESSONS.titles,
        fetchStatus: coloriaService.getGame,
        emptySave: gameId => ({gameId, colors: []}),
        onLoad: (grid, saved, elapsedMs) => {
            restore(grid, saved);
            flow.resume(elapsedMs);
        },
    });
    const {resumable, dismissResumable} = useResumableGame<Saved, ColoriaPuzzle>(challenge.saveKey, coloriaService.getGame, !challenge.challenge);
    const [puzzle, setPuzzle] = useState<ColoriaPuzzle | null>(null);
    const [colors, setColors] = useState<number[]>([]);
    const [past, setPast] = useState<number[][]>([]);
    const [future, setFuture] = useState<number[][]>([]);
    const [active, setActive] = useState(0);
    const [hovered, setHovered] = useState<number | null>(null);
    const [showErrors, setShowErrors] = useShowErrors();
    const gameId = useRef<string | null>(null);

    const playing = puzzle !== null && !flow.showSettings && !flow.victory;
    // leçon du tutoriel : `lit` désigne des zones
    const coach = useLessonCoach(COLORIA_LESSONS, level, challenge.lesson, puzzle ? {puzzle, colors} : null, playing);

    const links = useMemo(() => {
        if (!puzzle) return [];
        const out = Array.from({length: puzzle.zones}, () => new Set<number>());
        puzzle.regions.forEach((zone, cell) => {
            const right = (cell + 1) % puzzle.width !== 0 ? puzzle.regions[cell + 1] : undefined;
            const down = puzzle.regions[cell + puzzle.width];
            for (const other of [right, down]) {
                if (other !== undefined && other !== zone) {
                    out[zone]!.add(other);
                    out[other]!.add(zone);
                }
            }
        });
        return out;
    }, [puzzle]);

    // Case la plus proche du centre de chaque zone : c'est là que s'affiche son numéro de couleur
    const labelCells = useMemo(() => {
        if (!puzzle) return new Map<number, number>();
        const groups = new Map<number, number[]>();
        puzzle.regions.forEach((zone, cell) => groups.set(zone, [...(groups.get(zone) ?? []), cell]));
        const labels = new Map<number, number>();
        for (const [zone, cells] of groups) {
            const row = cells.reduce((sum, c) => sum + Math.floor(c / puzzle.width), 0) / cells.length;
            const col = cells.reduce((sum, c) => sum + c % puzzle.width, 0) / cells.length;
            const distance = (c: number) => (Math.floor(c / puzzle.width) - row) ** 2 + (c % puzzle.width - col) ** 2;
            labels.set([...cells].sort((a, b) => distance(a) - distance(b))[0]!, zone);
        }
        return labels;
    }, [puzzle]);

    // Zones en conflit : même couleur qu'une voisine
    const conflicts = useMemo(() => {
        const out = new Set<number>();
        links.forEach((neighbours, zone) => {
            if ((colors[zone] ?? -1) < 0) return;
            for (const other of neighbours) if (colors[other] === colors[zone]) out.add(zone);
        });
        return out;
    }, [links, colors]);

    useEffect(() => {
        if (gameId.current && colors.length > 0) saveGame<Saved>(challenge.saveKey, {gameId: gameId.current, colors});
    }, [colors, challenge.saveKey]);

    const start = (next: ColoriaPuzzle, id: string, initial: number[]) => {
        gameId.current = id;
        setPuzzle(next);
        setColors(initial);
        setPast([]);
        setFuture([]);
        setActive(0);
    };

    const handleGenerate = (zones: number, count: number) => {
        dismissResumable();
        void flow.generate(async () => {
            try {
                const {gameId: id, puzzle: next} = await coloriaService.generate(zones, count);
                start(next, id, [...next.given]);
                return null;
            } catch (err) {
                return (err as Error).message || "Impossible de lancer la partie.";
            }
        });
    };

    // Partie sauvegardée (reprise ou défi) : grille de départ et saisies du joueur
    const restore = (grid: ColoriaPuzzle, saved: Saved) => {
        start(grid, saved.gameId, saved.colors?.length === grid.zones ? saved.colors : [...grid.given]);
    };

    const handleResume = () => {
        if (!resumable) return;
        restore(resumable.grid, resumable.saved);
        flow.resume(resumable.elapsedMs + Date.now() - resumable.checkedAt);
        dismissResumable();
    };

    const commit = (next: number[]) => {
        setPast(p => [...p, colors]);
        setFuture([]);
        setColors(next);
    };

    const paint = (zone: number) => {
        if (!playing || puzzle.given[zone]! >= 0) return;
        const next = [...colors];
        next[zone] = colors[zone] === active ? -1 : active;
        commit(next);
    };

    const undo = () => {
        const previous = past[past.length - 1];
        if (!previous) return;
        setPast(p => p.slice(0, -1));
        setFuture(f => [colors, ...f]);
        setColors(previous);
    };
    const redo = () => {
        const [next, ...rest] = future;
        if (!next) return;
        setFuture(rest);
        setPast(p => [...p, colors]);
        setColors(next);
    };
    const reset = () => {
        if (puzzle) commit([...puzzle.given]);
    };
    useUndoShortcuts(undo, redo, playing);

    // Touches 1 à 5 : choisir une couleur
    useEffect(() => {
        if (!playing) return;
        const onKeyDown = (e: KeyboardEvent) => {
            if (e.ctrlKey || e.metaKey || e.altKey) return;
            const digit = Number(e.key);
            if (Number.isInteger(digit) && digit >= 1 && digit <= puzzle.colors) setActive(digit - 1);
        };
        window.addEventListener("keydown", onKeyDown);
        return () => window.removeEventListener("keydown", onKeyDown);
    }, [playing, puzzle]);

    const full = colors.length > 0 && colors.every(color => color >= 0);
    useAutoValidate({
        filledKey: full ? colors.join(",") : null,
        playing,
        hasErrors: conflicts.size > 0,
        setNotice: flow.setNotice,
        submit: () => flow.submit(async () => {
            if (!gameId.current) return {ok: false, message: "Lance une partie avant de valider."};
            try {
                const result = await coloriaService.validate(gameId.current, colors);
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
    const hasInput = puzzle !== null && colors.some((color, zone) => color !== puzzle.given[zone]);
    const colored = colors.filter(color => color >= 0).length;

    const rules = (
        <ul>
            <li>Colorie toutes les zones</li>
            <li>Deux zones qui se touchent par un côté n'ont jamais la même couleur</li>
            <li>Les zones marquées d'un point sont données et ne changent pas</li>
            <li>Moins il y a de couleurs, plus c'est difficile</li>
        </ul>
    );

    return (
        <div className="puzzle-layout coloria">
            <GameToolbar gameName="Coloria" label={challenge.toolbarLabel} clock={flow.clock} canUndo={canUndo} canRedo={canRedo} onUndo={undo} onRedo={redo}
                         showErrors={showErrors} onToggleErrors={setShowErrors} errorCount={conflicts.size} rules={rules}/>

            <div className="options">
                <h2 className="title">Couleurs</h2>
                {puzzle && (
                    <>
                        <div className="coloria-palette" role="group" aria-label="Choisir une couleur">
                            {Array.from({length: puzzle.colors}, (_, color) => (
                                <button key={color} type="button" disabled={!playing} aria-pressed={active === color}
                                        aria-label={`Couleur ${color + 1}`} className={active === color ? "selected" : ""}
                                        style={{"--zone": PALETTE[color]} as CSSProperties} onClick={() => setActive(color)}>
                                    {color + 1}
                                </button>
                            ))}
                        </div>
                        <p className="coloria-progress"><strong>{colored}</strong> / {puzzle.zones} zones</p>
                        <p className="digit-hint">
                            Choisis une couleur (ou touches 1 à {puzzle.colors}), puis clique sur une zone. Reclique pour l'effacer.
                            {puzzle.colors > 3 && " Tout coloriage qui respecte la règle gagne."}
                        </p>
                    </>
                )}
            </div>

            <div className="game">
                {challenge.banner}
                <h1 className="title">Coloria</h1>
                {challenge.loading && <Loader size="small" label="Chargement du défi…"/>}
                {puzzle && (
                    <div className="coloria-board" style={{"--size": puzzle.width} as CSSProperties} role="grid" aria-label="Zones à colorier"
                         onMouseLeave={() => setHovered(null)}>
                        {puzzle.regions.map((zone, cell) => {
                            const w = puzzle.width;
                            const color = colors[zone] ?? -1;
                            const classes = [
                                "coloria-cell",
                                cell < w || puzzle.regions[cell - w] !== zone ? "b-top" : "",
                                (cell + 1) % w === 0 || puzzle.regions[cell + 1] !== zone ? "b-right" : "",
                                cell >= w * (w - 1) || puzzle.regions[cell + w] !== zone ? "b-bottom" : "",
                                cell % w === 0 || puzzle.regions[cell - 1] !== zone ? "b-left" : "",
                                hovered === zone && puzzle.given[zone]! < 0 ? "hovered" : "",
                                showErrors && conflicts.has(zone) ? "conflict" : "",
                                lessonClass(coach.lit, zone),
                            ];
                            const isLabel = labelCells.get(cell) === zone;
                            return (
                                <button key={cell} type="button" role="gridcell" className={classes.join(" ")} disabled={!playing}
                                        style={color >= 0 ? {"--zone": PALETTE[color]} as CSSProperties : undefined}
                                        aria-label={`Zone ${zone + 1}${color >= 0 ? `, couleur ${color + 1}` : ", vide"}`}
                                        onMouseDown={e => e.preventDefault()} onMouseEnter={() => setHovered(zone)}
                                        onClick={() => paint(zone)}>
                                    {isLabel && color >= 0 && <span className="coloria-mark">{puzzle.given[zone]! >= 0 ? `•${color + 1}` : color + 1}</span>}
                                </button>
                            );
                        })}
                    </div>
                )}
                {coach.bubble}
                {flow.validating && <SkeletonLabel label="Vérification…"/>}
            </div>

            <div className="actions">
                <h2 className="title">Actions</h2>
                <GameTimer clock={flow.clock}/>
                <HistoryButtons canUndo={canUndo} canRedo={canRedo} onUndo={undo} onRedo={redo}
                                onReset={reset} canReset={playing && hasInput}/>
                <ErrorsToggle checked={showErrors} onChange={setShowErrors} count={conflicts.size}/>
                <GameNotice message={challenge.error ?? flow.notice} onClose={flow.clearNotice}/>
                <div className="rules">
                    <h3>Règles</h3>
                    {rules}
                    <p className="rules-keys">Clavier : <kbd>1</kbd> à <kbd>5</kbd> pour la couleur, Ctrl+Z / Ctrl+Y pour annuler ou rétablir</p>
                </div>
            </div>

            <WordSettingsPopup open={flow.showSettings && !challenge.challenge} load={coloriaService.getSettings} onGenerate={handleGenerate}
                               resume={resumable ? {elapsedMs: resumable.elapsedMs, onResume: handleResume} : undefined}
                               sizeLegend="Nombre de zones" sizeLabel={zones => `${zones} zones`}
                               amountLabel="Couleurs" easierWhenHigher/>

            {challenge.donePopup}

            {challenge.levelVictory(flow.victory)}

            {flow.victory && level === undefined && (
                <SuccessPopup gameName="Coloria" gameCode={CODE} xpAwarded={flow.victory.xpAwarded}
                              creditsAwarded={flow.victory.creditsAwarded} rewardMultiplier={flow.victory.rewardMultiplier}
                              before={flow.victory.before} durationMs={flow.victory.durationMs}
                              personalBest={flow.victory.personalBest} daily={flow.victory.daily}
                              streak={flow.victory.streak} {...challenge.victory(flow.newGame)}/>
            )}
        </div>
    );
}
