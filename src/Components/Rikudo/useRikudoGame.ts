import {useEffect, useMemo, useRef, useState} from "react";
import {rikudoService} from "../../Services/rikudo.service.ts";
import type {RikudoCell, RikudoPuzzle} from "../../Models/rikudo.model.ts";
import type {ValidationResult} from "../PuzzleUI/useGameFlow.ts";
import {useMoveHistory} from "../PuzzleUI/useMoveHistory.ts";
import {clearSavedGame, saveGame} from "../PuzzleUI/savedGame.ts";
import {type HexBoard, hexBoard} from "./rikudoRules.ts";

// Durée totale de l'apparition des nombres donnés (ms)
const TOTAL_ANIMATION_MS = 500;

// Partie sauvegardée dans le navigateur (pour la reprendre après un rafraîchissement)
export type SavedRikudo = { gameId: string; values: RikudoCell[] };

/**
 * Logique d'une partie de Rikudo. Les cases sont dans l'ordre du plateau (voir rikudoRules.ts).
 *
 * - generate(size, emptyCells) : demande une grille au serveur et fait apparaître les nombres donnés
 *   (renvoie un message d'erreur à afficher, ou null si tout s'est bien passé)
 * - setCell(i, v) : le joueur pose un nombre ou vide une case (sans effet sur un nombre donné)
 * - validate() : envoie la grille au serveur (qui calcule l'XP si le joueur est connecté)
 * - undo() / redo() : annule / rétablit le dernier coup
 * - restore(puzzle, saved) : reprend une partie sauvegardée
 */
export function useRikudoGame(saveKey = "RIKUDO") {
    const [puzzle, setPuzzle] = useState<RikudoPuzzle | null>(null);
    const [values, setValues] = useState<RikudoCell[]>([]);
    const [revealed, setRevealed] = useState(0);
    const [isGenerating, setIsGenerating] = useState(false);
    // Taille choisie, tant que la grille demandée n'est pas arrivée (grille vide affichée à la place)
    const [loadingSize, setLoadingSize] = useState<number | null>(null);

    const gameIdRef = useRef<string | null>(null);
    const history = useMoveHistory<RikudoCell>();
    const timerRef = useRef<number | null>(null);

    const board: HexBoard | null = useMemo(() => (puzzle ? hexBoard(puzzle.radius) : null), [puzzle]);

    const stopAnimation = () => {
        if (timerRef.current !== null) window.clearInterval(timerRef.current);
        timerRef.current = null;
    };
    useEffect(() => stopAnimation, []);

    useEffect(() => {
        if (gameIdRef.current && puzzle && !isGenerating) {
            saveGame<SavedRikudo>(saveKey, {gameId: gameIdRef.current, values});
        }
    }, [values, puzzle, isGenerating, saveKey]);

    const isClue = (i: number) => puzzle !== null && puzzle.cells[i] !== null && puzzle.cells[i] !== undefined;

    const generate = async (size: number, emptyCells: number): Promise<string | null> => {
        stopAnimation();
        setIsGenerating(true);
        setLoadingSize(size);
        try {
            const {gameId, puzzle: next} = await rikudoService.generate(size, emptyCells);
            setLoadingSize(null);
            gameIdRef.current = gameId;
            setPuzzle(next);
            setValues(next.cells);
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
            console.error("Failed to generate rikudo from server", err);
            setLoadingSize(null);
            setIsGenerating(false);
            return (err as Error).message || "Erreur lors de la génération de la grille. Réessaie plus tard.";
        }
    };

    const writeCell = (i: number, v: RikudoCell) =>
        setValues(current => current.map((old, k) => (k === i ? v : old)));

    const setCell = (i: number, v: RikudoCell) => {
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

    const restore = (saved: RikudoPuzzle, data: SavedRikudo) => {
        stopAnimation();
        gameIdRef.current = data.gameId;
        setPuzzle(saved);
        setValues(saved.cells.map((clue, i) => clue ?? data.values[i] ?? null));
        setRevealed(saved.cells.length);
        setIsGenerating(false);
        history.clear();
    };

    const validate = async (): Promise<ValidationResult> => {
        if (!gameIdRef.current) return {ok: false, message: "Génère une grille avant de valider."};
        if (values.some(v => v === null)) {
            return {ok: false, message: "Le plateau doit être complètement rempli avant la validation."};
        }
        try {
            const result = await rikudoService.validate(gameIdRef.current, values as number[]);
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
        puzzle, board, values, revealed, isGenerating, isClue, generate, setCell, validate,
        undo, redo, canUndo: history.canUndo, canRedo: history.canRedo, restore,
    };
}
