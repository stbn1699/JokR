import {useEffect, useMemo, useRef, useState} from "react";
import {galaxiesService} from "../../Services/galaxies.service.ts";
import type {GalaxiesPuzzle} from "../../Models/galaxies.model.ts";
import type {ValidationResult} from "../PuzzleUI/useGameFlow.ts";
import {useMoveHistory} from "../PuzzleUI/useMoveHistory.ts";
import {clearSavedGame, saveGame} from "../PuzzleUI/savedGame.ts";
import {analyzeBoard, wallCount} from "./galaxiesRules.ts";

// Partie sauvegardée dans le navigateur (pour la reprendre après un rafraîchissement) : murs posés par le joueur
export type SavedGalaxies = { gameId: string; walls: number[] };

/**
 * Logique d'une partie de Galaxies.
 *
 * - generate(size, hints) : demande une grille au serveur (renvoie un message d'erreur, ou null)
 * - toggleWall(w) : pose ou retire un mur (sans effet sur un mur donné au départ)
 * - walls : tous les murs tracés (donnés + posés), analysis : zones, couleurs, erreurs et solution
 * - validate() : envoie le découpage au serveur (qui calcule l'XP si le joueur est connecté)
 * - undo() / redo() : annule / rétablit le dernier mur posé ou retiré
 * - restore(puzzle, saved) : reprend une partie sauvegardée
 */
export function useGalaxiesGame(saveKey = "GALAXIES") {
    const [puzzle, setPuzzle] = useState<GalaxiesPuzzle | null>(null);
    // Murs posés par le joueur (un booléen par côté intérieur)
    const [placed, setPlaced] = useState<boolean[]>([]);
    const [isGenerating, setIsGenerating] = useState(false);
    // Taille choisie, tant que la grille demandée n'est pas arrivée (grille vide affichée à la place)
    const [loadingSize, setLoadingSize] = useState<number | null>(null);

    const gameIdRef = useRef<string | null>(null);
    const history = useMoveHistory<boolean>();

    const hintWalls = useMemo(() => new Set(puzzle?.walls ?? []), [puzzle]);
    const walls = useMemo(() => {
        const all = new Set(hintWalls);
        placed.forEach((on, w) => on && all.add(w));
        return all;
    }, [hintWalls, placed]);
    const analysis = useMemo(() => (puzzle ? analyzeBoard(puzzle, walls) : null), [puzzle, walls]);

    useEffect(() => {
        if (gameIdRef.current && puzzle && !isGenerating) {
            saveGame<SavedGalaxies>(saveKey, {gameId: gameIdRef.current, walls: placed.flatMap((on, w) => (on ? [w] : []))});
        }
    }, [placed, puzzle, isGenerating, saveKey]);

    const generate = async (size: number, hints: number): Promise<string | null> => {
        setIsGenerating(true);
        setLoadingSize(size);
        try {
            const {gameId, puzzle: next} = await galaxiesService.generate(size, hints);
            setLoadingSize(null);
            gameIdRef.current = gameId;
            setPuzzle(next);
            setPlaced(Array<boolean>(wallCount(next.width, next.height)).fill(false));
            history.clear();
            return null;
        } catch (err) {
            console.error("Failed to generate galaxies from server", err);
            setLoadingSize(null);
            return (err as Error).message || "Erreur lors de la génération de la grille. Réessaie plus tard.";
        } finally {
            setIsGenerating(false);
        }
    };

    const writeWall = (w: number, on: boolean) => setPlaced(current => current.map((old, k) => (k === w ? on : old)));

    const toggleWall = (w: number) => {
        if (!puzzle || isGenerating || hintWalls.has(w) || w < 0 || w >= placed.length) return;
        const before = placed[w] ?? false;
        history.record({index: w, before, after: !before});
        writeWall(w, !before);
    };

    const undo = () => {
        const move = history.undo();
        if (move) writeWall(move.index, move.before);
        return move?.index ?? null;
    };

    const redo = () => {
        const move = history.redo();
        if (move) writeWall(move.index, move.after);
        return move?.index ?? null;
    };

    const restore = (saved: GalaxiesPuzzle, data: SavedGalaxies) => {
        gameIdRef.current = data.gameId;
        setPuzzle(saved);
        const on = new Set(data.walls ?? []);
        setPlaced(Array.from({length: wallCount(saved.width, saved.height)}, (_, w) => on.has(w)));
        setIsGenerating(false);
        history.clear();
    };

    const validate = async (): Promise<ValidationResult> => {
        if (!gameIdRef.current) return {ok: false, message: "Génère une grille avant de valider."};
        if (!analysis?.solution) return {ok: false, message: "Le découpage n'est pas encore terminé."};
        try {
            const result = await galaxiesService.validate(gameIdRef.current, analysis.solution);
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
        puzzle, walls, hintWalls, analysis, isGenerating, generate, toggleWall, validate,
        undo, redo, canUndo: history.canUndo, canRedo: history.canRedo, restore,
    };
}
