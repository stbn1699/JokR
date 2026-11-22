import {type CSSProperties, useEffect, useRef, useState} from "react";
import {useGameFlow} from "../PuzzleUI/useGameFlow.ts";
import {clearSavedGame, saveGame, useResumableGame} from "../PuzzleUI/savedGame.ts";
import {echelleService} from "../../Services/wordGames.service.ts";
import type {EchellePuzzle} from "../../Models/wordGames.model.ts";
import LetterKeyboard from "./LetterKeyboard.tsx";
import {useLetterKeys} from "./useLetterKeys.ts";
import WordGameShell from "./WordGameShell.tsx";
import WordSettingsPopup from "./WordSettingsPopup.tsx";

const CODE = "ECHELLE";

type Saved = { gameId: string; path: string[] };

const lettersApart = (a: string, b: string) => Array.from(a).filter((letter, i) => letter !== b[i]).length;

/**
 * Échelle : relier deux mots en changeant une lettre à chaque étape.
 * Chaque mot est vérifié par le serveur, qui valide aussi le chemin complet à l'arrivée.
 */
export default function Echelle() {
    const flow = useGameFlow(CODE);
    const {resumable, dismissResumable} = useResumableGame<Saved, EchellePuzzle>(CODE, echelleService.getGame);
    const [puzzle, setPuzzle] = useState<EchellePuzzle | null>(null);
    const [path, setPath] = useState<string[]>([]);
    const [undone, setUndone] = useState<string[]>([]);
    const [current, setCurrent] = useState("");
    const [busy, setBusy] = useState(false);
    const [shake, setShake] = useState(0);
    const gameId = useRef<string | null>(null);

    const playing = puzzle !== null && !flow.showSettings && !flow.victory;
    const last = path[path.length - 1] ?? "";

    useEffect(() => {
        if (gameId.current && path.length > 0) saveGame<Saved>(CODE, {gameId: gameId.current, path});
    }, [path]);

    const start = (next: EchellePuzzle, id: string, words: string[]) => {
        gameId.current = id;
        setPuzzle(next);
        setPath(words);
        setUndone([]);
        setCurrent("");
    };

    const handleGenerate = (size: number, amount: number) => {
        dismissResumable();
        void flow.generate(async () => {
            try {
                const {gameId: id, puzzle: next} = await echelleService.generate(size, amount);
                start(next, id, [next.start]);
                return null;
            } catch (err) {
                return (err as Error).message || "Impossible de lancer la partie.";
            }
        });
    };

    const handleResume = () => {
        if (!resumable) return;
        const {grid, saved} = resumable;
        start(grid, saved.gameId, Array.isArray(saved.path) && saved.path[0] === grid.start ? saved.path : [grid.start]);
        flow.resume(resumable.elapsedMs + Date.now() - resumable.checkedAt);
        dismissResumable();
    };

    const refuse = (message: string) => {
        flow.setNotice(message);
        setShake(s => s + 1);
    };

    const submit = async () => {
        if (!playing || busy || !gameId.current) return;
        if (current.length !== puzzle.length) return refuse(`Le mot doit faire ${puzzle.length} lettres.`);
        if (lettersApart(last, current) !== 1) return refuse("Change exactement une lettre du mot précédent.");
        if (path.includes(current)) return refuse("Ce mot est déjà dans ton échelle.");

        const id = gameId.current;
        const word = current;
        setBusy(true);
        flow.clearNotice();
        try {
            await echelleService.check(last, word);
            const nextPath = [...path, word];
            setPath(nextPath);
            setUndone([]);
            setCurrent("");
            if (word === puzzle.target) {
                await flow.submit(async () => {
                    try {
                        const result = await echelleService.validate(id, nextPath);
                        gameId.current = null;
                        clearSavedGame(CODE);
                        return {ok: true, result};
                    } catch (err) {
                        return {ok: false, message: (err as Error).message || "La validation a échoué, réessaie."};
                    }
                });
            }
        } catch (err) {
            refuse((err as Error).message || "Mot refusé, réessaie.");
        } finally {
            setBusy(false);
        }
    };

    const handlers = {
        onLetter: (letter: string) => {
            if (playing && !busy) setCurrent(c => (c.length < puzzle.length ? c + letter : c));
        },
        onBackspace: () => {
            if (playing && !busy) setCurrent(c => c.slice(0, -1));
        },
        onEnter: () => void submit(),
    };
    useLetterKeys(playing, handlers);

    const undo = () => {
        if (path.length <= 1) return;
        setUndone(u => [path[path.length - 1]!, ...u]);
        setPath(p => p.slice(0, -1));
    };
    const redo = () => {
        const [next, ...rest] = undone;
        if (!next) return;
        setUndone(rest);
        setPath(p => [...p, next]);
    };
    const reset = () => {
        setPath(p => p.slice(0, 1));
        setUndone([]);
        setCurrent("");
    };

    const steps = path.length - 1;
    const rules = (
        <ul>
            <li>Passe du mot de départ au mot d'arrivée</li>
            <li>À chaque étape, change une seule lettre, sans bouger les autres</li>
            <li>Chaque étape doit être un mot du dictionnaire (conjugaisons et pluriels acceptés)</li>
            <li>Tous les chemins sont bons, même plus longs que le plus court</li>
        </ul>
    );

    return (
        <WordGameShell
            className="echelle" gameCode={CODE} gameName="Échelle" flow={flow} rules={rules}
            info={puzzle ? (
                <>
                    <p>Étapes : <strong>{steps}</strong></p>
                    <p>Chemin le plus court connu : <strong>{puzzle.par}</strong></p>
                    <p className="word-hint">Tape le mot suivant puis valide avec Entrée. Les lettres déjà comme l'arrivée sont en rose.</p>
                </>
            ) : <p>–</p>}
            history={{
                canUndo: playing && path.length > 1, canRedo: playing && undone.length > 0,
                canReset: playing && path.length > 1, onUndo: undo, onRedo: redo, onReset: reset,
            }}
            settings={
                <WordSettingsPopup open={flow.showSettings} load={echelleService.getSettings} onGenerate={handleGenerate}
                                   resume={resumable ? {elapsedMs: resumable.elapsedMs, onResume: handleResume} : undefined}
                                   sizeLegend="Longueur des mots" sizeLabel={s => `${s} lettres`}
                                   amountLabel="Étapes du chemin le plus court"/>
            }
        >
            {puzzle && (
                <>
                    <div className="word-rows ladder" style={{"--letters": puzzle.length} as CSSProperties}>
                        {path.map((word, row) => (
                            <div className="word-row" key={`${row}-${word}`} aria-label={word}>
                                {Array.from(word, (letter, i) => (
                                    <span key={i} className={`word-cell filled ${letter === puzzle.target[i] ? "correct" : ""} ${row > 0 && path[row - 1]![i] !== letter ? "changed" : ""}`}>
                                        {letter}
                                    </span>
                                ))}
                            </div>
                        ))}

                        {last !== puzzle.target && (
                            <>
                                <div className={`word-row current ${shake ? "shake" : ""}`} key={`input-${shake}`}>
                                    {Array.from({length: puzzle.length}, (_, i) => (
                                        <span key={i} className={`word-cell ${current[i] ? "filled" : "ghost"} ${current[i] && current[i] !== last[i] ? "changed" : ""}`}>
                                            {current[i] ?? last[i]}
                                        </span>
                                    ))}
                                </div>
                                <div className="ladder-gap" aria-hidden>⋮</div>
                                <div className="word-row target" aria-label={`Arrivée : ${puzzle.target}`}>
                                    {Array.from(puzzle.target, (letter, i) => <span key={i} className="word-cell filled">{letter}</span>)}
                                </div>
                            </>
                        )}
                    </div>
                    <LetterKeyboard disabled={!playing || busy} {...handlers}/>
                </>
            )}
        </WordGameShell>
    );
}
