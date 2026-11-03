import {useEffect, useMemo, useRef, useState} from "react";
import {bineroService} from "../../Services/binero.service.ts";
import type {BineroCell} from "../../Models/bineroSettings.model.ts";
import type {ValidationResult} from "../PuzzleUI/useGameFlow.ts";
import {useMoveHistory} from "../PuzzleUI/useMoveHistory.ts";
import {clearSavedGame, saveGame} from "../PuzzleUI/savedGame.ts";

// Durée totale de l'apparition des chiffres donnés (ms)
const TOTAL_ANIMATION_MS = 500;


/**
 * Logique d'une partie de Binero. La grille est gardée à plat (index = ligne * size + colonne).
 *
 * - generate(size, emptyCells) : demande une grille au serveur et fait apparaître les chiffres donnés
 *   (renvoie un message d'erreur à afficher, ou null si tout s'est bien passé)
 * - setCell(i, v) : le joueur pose 0, 1 ou vide une case (sans effet sur un chiffre donné)
 * - validate() : envoie la grille au serveur (qui calcule l'XP si le joueur est connecté)
 * - counts : nombre de 0 et de 1 posés
 * - undo() / redo() : annule / rétablit le dernier coup (canUndo / canRedo pour les boutons)
 * - restore(grid, saved) : reprend une partie sauvegardée (grille de départ renvoyée par le serveur)
 */
// Partie sauvegardée dans le navigateur (pour la reprendre après un rafraîchissement)
export type SavedBinero = { gameId: string; size: number; values: BineroCell[] };
const GAME_CODE = "BINERO";

export function useBineroGame(saveKey: string = GAME_CODE) {
    const [size, setSize] = useState(0);
    // Chiffres donnés au départ (null = case à remplir)
    const [clues, setClues] = useState<BineroCell[]>([]);
    // Contenu actuel de la grille (chiffres donnés + saisies du joueur)
    const [values, setValues] = useState<BineroCell[]>([]);
    // Nombre de cases déjà "apparues" pendant l'animation
    const [revealed, setRevealed] = useState(0);
    const [isGenerating, setIsGenerating] = useState(false);
    // Taille choisie, tant que la grille demandée n'est pas arrivée (grille vide affichée à la place)
    const [loadingSize, setLoadingSize] = useState<number | null>(null);

    const gameIdRef = useRef<string | null>(null);
    const history = useMoveHistory<BineroCell>();
    const timerRef = useRef<number | null>(null);

    const stopAnimation = () => {
        if (timerRef.current !== null) window.clearInterval(timerRef.current);
        timerRef.current = null;
    };
    useEffect(() => stopAnimation, []);

    // Sauvegarde la partie en cours dans le navigateur à chaque coup
    useEffect(() => {
        if (gameIdRef.current && size > 0 && !isGenerating) {
            saveGame<SavedBinero>(saveKey, {gameId: gameIdRef.current, size, values});
        }
    }, [values, size, isGenerating, saveKey]);

    const counts = useMemo(() => ({
        0: values.filter(v => v === 0).length,
        1: values.filter(v => v === 1).length,
    }), [values]);

    const isClue = (i: number) => clues[i] !== null && clues[i] !== undefined;

    const generate = async (newSize: number, emptyCells: number): Promise<string | null> => {
        stopAnimation();
        setIsGenerating(true);
        setLoadingSize(newSize);
        try {
            const {gameId, grid} = await bineroService.generate(newSize, emptyCells);
            setLoadingSize(null);
            gameIdRef.current = gameId;
            const flat = grid.flat();
            setSize(newSize);
            setClues(flat);
            setValues(flat);
            history.clear();
            setRevealed(0);

            // Les cases apparaissent une par une (ligne par ligne)
            const step = Math.max(1, Math.round(flat.length / (TOTAL_ANIMATION_MS / 16)));
            let shown = 0;
            timerRef.current = window.setInterval(() => {
                shown = Math.min(flat.length, shown + step);
                setRevealed(shown);
                if (shown === flat.length) {
                    stopAnimation();
                    setIsGenerating(false);
                }
            }, 16);
            return null;
        } catch (err) {
            console.error("Failed to generate binero from server", err);
            setLoadingSize(null);
            setIsGenerating(false);
            return (err as Error).message || "Erreur lors de la génération de la grille. Réessaie plus tard.";
        }
    };

    const writeCell = (i: number, v: BineroCell) =>
        setValues(current => current.map((old, k) => (k === i ? v : old)));

    const setCell = (i: number, v: BineroCell) => {
        if (isClue(i) || isGenerating) return;
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

    // Reprend une partie sauvegardée : chiffres donnés (serveur) + saisies du joueur (navigateur)
    const restore = (grid: BineroCell[][], saved: SavedBinero) => {
        stopAnimation();
        const flat = grid.flat();
        gameIdRef.current = saved.gameId;
        setSize(grid.length);
        setClues(flat);
        setValues(flat.map((clue, i) => clue ?? saved.values[i] ?? null));
        setRevealed(flat.length);
        setIsGenerating(false);
        history.clear();
    };

    const validate = async (): Promise<ValidationResult> => {
        if (!gameIdRef.current) return {ok: false, message: "Génère une grille avant de valider."};
        if (values.some(v => v === null)) {
            return {ok: false, message: "La grille doit être complètement remplie avant la validation."};
        }

        const grid = Array.from({length: size}, (_, r) => values.slice(r * size, (r + 1) * size) as number[]);
        try {
            const result = await bineroService.validate(gameIdRef.current, grid);
            // Partie terminée : le serveur ne l'acceptera plus
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
        size, clues, values, revealed, isGenerating, counts, isClue, generate, setCell, validate,
        undo, redo, canUndo: history.canUndo, canRedo: history.canRedo, restore,
    };
}
