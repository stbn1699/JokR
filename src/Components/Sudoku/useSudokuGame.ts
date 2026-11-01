import {useCallback, useEffect, useRef, useState} from "react";
import {gameService} from "../../Services/game.service.ts";
import sounds from "../../Services/sounds.ts";
import {countDigits, parseGridValues} from "./gridValues.ts";
import {isPeer} from "../PuzzleUI/gridGeometry.ts";

// Durée totale de l'animation de remplissage de la grille (ms)
const TOTAL_ANIMATION_MS = 500;

const sleep = (ms: number) => new Promise<void>(res => setTimeout(res, ms));

const EMPTY_COUNTS = Array<number>(10).fill(0);

export type ValidationResult =
    | { ok: true; xp: number | undefined }
    | { ok: false; message: string };

/**
 * Logique d'une partie de Sudoku.
 *
 * Les 81 cases sont des <input> non contrôlés, manipulés directement via `inputs`
 * (plus simple pour l'animation case par case et la saisie au clavier).
 *
 * - generate(clues) : demande une grille au serveur et l'affiche case par case
 * - validate() : envoie la grille remplie au serveur (qui calcule l'XP si connecté)
 * - digitCounts[n] : nombre de n présents dans la grille (indices + saisies)
 * - selectedDigit / toggleDigit(n) : chiffre surligné en continu (choisi dans le panneau)
 * - setHoverDigit(n) : surbrillance temporaire (case survolée / en cours d'édition),
 *   prioritaire sur le chiffre sélectionné tant qu'elle est active
 * - onCellInput() : à appeler quand le joueur modifie une case
 * - setSelectedCell(i) : case sélectionnée ; sa ligne, sa colonne et son bloc 3×3 sont surlignés
 */
export function useSudokuGame() {
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

    const highlight = hoverDigit ?? selectedDigit;

    const readValues = () => Array.from({length: 81}, (_, i) => inputs.current[i]?.value ?? '');

    const recount = useCallback(() => setDigitCounts(countDigits(readValues())), []);

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

    const generate = async (cluesCount: number) => {
        setHoverDigit(null);
        setSelectedDigit(null);
        setDigitCounts(EMPTY_COUNTS);
        setIsGenerating(true);

        generationRef.current += 1;
        const genId = generationRef.current;

        try {
            const {gameId, grid} = await gameService.generateSudoku(cluesCount);
            gameIdRef.current = gameId;
            sounds.pop();

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
                if (genId !== generationRef.current) return;

                const el = inputs.current[idx];
                if (!el) continue;

                const val = values[idx];
                const isClue = val !== 0;
                el.value = isClue ? String(val) : "";
                el.readOnly = isClue;
                el.disabled = false;
                // Les indices ne sont pas sélectionnables (ni au clic, ni avec Tab)
                el.tabIndex = isClue ? -1 : 0;
                el.classList.toggle('prefilled', isClue);

                await sleep(delayPerCell);
            }

            recount();
        } catch (err) {
            console.error('Failed to generate sudoku from server', err);
            alert('Erreur lors de la génération de la grille. Réessayez plus tard.');
        } finally {
            if (generationRef.current === genId) setIsGenerating(false);
        }
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
            const xp = await gameService.validateSudoku(gameIdRef.current, grid);
            // Partie terminée : le serveur ne l'acceptera plus
            gameIdRef.current = null;
            return {ok: true, xp};
        } catch (err) {
            console.error('Validation failed', err);
            return {ok: false, message: (err as Error).message || 'Validation failed'};
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
        setHoverDigit,
        setSelectedCell,
        onCellInput: recount,
    };
}
