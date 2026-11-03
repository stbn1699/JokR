import {useEffect, useMemo, useRef, useState} from "react";
import {queensService} from "../../Services/queens.service.ts";
import type {QueensPuzzle} from "../../Models/queens.model.ts";
import type {ValidationResult} from "../PuzzleUI/useGameFlow.ts";
import {useMoveHistory} from "../PuzzleUI/useMoveHistory.ts";
import {clearSavedGame, saveGame} from "../PuzzleUI/savedGame.ts";
import {CROSS, EMPTY, type Mark, nextMark, QUEEN, queensSolution} from "./queensRules.ts";

// Partie sauvegardée dans le navigateur (pour la reprendre après un rafraîchissement) : croix et dames posées
export type SavedQueens = { gameId: string; marks: Mark[] };

/**
 * Logique d'une partie de Queens.
 *
 * - generate(size, hints) : demande une grille au serveur (renvoie un message d'erreur, ou null)
 * - cycle(i) : appui sur une case, vide → croix → dame → vide (sans effet sur une dame donnée)
 * - setMark(i, mark) : pose directement une croix, une dame ou vide la case
 * - marks : contenu de chaque case (dames données comprises), solution : cases des dames si c'est gagné
 * - validate() : envoie les dames au serveur (qui calcule l'XP si le joueur est connecté)
 * - undo() / redo() : annule / rétablit le dernier coup
 * - restore(puzzle, saved) : reprend une partie sauvegardée
 */
export function useQueensGame(saveKey = "QUEENS") {
    const [puzzle, setPuzzle] = useState<QueensPuzzle | null>(null);
    const [marks, setMarks] = useState<Mark[]>([]);
    const [isGenerating, setIsGenerating] = useState(false);
    // Taille choisie, tant que la grille demandée n'est pas arrivée (grille vide affichée à la place)
    const [loadingSize, setLoadingSize] = useState<number | null>(null);

    const gameIdRef = useRef<string | null>(null);
    const history = useMoveHistory<Mark>();

    const hintSet = useMemo(() => new Set(puzzle?.queens ?? []), [puzzle]);
    const isHint = (i: number) => hintSet.has(i);
    const solution = useMemo(() => queensSolution(marks, puzzle), [marks, puzzle]);

    useEffect(() => {
        if (gameIdRef.current && puzzle && !isGenerating) {
            saveGame<SavedQueens>(saveKey, {gameId: gameIdRef.current, marks});
        }
    }, [marks, puzzle, isGenerating, saveKey]);

    const startMarks = (p: QueensPuzzle): Mark[] =>
        Array.from({length: p.size * p.size}, (_, i) => (p.queens.includes(i) ? QUEEN : EMPTY));

    const generate = async (size: number, hints: number): Promise<string | null> => {
        setIsGenerating(true);
        setLoadingSize(size);
        try {
            const {gameId, puzzle: next} = await queensService.generate(size, hints);
            setLoadingSize(null);
            gameIdRef.current = gameId;
            setPuzzle(next);
            setMarks(startMarks(next));
            history.clear();
            return null;
        } catch (err) {
            console.error("Failed to generate queens from server", err);
            setLoadingSize(null);
            return (err as Error).message || "Erreur lors de la génération de la grille. Réessaie plus tard.";
        } finally {
            setIsGenerating(false);
        }
    };

    const writeMark = (i: number, mark: Mark) => setMarks(current => current.map((old, k) => (k === i ? mark : old)));

    const setMark = (i: number, mark: Mark) => {
        if (!puzzle || isGenerating || isHint(i) || marks[i] === mark) return;
        history.record({index: i, before: marks[i] ?? EMPTY, after: mark});
        writeMark(i, mark);
    };

    const cycle = (i: number) => setMark(i, nextMark(marks[i] ?? EMPTY));

    // Glissé : met des croix sur les cases vides traversées
    const crossIfEmpty = (i: number) => {
        if (marks[i] === EMPTY) setMark(i, CROSS);
    };

    const undo = () => {
        const move = history.undo();
        if (move) writeMark(move.index, move.before);
        return move?.index ?? null;
    };

    const redo = () => {
        const move = history.redo();
        if (move) writeMark(move.index, move.after);
        return move?.index ?? null;
    };

    const restore = (saved: QueensPuzzle, data: SavedQueens) => {
        gameIdRef.current = data.gameId;
        setPuzzle(saved);
        const start = startMarks(saved);
        setMarks(data.marks?.length === start.length ? data.marks.map((m, i) => (saved.queens.includes(i) ? QUEEN : m)) : start);
        setIsGenerating(false);
        history.clear();
    };

    const validate = async (): Promise<ValidationResult> => {
        if (!gameIdRef.current) return {ok: false, message: "Génère une grille avant de valider."};
        if (!solution) return {ok: false, message: "Toutes les dames ne sont pas encore placées."};
        try {
            const result = await queensService.validate(gameIdRef.current, solution);
            gameIdRef.current = null;
            clearSavedGame(saveKey);
            return {ok: true, result};
        } catch (err) {
            console.error("Validation failed", err);
            return {ok: false, message: (err as Error).message || "La validation a échoué, réessaie."};
        }
    };

    return {
        loadingSize,
        puzzle, marks, isHint, solution, isGenerating, generate, cycle, setMark, crossIfEmpty, validate,
        undo, redo, canUndo: history.canUndo, canRedo: history.canRedo, restore,
    };
}
