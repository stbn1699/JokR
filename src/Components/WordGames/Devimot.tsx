import {type GridChallengeProps, useGridChallenge} from "../PuzzleUI/useGridChallenge.tsx";
import {useMemo, useRef, useState} from "react";
import {useGameFlow, type Clock} from "../PuzzleUI/useGameFlow.ts";
import {useUndoShortcuts} from "../PuzzleUI/useMoveHistory.ts";
import {clearSavedGame, saveGame, useResumableGame} from "../PuzzleUI/savedGame.ts";
import {devimotService} from "../../Services/wordGames.service.ts";
import type {DevimotPuzzle, LetterMark} from "../../Models/wordGames.model.ts";
import LetterKeyboard from "./LetterKeyboard.tsx";
import {useLetterKeys} from "./useLetterKeys.ts";
import WordGameShell from "./WordGameShell.tsx";
import WordSettingsPopup from "./WordSettingsPopup.tsx";
import {useLessonCoach} from "../Lessons/useLessonCoach.tsx";
import {DEVIMOT_LESSONS} from "../Lessons/wordLessons.ts";

const CODE = "DEVIMOT";
const MARK_RANK: Record<LetterMark, number> = {absent: 0, present: 1, correct: 2};
const MARK_LABEL: Record<LetterMark, string> = {correct: "bien placée", present: "mal placée", absent: "absente"};

type Saved = { gameId: string };

/**
 * Devimot : deviner un mot en un nombre d'essais limité.
 * Le serveur garde le mot et renvoie le résultat de chaque essai ; il ne le révèle qu'à la fin de la partie.
 */
export default function Devimot({daily = false, replayDate, challengeId, level, levelInfo}: GridChallengeProps = {}) {
    const flow = useGameFlow(CODE, daily || replayDate !== undefined || challengeId !== undefined || level !== undefined);
    const challenge = useGridChallenge<Saved, DevimotPuzzle>({
        code: CODE, gameName: "Devimot", playName: "à Devimot", daily, replayDate, challengeId, level, levelInfo, lessonTitles: DEVIMOT_LESSONS.titles,
        fetchStatus: devimotService.getGame,
        emptySave: gameId => ({gameId}),
        onLoad: (grid, saved, elapsedMs) => {
            restore(grid, saved);
            flow.resume(elapsedMs);
        },
    });
    const {resumable, dismissResumable} = useResumableGame<Saved, DevimotPuzzle>(challenge.saveKey, devimotService.getGame, !challenge.challenge);
    const [puzzle, setPuzzle] = useState<DevimotPuzzle | null>(null);
    const [current, setCurrent] = useState("");
    // Annuler / Rétablir : uniquement sur le mot en cours, un essai validé est définitif
    const [past, setPast] = useState<string[]>([]);
    const [future, setFuture] = useState<string[]>([]);
    const [answer, setAnswer] = useState<string | null>(null);
    const [lostClock, setLostClock] = useState<Clock | null>(null);
    const [busy, setBusy] = useState(false);
    const [shake, setShake] = useState(0);
    const gameId = useRef<string | null>(null);

    const playing = puzzle !== null && !flow.showSettings && !flow.victory && answer === null;
    const coach = useLessonCoach(DEVIMOT_LESSONS, level, challenge.lesson, puzzle ? {guesses: puzzle.guesses} : null, playing);

    const keyMarks = useMemo(() => {
        const best: Record<string, LetterMark> = {};
        for (const guess of puzzle?.guesses ?? []) {
            Array.from(guess.word).forEach((letter, i) => {
                const mark = guess.marks[i]!;
                if (!best[letter] || MARK_RANK[mark] > MARK_RANK[best[letter]!]) best[letter] = mark;
            });
        }
        return best;
    }, [puzzle]);

    const clearWord = () => {
        setCurrent("");
        setPast([]);
        setFuture([]);
    };

    const start = (next: DevimotPuzzle, id: string) => {
        gameId.current = id;
        setPuzzle(next);
        clearWord();
        setAnswer(null);
        setLostClock(null);
    };

    const handleGenerate = (size: number, amount: number) => {
        dismissResumable();
        void flow.generate(async () => {
            try {
                const {gameId: id, puzzle: next} = await devimotService.generate(size, amount);
                start(next, id);
                saveGame<Saved>(challenge.saveKey, {gameId: id});
                return null;
            } catch (err) {
                return (err as Error).message || "Impossible de lancer la partie.";
            }
        });
    };

    // Partie sauvegardée (reprise ou défi) : grille de départ et saisies du joueur
    const restore = (grid: DevimotPuzzle, saved: Saved) => {
        start(grid, saved.gameId);
        saveGame<Saved>(challenge.saveKey, {gameId: saved.gameId});
    };

    const handleResume = () => {
        if (!resumable) return;
        restore(resumable.grid, resumable.saved);
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

        const id = gameId.current;
        const word = current;
        setBusy(true);
        flow.clearNotice();
        try {
            const reply = await devimotService.guess(id, word);
            setPuzzle(p => p && {...p, guesses: [...p.guesses, {word, marks: reply.marks}]});
            clearWord();
            if (reply.state === "won" && reply.result) {
                const result = reply.result;
                gameId.current = null;
                clearSavedGame(challenge.saveKey);
                await flow.submit(async () => ({ok: true, result}));
            } else if (reply.penaltyMs) {
                flow.penalty(reply.penaltyMs);
                flow.setNotice(`Essai en plus : +${Math.round(reply.penaltyMs / 1000)} s au chrono.`);
            } else if (reply.state === "lost") {
                gameId.current = null;
                clearSavedGame(challenge.saveKey);
                setAnswer(reply.answer ?? "");
                const startedAt = flow.clock.startedAt;
                setLostClock({startedAt, finalMs: startedAt === null ? 0 : Date.now() - startedAt});
            }
        } catch (err) {
            refuse((err as Error).message || "Essai refusé, réessaie.");
        } finally {
            setBusy(false);
        }
    };

    const changeWord = (next: string) => {
        if (next === current) return;
        setPast(p => [...p, current]);
        setFuture([]);
        setCurrent(next);
    };

    const handlers = {
        onLetter: (letter: string) => {
            if (playing && !busy && current.length < puzzle.length) changeWord(current + letter);
        },
        onBackspace: () => {
            if (playing && !busy) changeWord(current.slice(0, -1));
        },
        onEnter: () => void submit(),
    };
    // leçon : pas de frappe pendant une explication
    useLetterKeys(playing && !coach.locked, handlers);

    const undo = () => {
        const previous = past[past.length - 1];
        if (previous === undefined || busy) return;
        setPast(p => p.slice(0, -1));
        setFuture(f => [current, ...f]);
        setCurrent(previous);
    };
    const redo = () => {
        const next = future[0];
        if (next === undefined || busy) return;
        setFuture(f => f.slice(1));
        setPast(p => [...p, current]);
        setCurrent(next);
    };
    useUndoShortcuts(undo, redo, playing);

    const used = puzzle?.guesses.length ?? 0;
    // défis : des essais en plus (avec du temps de pénalité) une fois les essais prévus épuisés
    const rows = puzzle ? Math.max(puzzle.maxAttempts, used + (playing ? 1 : 0)) : 0;
    const rules = (
        <ul>
            <li>Trouve le mot caché en un nombre d'essais limité</li>
            <li>Chaque essai doit être un mot du dictionnaire</li>
            <li>Vert : la lettre est bien placée</li>
            <li>Rond jaune : la lettre est dans le mot, ailleurs</li>
            <li>Les accents ne comptent pas</li>
            <li>Défis : une fois les essais épuisés, chaque essai en plus ajoute 30 s au chrono</li>
        </ul>
    );

    return (
        <WordGameShell
            challenge={challenge}
            className="devimot" gameCode={CODE} gameName="Devimot" flow={flow} clock={lostClock ?? flow.clock} rules={rules}
            info={puzzle ? (
                <>
                    <p><strong>{puzzle.length}</strong> lettres</p>
                    <p>Essai <strong>{playing ? used + 1 : used}</strong> / {puzzle.maxAttempts}</p>
                    <p className="word-hint">Tape ton mot au clavier puis valide avec Entrée. Un mot refusé ne coûte pas d'essai.</p>
                </>
            ) : <p>–</p>}
            history={{canUndo: playing && !busy && past.length > 0, canRedo: playing && !busy && future.length > 0, onUndo: undo, onRedo: redo}}
            settings={
                <WordSettingsPopup open={flow.showSettings && !challenge.challenge} load={devimotService.getSettings} onGenerate={handleGenerate}
                                   resume={resumable ? {elapsedMs: resumable.elapsedMs, onResume: handleResume} : undefined}
                                   sizeLegend="Longueur du mot" sizeLabel={s => `${s} lettres`}
                                   amountLabel="Essais" easierWhenHigher/>
            }
        >
            {puzzle && (
                <>
                    <div className="word-rows" style={{"--letters": puzzle.length, "--rows": rows} as React.CSSProperties}>
                        {Array.from({length: rows}, (_, row) => {
                            const guess = puzzle.guesses[row];
                            const isCurrent = row === used && playing;
                            const text = guess?.word ?? (isCurrent ? current : "");
                            return (
                                <div key={isCurrent ? `current-${shake}` : row}
                                     className={`word-row ${isCurrent ? "current" : ""} ${isCurrent && shake ? "shake" : ""}`}
                                     aria-label={guess ? guess.word : undefined}>
                                    {Array.from({length: puzzle.length}, (_, i) => {
                                        const mark = guess?.marks[i];
                                        return (
                                            <span key={i} className={`word-cell ${mark ?? ""} ${text[i] ? "filled" : ""}`}
                                                  style={{"--c": i} as React.CSSProperties}
                                                  title={mark ? MARK_LABEL[mark] : undefined}>
                                                {text[i] ?? ""}
                                            </span>
                                        );
                                    })}
                                </div>
                            );
                        })}
                    </div>

                    {answer !== null && (
                        <div className="word-lost" role="status">
                            <p>Le mot était <strong>{answer.toUpperCase()}</strong></p>
                            <button type="button" className="modal-button" onClick={flow.newGame}>Nouvelle partie</button>
                        </div>
                    )}

                    {coach.bubble}

                    {answer === null && coach.controls && <LetterKeyboard disabled={!playing || busy || coach.locked} busy={playing && busy} marks={keyMarks} {...handlers}/>}
                </>
            )}
        </WordGameShell>
    );
}
