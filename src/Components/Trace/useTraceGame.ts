import {useEffect, useMemo, useRef, useState} from "react";
import {traceService} from "../../Services/trace.service.ts";
import type {TracePuzzle} from "../../Models/trace.model.ts";
import type {ValidationResult} from "../PuzzleUI/useGameFlow.ts";
import {clearSavedGame, saveGame} from "../PuzzleUI/savedGame.ts";
import {enterCell, startCell, traceSolution, wallSet} from "./traceRules.ts";

// Partie sauvegardée dans le navigateur (pour la reprendre après un rafraîchissement) : le chemin tracé
export type SavedTrace = { gameId: string; path: number[] };

/**
 * Logique d'une partie de Tracé.
 *
 * - generate(size, hints) : demande une grille au serveur (renvoie un message d'erreur, ou null)
 * - path : cases du chemin dans l'ordre (commence toujours au 1)
 * - begin() / enter(cell) / end() : un geste (appui, glissé, relâché) ; annuler défait un geste entier
 * - solution : le chemin s'il est complet et juste
 * - validate() : envoie le chemin au serveur (qui calcule l'XP si le joueur est connecté)
 * - clear() : efface tout le chemin (sauf le 1)
 * - undo() / redo() : annule / rétablit le dernier geste
 * - restore(puzzle, saved) : reprend une partie sauvegardée
 */
export function useTraceGame(saveKey = "TRACE") {
    const [puzzle, setPuzzle] = useState<TracePuzzle | null>(null);
    const [path, setPath] = useState<number[]>([]);
    const [isGenerating, setIsGenerating] = useState(false);
    const [loadingSize, setLoadingSize] = useState<number | null>(null);
    // chemins avant chaque geste (annuler) et chemins annulés (rétablir)
    const [past, setPast] = useState<number[][]>([]);
    const [future, setFuture] = useState<number[][]>([]);
    const gestureStart = useRef<number[] | null>(null);
    const gameIdRef = useRef<string | null>(null);

    const walls = useMemo(() => (puzzle ? wallSet(puzzle) : new Set<string>()), [puzzle]);
    const solution = useMemo(() => traceSolution(puzzle, path), [puzzle, path]);

    useEffect(() => {
        if (gameIdRef.current && puzzle && !isGenerating) saveGame<SavedTrace>(saveKey, {gameId: gameIdRef.current, path});
    }, [path, puzzle, isGenerating, saveKey]);

    const reset = (p: TracePuzzle, start: number[]) => {
        setPuzzle(p);
        setPath(start);
        setPast([]);
        setFuture([]);
    };

    const generate = async (size: number, hints: number): Promise<string | null> => {
        setIsGenerating(true);
        setLoadingSize(size);
        try {
            const {gameId, puzzle: next} = await traceService.generate(size, hints);
            setLoadingSize(null);
            gameIdRef.current = gameId;
            reset(next, [startCell(next)]);
            return null;
        } catch (err) {
            console.error("Failed to generate trace from server", err);
            setLoadingSize(null);
            return (err as Error).message || "Erreur lors de la génération de la grille. Réessaie plus tard.";
        } finally {
            setIsGenerating(false);
        }
    };

    // Geste : on retient le chemin du départ ; à la fin, s'il a changé, il rejoint l'historique
    const begin = () => {
        gestureStart.current = path;
    };

    const enter = (cell: number) => {
        if (!puzzle) return;
        setPath(current => enterCell(puzzle, walls, current, cell));
    };

    const end = () => {
        const before = gestureStart.current;
        gestureStart.current = null;
        if (before && before.join() !== path.join()) {
            setPast(p => [...p, before]);
            setFuture([]);
        }
    };

    // Un pas au clavier (flèches) : un geste à lui seul
    const step = (cell: number) => {
        if (!puzzle) return;
        const next = enterCell(puzzle, walls, path, cell);
        if (next.join() === path.join()) return;
        setPast(p => [...p, path]);
        setFuture([]);
        setPath(next);
    };

    // Tout effacer : le chemin revient au 1 (annulable)
    const clear = () => {
        if (!puzzle || path.length <= 1) return;
        setPast(p => [...p, path]);
        setFuture([]);
        setPath([startCell(puzzle)]);
    };

    const undo = () => {
        const previous = past[past.length - 1];
        if (!previous) return;
        setPast(p => p.slice(0, -1));
        setFuture(f => [path, ...f]);
        setPath(previous);
    };

    const redo = () => {
        const next = future[0];
        if (!next) return;
        setFuture(f => f.slice(1));
        setPast(p => [...p, path]);
        setPath(next);
    };

    const restore = (saved: TracePuzzle, data: SavedTrace) => {
        gameIdRef.current = data.gameId;
        const start = startCell(saved);
        const valid = Array.isArray(data.path) && data.path[0] === start ? data.path : [start];
        reset(saved, valid);
        setIsGenerating(false);
    };

    const validate = async (): Promise<ValidationResult> => {
        if (!gameIdRef.current) return {ok: false, message: "Génère une grille avant de valider."};
        if (!solution) return {ok: false, message: "Le chemin ne passe pas encore par toutes les cases."};
        try {
            const result = await traceService.validate(gameIdRef.current, solution);
            gameIdRef.current = null;
            clearSavedGame(saveKey);
            return {ok: true, result};
        } catch (err) {
            console.error("Validation failed", err);
            return {ok: false, message: (err as Error).message || "La validation a échoué, réessaie."};
        }
    };

    return {
        loadingSize, puzzle, path, walls, solution, isGenerating, generate, begin, enter, end, step, clear, validate,
        undo, redo, canUndo: past.length > 0, canRedo: future.length > 0, restore,
    };
}
