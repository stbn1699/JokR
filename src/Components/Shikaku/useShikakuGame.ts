import {useEffect, useMemo, useRef, useState} from "react";
import {shikakuService} from "../../Services/shikaku.service.ts";
import type {Rect, ShikakuPuzzle} from "../../Models/shikaku.model.ts";
import type {ValidationResult} from "../PuzzleUI/useGameFlow.ts";
import {useMoveHistory} from "../PuzzleUI/useMoveHistory.ts";
import {clearSavedGame, saveGame} from "../PuzzleUI/savedGame.ts";
import {analyzeRects, rectCells, rectsOverlap, sameRect} from "./shikakuRules.ts";

// Partie sauvegardée dans le navigateur (pour la reprendre après un rafraîchissement) : rectangles posés
export type SavedShikaku = { gameId: string; rects: Rect[] };

/**
 * Logique d'une partie de Shikaku.
 *
 * - generate(size, hints) : demande une grille au serveur (renvoie un message d'erreur, ou null)
 * - drawRect(rect) : pose un rectangle (il remplace les rectangles posés qu'il chevauche ;
 *   impossible par-dessus un rectangle donné au départ)
 * - eraseAt(cell) : retire le rectangle posé qui couvre cette case
 * - rects : rectangles donnés puis posés, analysis : validité de chacun et solution
 * - validate() : envoie le découpage au serveur (qui calcule l'XP si le joueur est connecté)
 * - undo() / redo() : annule / rétablit le dernier rectangle posé ou retiré
 * - restore(puzzle, saved) : reprend une partie sauvegardée
 */
export function useShikakuGame(saveKey = "SHIKAKU") {
    const [puzzle, setPuzzle] = useState<ShikakuPuzzle | null>(null);
    // Rectangles posés par le joueur
    const [placed, setPlaced] = useState<Rect[]>([]);
    const [isGenerating, setIsGenerating] = useState(false);

    const gameIdRef = useRef<string | null>(null);
    // Un coup = l'ensemble des rectangles posés avant / après (index inutilisé)
    const history = useMoveHistory<Rect[]>();

    const hints = useMemo(() => puzzle?.rects ?? [], [puzzle]);
    const rects = useMemo(() => [...hints, ...placed], [hints, placed]);
    const analysis = useMemo(() => (puzzle ? analyzeRects(puzzle, rects) : null), [puzzle, rects]);

    useEffect(() => {
        if (gameIdRef.current && puzzle && !isGenerating) {
            saveGame<SavedShikaku>(saveKey, {gameId: gameIdRef.current, rects: placed});
        }
    }, [placed, puzzle, isGenerating, saveKey]);

    const generate = async (size: number, hintCount: number): Promise<string | null> => {
        setIsGenerating(true);
        try {
            const {gameId, puzzle: next} = await shikakuService.generate(size, hintCount);
            gameIdRef.current = gameId;
            setPuzzle(next);
            setPlaced([]);
            history.clear();
            return null;
        } catch (err) {
            console.error("Failed to generate shikaku from server", err);
            return (err as Error).message || "Erreur lors de la génération de la grille. Réessaie plus tard.";
        } finally {
            setIsGenerating(false);
        }
    };

    const commit = (next: Rect[]) => {
        history.record({index: 0, before: placed, after: next});
        setPlaced(next);
    };

    const drawRect = (rect: Rect) => {
        if (!puzzle || isGenerating) return;
        if (hints.some(h => rectsOverlap(h, rect))) return;
        if (placed.some(p => sameRect(p, rect))) return;
        commit([...placed.filter(p => !rectsOverlap(p, rect)), rect]);
    };

    const eraseAt = (cell: number) => {
        if (!puzzle || isGenerating) return;
        const next = placed.filter(p => !rectCells(p, puzzle.width).includes(cell));
        if (next.length !== placed.length) commit(next);
    };

    const undo = () => {
        const move = history.undo();
        if (move) setPlaced(move.before);
        return null;
    };

    const redo = () => {
        const move = history.redo();
        if (move) setPlaced(move.after);
        return null;
    };

    const restore = (saved: ShikakuPuzzle, data: SavedShikaku) => {
        gameIdRef.current = data.gameId;
        setPuzzle(saved);
        setPlaced(data.rects ?? []);
        setIsGenerating(false);
        history.clear();
    };

    const validate = async (): Promise<ValidationResult> => {
        if (!gameIdRef.current) return {ok: false, message: "Génère une grille avant de valider."};
        if (!analysis?.solution) return {ok: false, message: "La grille n'est pas encore entièrement découpée."};
        try {
            const result = await shikakuService.validate(gameIdRef.current, analysis.solution);
            gameIdRef.current = null;
            clearSavedGame(saveKey);
            return {ok: true, result};
        } catch (err) {
            console.error("Validation failed", err);
            return {ok: false, message: (err as Error).message || "La validation a échoué, réessaie."};
        }
    };

    return {
        puzzle, rects, hintCount: hints.length, analysis, isGenerating, generate, drawRect, eraseAt, validate,
        undo, redo, canUndo: history.canUndo, canRedo: history.canRedo, restore,
    };
}
