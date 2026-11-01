import {useCallback, useEffect, useRef, useState} from "react";
import {gameService} from "../../Services/game.service.ts";
import {countDigits, notesAfterPlacing, parseGridValues, sudokuConflicts, toggleNote} from "./gridValues.ts";
import {isPeer} from "../PuzzleUI/gridGeometry.ts";
import {useMoveHistory} from "../PuzzleUI/useMoveHistory.ts";
import {clearSavedGame, saveGame} from "../PuzzleUI/savedGame.ts";
import type {ValidationResult} from "../PuzzleUI/useGameFlow.ts";

// Durée totale de l'animation de remplissage de la grille (ms)
const TOTAL_ANIMATION_MS = 500;

const sleep = (ms: number) => new Promise<void>(res => setTimeout(res, ms));

const EMPTY_COUNTS = Array<number>(10).fill(0);

// Écrit un chiffre (ou vide la case) comme une saisie au clavier :
// l'évènement "input" met à jour compteur, surbrillance et historique
function writeCell(el: HTMLInputElement, value: number | string | null) {
    el.value = value === null ? "" : String(value);
    el.dispatchEvent(new Event("input", {bubbles: true}));
}

// Affiche une case : chiffre donné (non sélectionnable) ou case à remplir
function paintCell(el: HTMLInputElement, value: string, isClue: boolean) {
    el.value = value;
    el.readOnly = isClue;
    el.disabled = false;
    // Les indices ne sont pas sélectionnables (ni au clic, ni avec Tab)
    el.tabIndex = isClue ? -1 : 0;
    el.classList.toggle('prefilled', isClue);
}

// Partie sauvegardée dans le navigateur (pour la reprendre après un rafraîchissement)
export type SavedSudoku = { gameId: string; values: string[]; notes: number[] };
const GAME_CODE = "SUDOKU";

// Copie des valeurs de la grille, pour connaître la valeur "avant" d'une saisie
function setSnapshot(snapshot: string[], index: number, value: string) {
    snapshot[index] = value;
}


/**
 * Logique d'une partie de Sudoku.
 *
 * Les 81 cases sont des <input> non contrôlés, manipulés directement via `inputs`
 * (plus simple pour l'animation case par case et la saisie au clavier).
 *
 * - generate(clues) : demande une grille au serveur et l'affiche case par case
 *   (renvoie un message d'erreur à afficher, ou null si tout s'est bien passé)
 * - validate() : envoie la grille remplie au serveur (qui calcule l'XP si connecté)
 * - digitCounts[n] : nombre de n présents dans la grille (indices + saisies)
 * - selectedDigit / toggleDigit(n) : chiffre surligné en continu (choisi dans le panneau)
 * - setHoverDigit(n) : surbrillance temporaire (case survolée / en cours d'édition),
 *   prioritaire sur le chiffre sélectionné tant qu'elle est active
 * - onCellInput(i) : à appeler quand le joueur modifie la case i
 * - undo() / redo() : annule / rétablit le dernier coup (canUndo / canRedo pour les boutons)
 * - conflicts : cases qui contredisent les règles, affichées en rouge si `showErrors`
 * - restore(grid, saved) : reprend une partie sauvegardée (grille de départ renvoyée par le serveur)
 * - notes / notesMode : notes au crayon ; pressDigit(n) remplit la case sélectionnée,
 *   ou y ajoute / retire une note en mode notes
 * - setSelectedCell(i) : case sélectionnée ; sa ligne, sa colonne et son bloc 3×3 sont surlignés
 * - fillSelected(n) : remplit (ou vide avec null) la case sélectionnée ; false si aucune case modifiable
 */
export function useSudokuGame(showErrors: boolean, saveKey: string = GAME_CODE) {
    // Les 81 inputs de la grille (index = ligne * 9 + colonne)
    const inputs = useRef<HTMLInputElement[]>([]);

    // Incrémenté à chaque génération : permet d'interrompre une animation en cours
    const generationRef = useRef(0);

    // Identifiant de la partie, donné par le serveur à la génération (requis pour valider)
    const gameIdRef = useRef<string | null>(null);

    const [isGenerating, setIsGenerating] = useState(false);
    const [digitCounts, setDigitCounts] = useState<number[]>(EMPTY_COUNTS);
    const [selectedDigit, setSelectedDigit] = useState<number | null>(null);
    const [hoverDigit, setHoverDigit] = useState<number | null>(null);
    const [selectedCell, setSelectedCell] = useState<number | null>(null);
    const [conflicts, setConflicts] = useState<Set<number>>(() => new Set());
    // Notes au crayon : un masque de bits par case (bit n = chiffre n noté)
    const [notes, setNotes] = useState<number[]>(() => Array<number>(81).fill(0));
    const [notesMode, setNotesMode] = useState(false);

    const highlight = hoverDigit ?? selectedDigit;

    const history = useMoveHistory<string>();
    // Dernières valeurs connues des cases (pour l'historique)
    const snapshotRef = useRef<string[]>(Array<string>(81).fill(""));
    // Vrai pendant qu'on applique un annuler / rétablir (ce coup-là ne doit pas être enregistré)
    const applyingHistoryRef = useRef(false);

    const readValues = () => Array.from({length: 81}, (_, i) => inputs.current[i]?.value ?? '');

    const recount = useCallback(() => {
        const values = readValues();
        setDigitCounts(countDigits(values));
        setConflicts(sudokuConflicts(values));
    }, []);

    // Cases en conflit en rouge (si l'option est active)
    useEffect(() => {
        inputs.current.forEach((el, i) => {
            if (!el) return;
            el.classList.toggle('conflict', showErrors && conflicts.has(i));
        });
    }, [conflicts, showErrors]);

    // Sauvegarde la partie en cours dans le navigateur
    const save = (currentNotes: number[]) => {
        if (gameIdRef.current) saveGame<SavedSudoku>(saveKey, {gameId: gameIdRef.current, values: readValues(), notes: currentNotes});
    };

    const onCellInput = (index: number) => {
        const after = inputs.current[index]?.value ?? "";
        const before = snapshotRef.current[index] ?? "";
        if (!applyingHistoryRef.current) history.record({index, before, after});
        setSnapshot(snapshotRef.current, index, after);
        // Un chiffre posé efface les notes de la case et retire ce chiffre des notes voisines
        const nextNotes = after !== before ? notesAfterPlacing(notes, index, after === "" ? null : Number(after)) : notes;
        if (nextNotes !== notes) setNotes(nextNotes);
        recount();
        save(nextNotes);
    };

    const toggleNoteAt = (index: number, digit: number) => {
        const el = inputs.current[index];
        // Pas de note sur un indice ni sur une case déjà remplie
        if (!el || el.readOnly || el.disabled || el.value !== "") return;
        const nextNotes = notes.map((mask, i) => (i === index ? toggleNote(mask, digit) : mask));
        setNotes(nextNotes);
        save(nextNotes);
    };

    const applyMove = (index: number, value: string) => {
        const el = inputs.current[index];
        if (!el) return;
        applyingHistoryRef.current = true;
        writeCell(el, value);
        applyingHistoryRef.current = false;
        el.focus();
    };

    const undo = () => {
        const move = history.undo();
        if (move) applyMove(move.index, move.before);
    };

    const redo = () => {
        const move = history.redo();
        if (move) applyMove(move.index, move.after);
    };

    // Surligne les cases contenant le chiffre actif.
    // Relancé aussi quand les chiffres changent, pour suivre les nouvelles saisies.
    useEffect(() => {
        const target = highlight === null ? null : String(highlight);
        inputs.current.forEach((el) => {
            if (!el) return;
            el.classList.toggle('same-number-highlight', target !== null && el.value === target);
        });
    }, [highlight, digitCounts]);

    // Surligne la ligne, la colonne et le bloc 3×3 de la case sélectionnée
    useEffect(() => {
        inputs.current.forEach((el, i) => {
            if (!el) return;
            el.classList.toggle('peer-highlight', selectedCell !== null && isPeer(selectedCell, i, 9, 3));
        });
    }, [selectedCell]);

    const toggleDigit = (n: number) => setSelectedDigit(current => (current === n ? null : n));

    const fillSelected = (n: number | null): boolean => {
        const el = selectedCell === null ? undefined : inputs.current[selectedCell];
        if (!el || el.readOnly || el.disabled) return false;
        writeCell(el, n);
        return true;
    };

    // Chiffre choisi dans le panneau : remplit la case sélectionnée (ou y note le chiffre en mode notes)
    const pressDigit = (n: number): boolean => {
        const el = selectedCell === null ? undefined : inputs.current[selectedCell];
        if (!el || el.readOnly || el.disabled) return false;
        if (notesMode) toggleNoteAt(selectedCell!, n);
        else writeCell(el, n);
        return true;
    };

    const generate = async (cluesCount: number): Promise<string | null> => {
        setHoverDigit(null);
        setSelectedDigit(null);
        setDigitCounts(EMPTY_COUNTS);
        setIsGenerating(true);

        generationRef.current += 1;
        const genId = generationRef.current;

        try {
            const {gameId, grid} = await gameService.generateSudoku(cluesCount);
            gameIdRef.current = gameId;

            // Vide et bloque toutes les cases pendant l'animation
            inputs.current.forEach((el) => {
                if (!el) return;
                el.value = "";
                el.readOnly = true;
                el.disabled = true;
                el.tabIndex = -1;
                el.classList.remove('prefilled', 'same-number-highlight');
            });

            // Remplit les cases une par une (ligne par ligne)
            const values = grid.flat();
            const delayPerCell = Math.max(4, Math.round(TOTAL_ANIMATION_MS / values.length));

            for (let idx = 0; idx < values.length; idx++) {
                // Une nouvelle génération a démarré : on abandonne celle-ci
                if (genId !== generationRef.current) return null;

                const el = inputs.current[idx];
                if (!el) continue;

                const val = values[idx];
                const isClue = val !== 0;
                paintCell(el, isClue ? String(val) : "", isClue);

                await sleep(delayPerCell);
            }

            recount();
            // Nouvelle partie : historique et notes vides, copie des valeurs à jour
            snapshotRef.current = readValues();
            history.clear();
            const emptyNotes = Array<number>(81).fill(0);
            setNotes(emptyNotes);
            save(emptyNotes);
            return null;
        } catch (err) {
            console.error('Failed to generate sudoku from server', err);
            return (err as Error).message || 'Erreur lors de la génération de la grille. Réessaie plus tard.';
        } finally {
            if (generationRef.current === genId) setIsGenerating(false);
        }
    };

    // Reprend une partie sauvegardée : chiffres donnés (serveur) + saisies et notes (navigateur)
    const restore = (grid: number[][], saved: SavedSudoku) => {
        generationRef.current += 1;
        gameIdRef.current = saved.gameId;
        grid.flat().forEach((clue, idx) => {
            const el = inputs.current[idx];
            if (!el) return;
            paintCell(el, clue !== 0 ? String(clue) : (saved.values[idx] ?? ""), clue !== 0);
        });
        snapshotRef.current = readValues();
        history.clear();
        setNotes(saved.notes?.length === 81 ? saved.notes : Array<number>(81).fill(0));
        setSelectedDigit(null);
        setIsGenerating(false);
        recount();
    };

    const validate = async (): Promise<ValidationResult> => {
        if (!gameIdRef.current) {
            return {ok: false, message: 'Génère une grille avant de valider.'};
        }

        const grid = parseGridValues(readValues());
        if (!grid) {
            return {ok: false, message: 'La grille doit être complètement remplie avec des chiffres 1-9 avant la validation.'};
        }

        try {
            const result = await gameService.validateSudoku(gameIdRef.current, grid);
            // Partie terminée : le serveur ne l'acceptera plus
            gameIdRef.current = null;
            clearSavedGame(saveKey);
            return {ok: true, result};
        } catch (err) {
            console.error('Validation failed', err);
            return {ok: false, message: (err as Error).message || 'La validation a échoué, réessaie.'};
        }
    };

    return {
        inputs,
        isGenerating,
        generate,
        validate,
        digitCounts,
        selectedDigit,
        toggleDigit,
        fillSelected,
        pressDigit,
        restore,
        notes,
        notesMode,
        setNotesMode,
        toggleNoteAt,
        setHoverDigit,
        setSelectedCell,
        onCellInput,
        undo,
        redo,
        canUndo: history.canUndo,
        canRedo: history.canRedo,
        conflicts,
    };
}
