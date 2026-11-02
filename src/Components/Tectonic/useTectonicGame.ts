import {useEffect, useRef, useState} from "react";
import {tectonicService} from "../../Services/tectonic.service.ts";
import type {TectonicCell, TectonicPuzzle} from "../../Models/tectonic.model.ts";
import type {ValidationResult} from "../PuzzleUI/useGameFlow.ts";
import {useMoveHistory} from "../PuzzleUI/useMoveHistory.ts";
import {clearSavedGame, saveGame} from "../PuzzleUI/savedGame.ts";
import {notesAfterPlacing, toggleNote} from "./tectonicRules.ts";

// Durée totale de l'apparition des nombres donnés (ms)
const TOTAL_ANIMATION_MS = 500;

// Partie sauvegardée dans le navigateur (pour la reprendre après un rafraîchissement)
export type SavedTectonic = { gameId: string; values: TectonicCell[]; notes?: number[] };

/**
 * Logique d'une partie de Tectonic. La grille est gardée à plat (index = ligne * largeur + colonne).
 *
 * - generate(size, emptyCells) : demande une grille au serveur et fait apparaître les nombres donnés
 *   (renvoie un message d'erreur à afficher, ou null si tout s'est bien passé)
 * - setCell(i, v) : le joueur pose un nombre ou vide une case (sans effet sur un nombre donné)
 * - validate() : envoie la grille au serveur (qui calcule l'XP si le joueur est connecté)
 * - toggleNoteAt(i, n) : ajoute / retire une note au crayon (case vide seulement)
 * - undo() / redo() : annule / rétablit le dernier coup
 * - restore(puzzle, saved) : reprend une partie sauvegardée
 */
export function useTectonicGame(saveKey = "TECTONIC") {
    const [puzzle, setPuzzle] = useState<TectonicPuzzle | null>(null);
    const [values, setValues] = useState<TectonicCell[]>([]);
    // Notes au crayon : un masque de bits par case (bit n = nombre n noté)
    const [notes, setNotes] = useState<number[]>([]);
    const [revealed, setRevealed] = useState(0);
    const [isGenerating, setIsGenerating] = useState(false);

    const gameIdRef = useRef<string | null>(null);
    const history = useMoveHistory<TectonicCell>();
    const timerRef = useRef<number | null>(null);

    const stopAnimation = () => {
        if (timerRef.current !== null) window.clearInterval(timerRef.current);
        timerRef.current = null;
    };
    useEffect(() => stopAnimation, []);

    useEffect(() => {
        if (gameIdRef.current && puzzle && !isGenerating) {
            saveGame<SavedTectonic>(saveKey, {gameId: gameIdRef.current, values, notes});
        }
    }, [values, notes, puzzle, isGenerating, saveKey]);

    const isClue = (i: number) => puzzle !== null && puzzle.cells[i] !== null && puzzle.cells[i] !== undefined;

    const generate = async (size: number, emptyCells: number): Promise<string | null> => {
        stopAnimation();
        setIsGenerating(true);
        try {
            const {gameId, puzzle: next} = await tectonicService.generate(size, emptyCells);
            gameIdRef.current = gameId;
            setPuzzle(next);
            setValues(next.cells);
            setNotes(Array<number>(next.cells.length).fill(0));
            history.clear();
            setRevealed(0);

            const step = Math.max(1, Math.round(next.cells.length / (TOTAL_ANIMATION_MS / 16)));
            let shown = 0;
            timerRef.current = window.setInterval(() => {
                shown = Math.min(next.cells.length, shown + step);
                setRevealed(shown);
                if (shown === next.cells.length) {
                    stopAnimation();
                    setIsGenerating(false);
                }
            }, 16);
            return null;
        } catch (err) {
            console.error("Failed to generate tectonic from server", err);
            setIsGenerating(false);
            return (err as Error).message || "Erreur lors de la génération de la grille. Réessaie plus tard.";
        }
    };

    // Un nombre posé efface les notes de la case et retire ce nombre des notes de sa zone et des cases autour
    const writeCell = (i: number, v: TectonicCell) => {
        setValues(current => current.map((old, k) => (k === i ? v : old)));
        if (puzzle) setNotes(current => notesAfterPlacing(current, i, v, puzzle));
    };

    const toggleNoteAt = (i: number, digit: number) => {
        // Pas de note sur un nombre donné ni sur une case déjà remplie
        if (isClue(i) || isGenerating || values[i] !== null) return;
        setNotes(current => current.map((mask, k) => (k === i ? toggleNote(mask, digit) : mask)));
    };

    const setCell = (i: number, v: TectonicCell) => {
        if (isClue(i) || isGenerating || values[i] === v) return;
        history.record({index: i, before: values[i] ?? null, after: v});
        writeCell(i, v);
    };

    const undo = () => {
        const move = history.undo();
        if (move) writeCell(move.index, move.before);
        return move?.index ?? null;
    };

    const redo = () => {
        const move = history.redo();
        if (move) writeCell(move.index, move.after);
        return move?.index ?? null;
    };

    const restore = (saved: TectonicPuzzle, data: SavedTectonic) => {
        stopAnimation();
        gameIdRef.current = data.gameId;
        setPuzzle(saved);
        setValues(saved.cells.map((clue, i) => clue ?? data.values[i] ?? null));
        setNotes(data.notes?.length === saved.cells.length ? data.notes : Array<number>(saved.cells.length).fill(0));
        setRevealed(saved.cells.length);
        setIsGenerating(false);
        history.clear();
    };

    const validate = async (): Promise<ValidationResult> => {
        if (!gameIdRef.current) return {ok: false, message: "Génère une grille avant de valider."};
        if (values.some(v => v === null)) {
            return {ok: false, message: "La grille doit être complètement remplie avant la validation."};
        }
        try {
            const result = await tectonicService.validate(gameIdRef.current, values as number[]);
            gameIdRef.current = null;
            clearSavedGame(saveKey);
            return {ok: true, result};
        } catch (err) {
            console.error("Validation failed", err);
            return {ok: false, message: (err as Error).message || "La validation a échoué, réessaie."};
        }
    };

    return {
        puzzle, values, notes, toggleNoteAt, revealed, isGenerating, isClue, generate, setCell, validate,
        undo, redo, canUndo: history.canUndo, canRedo: history.canRedo, restore,
    };
}
