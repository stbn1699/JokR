import {useEffect, useRef, useState} from "react";
import {gameService} from "../../Services/game.service.ts";
import sounds from "../../Services/sounds.ts";
import {parseGridValues} from "./gridValues.ts";

// Durée totale de l'animation de remplissage de la grille (ms)
const TOTAL_ANIMATION_MS = 500;

const sleep = (ms: number) => new Promise<void>(res => setTimeout(res, ms));

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
 * - setHighlight(n) : surligne toutes les cases contenant le chiffre n
 */
export function useSudokuGame() {
    // Les 81 inputs de la grille (index = ligne * 9 + colonne)
    const inputs = useRef<HTMLInputElement[]>([]);

    // Incrémenté à chaque génération : permet d'interrompre une animation en cours
    const generationRef = useRef(0);

    // Identifiant de la partie, donné par le serveur à la génération (requis pour valider)
    const gameIdRef = useRef<string | null>(null);

    const [isGenerating, setIsGenerating] = useState(false);
    const [highlight, setHighlight] = useState<number | null>(null);

    // Surligne les cases contenant le chiffre survolé / sélectionné
    useEffect(() => {
        const target = highlight === null ? null : String(highlight);
        inputs.current.forEach((el) => {
            if (!el) return;
            el.classList.toggle('same-number-highlight', target !== null && el.value === target);
        });
    }, [highlight]);

    const generate = async (cluesCount: number) => {
        setHighlight(null);
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
                el.classList.toggle('prefilled', isClue);

                await sleep(delayPerCell);
            }
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

        const grid = parseGridValues(Array.from({length: 81}, (_, i) => inputs.current[i]?.value ?? ''));
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

    return {inputs, isGenerating, generate, validate, setHighlight};
}
