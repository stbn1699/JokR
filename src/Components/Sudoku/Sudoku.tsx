/**
 * Composant Sudoku - Jeu de Sudoku 9x9 interactif
 *
 * Fonctionnalités principales :
 * - Génération de grilles avec difficulté ajustable (25-75 cases vides)
 * - Navigation clavier (flèches avec wrapping circulaire)
 * - Highlight des cellules contenant le même chiffre
 * - Système d'XP avec formule de difficulté exponentielle
 * - Validation et popup de succès avec confettis
 *
 * Formule XP :
 * xp = baseXp × (40 / cluesCount)^1.1
 * Plus il y a de cases vides (moins de clues), plus l'XP gagné est élevé
 * Exemple : avec 40 clues → xp = baseXp, avec 20 clues → xp ≈ 2.14 × baseXp
 *
 * Architecture :
 * - generateSudoku() : génère une grille complète puis retire des chiffres
 *                      en garantissant une solution unique et solvable par logique
 * - sanitizeInput() : limite la saisie à 1 chiffre entre 1-9
 * - handleKeyDown() : gère navigation clavier et saisie de chiffres
 */

import {type FormEvent, useEffect, useRef, useState} from 'react';
import "./Sudoku.scss";
import {handleKeyDown} from "./keyboardNavigation";
import {sanitizeInput} from "./sanitizeInput";
import {SuccessPopup} from "../SuccessPopup/SuccessPopup.tsx";
import {gameService} from "../../Services/game.service.ts";
import {useNavigate} from "react-router-dom";

/**
 * Props du composant Sudoku
 * @property gameCode - Code du jeu (ex: "SUDOKU") pour récupérer l'XP de base depuis le backend
 */
type SudokuProps = {
    gameCode: string;
}

/**
 * Composant principal du jeu Sudoku
 * @param gameCode - Identifiant du jeu pour récupérer les paramètres (XP, etc.)
 * @returns JSX du jeu Sudoku complet avec panneau d'options, grille et actions
 */
export default function Sudoku({gameCode}: SudokuProps) {
    const [isGenerating, setIsGenerating] = useState(false);

    // Référence vers tous les inputs de la grille (81 cellules = 9×9)
    const inputs = useRef<HTMLInputElement[]>([]);

    // Référence pour identifier une génération en cours (permet d'annuler l'animation)
    const generationRef = useRef(0);

    // Hook de navigation React Router
    const navigate = useNavigate();

    // État : affichage de la popup de succès après validation
    const [showSuccess, setShowSuccess] = useState(false);

    // État : nombre de cases pré-remplies (clues) dans la grille
    // Valeur par défaut : 40 clues (difficulté moyenne)
    // Plus ce nombre est élevé, plus la grille est facile
    const [cluesCount, setCluesCount] = useState<number>(40);

    // État : chiffre actuellement survolé/sélectionné pour le highlight visuel
    // null = aucun highlight
    const [highlightNumber, setHighlightNumber] = useState<number | null>(null);

    // État : XP de base du jeu (récupéré depuis le backend au chargement)
    const [baseXp, setBaseXp] = useState<number>(0);

    // Limites pour le nombre de cases vides (paramétrable par l'utilisateur)
    const MIN_EMPTY_CELLS = 25; // Minimum : 25 cases vides (56 clues = grille facile)
    const MAX_EMPTY_CELLS = 75; // Maximum : 75 cases vides (6 clues = grille très difficile)

    // État UI : valeur du champ de saisie du nombre de cases vides
    // Type string pour permettre la saisie libre ("3", "", "075", etc.)
    // La validation se fait uniquement au blur ou à la génération
    const [emptyCellsInput, setEmptyCellsInput] = useState<string>(String(81 - 40));

    /**
     * Fonction utilitaire pour borner une valeur entre min et max
     * @param n - Nombre à borner
     * @param min - Valeur minimale inclusive
     * @param max - Valeur maximale inclusive
     * @returns n contraint entre min et max
     */
    const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));

    // Calcul du nombre de cases vides actuel (inverse de cluesCount)
    const emptyCellsCount = 81 - cluesCount;

    /**
     * Valide et applique le nombre de cases vides saisi par l'utilisateur
     *
     * Processus :
     * 1. Parse la chaîne en nombre
     * 2. Vérifie la validité (nombre fini)
     * 3. Applique les limites MIN/MAX avec arrondi
     * 4. Met à jour cluesCount et resynchronise l'input
     *
     * @param raw - Valeur brute saisie par l'utilisateur (string)
     */
    const commitEmptyCells = (raw: string) => {
        // Conversion de la chaîne en nombre
        const parsed = Number(raw);

        // Si la saisie n'est pas un nombre valide, on revient à la valeur actuelle
        if (!Number.isFinite(parsed)) {
            setEmptyCellsInput(String(emptyCellsCount));
            return;
        }

        // Applique les limites et arrondit (ex: 25.7 → 26)
        const empties = clamp(Math.round(parsed), MIN_EMPTY_CELLS, MAX_EMPTY_CELLS);

        // Met à jour le nombre de clues (inverse du nombre de cases vides)
        setCluesCount(81 - empties);

        // Resynchronise l'input avec la valeur validée
        setEmptyCellsInput(String(empties));
    };

    /**
     * Effet : synchronise l'input affiché avec le nombre de cases vides
     * Se déclenche quand cluesCount change (reset, etc.)
     */
    useEffect(() => {
        const newVal = String(emptyCellsCount);
        setEmptyCellsInput(prev => prev === newVal ? prev : newVal);
    }, [emptyCellsCount]);

    /**
     * Calcule l'XP gagné en fonction de la difficulté de la grille
     *
     * Formule : xp = baseXp × (40 / cluesCount)^1.1
     * - 40 clues (référence) → facteur = 1.0 → xp = baseXp
     * - 20 clues (difficile) → facteur ≈ 2.14 → xp ≈ 2.14 × baseXp
     * - 60 clues (facile) → facteur ≈ 0.59 → xp ≈ 0.59 × baseXp
     *
     * Sécurité : l'XP est borné entre 20 et 300 pour éviter les abus
     *
     * @returns L'XP gagné pour cette partie, arrondi à l'entier
     */
    const calculateXpWin = () => {
        const referenceClues = 40; // Valeur de référence (facteur = 1.0)
        const exponent = 1.1;      // Exposant pour la courbe de difficulté

        // Calcul du facteur de difficulté (ratio élevé à la puissance 1.1)
        const difficultyFactor = Math.pow(referenceClues / cluesCount, exponent);

        // Application du facteur à l'XP de base et arrondi
        let xp = Math.round(baseXp * difficultyFactor);

        // Sécurité : borne l'XP entre 20 et 300 (anti-abus)
        xp = Math.max(20, Math.min(xp, 300));

        return xp;
    };

    /**
     * Réinitialise les options de difficulté aux valeurs par défaut
     * Note : ne génère PAS de nouvelle grille (l'utilisateur doit cliquer sur "Générer")
     */
    const resetOptions = () => {
        setCluesCount(40); // Retour à la difficulté moyenne (40 clues)
    }

    /**
     * Génère une nouvelle grille de Sudoku et l'affiche
     *
     * Processus :
     * 1. Réinitialise l'état (popup, highlight)
     * 2. Génère une grille avec le nombre de clues demandé
     * 3. Parcourt les 81 cellules et configure chaque input :
     *    - Affiche la valeur (ou vide si 0)
     *    - Stocke la valeur dans data-value (pour la validation)
     *    - Marque comme readOnly si pré-remplie (clue)
     *    - Ajoute la classe CSS 'prefilled' pour le style
     *
     * @param count - Nombre de clues (cases pré-remplies) à générer
     */
    const generateGrid = async (count: number) => {
        setShowSuccess(false);
        setHighlightNumber(null);
        setIsGenerating(true);

        // Incrémente l'ID de génération pour pouvoir annuler une animation précédente
        generationRef.current += 1;
        const genId = generationRef.current;

        // petite utilitaire de temporisation
        const sleep = (ms: number) => new Promise<void>(res => setTimeout(res, ms));

        // Durée totale souhaitée de l'animation (ms). Ajustable si besoin.
        const TOTAL_ANIMATION_MS = 900;

        try {
            const grid = await gameService.generateSudoku(count);

            // Prépare la liste des updates (index, value) - nous conserverons l'ordre ligne/col
            const updates: { idx: number; val: number }[] = [];
            for (let r = 0; r < 9; r++) {
                for (let c = 0; c < 9; c++) {
                    updates.push({ idx: r * 9 + c, val: grid[r][c] });
                }
            }

            // Désactive temporairement tous les inputs pendant l'animation
            inputs.current.forEach((el) => {
                if (!el) return;
                el.value = "";
                el.setAttribute('data-value', '');
                el.readOnly = true; // évite les interactions pendant l'animation
                el.disabled = true;
                el.classList.remove('prefilled');
                el.classList.remove('same-number-highlight');
            });

            // Calcul du délai par cellule
            const delayPerCell = Math.max(4, Math.round(TOTAL_ANIMATION_MS / updates.length));

            // Animation : remplit chaque cellule l'une après l'autre
            for (let i = 0; i < updates.length; i++) {
                // Si une nouvelle génération a démarré, on annule l'animation en cours
                if (genId !== generationRef.current) return;

                const { idx, val } = updates[i];
                const el = inputs.current[idx];
                if (!el) continue;

                if (val === 0) {
                    // reste vide
                    el.value = '';
                    el.setAttribute('data-value', '');
                    el.readOnly = false;
                    el.disabled = false;
                    el.classList.remove('prefilled');
                } else {
                    // affiche la valeur (apparition animée)
                    el.value = String(val);
                    el.setAttribute('data-value', String(val));
                    el.readOnly = true;
                    el.disabled = false;
                    el.classList.add('prefilled');
                }

                // petit délai pour l'effet séquentiel
                await sleep(delayPerCell);
            }

        } catch (err) {
            console.error('Failed to generate sudoku from server', err);
            // Feedback minimal à l'utilisateur
            alert('Erreur lors de la génération de la grille. Réessayez plus tard.');
        } finally {
            // Si l'animation a été annulée par une nouvelle génération, ne change pas l'état global ici
            // mais si on est toujours sur la même génération, on remet le flag isGenerating à false
            if (generationRef.current === genId) setIsGenerating(false);
        }
    };

    /**
     * Effet : récupère l'XP de base du jeu depuis le backend au montage du composant
     *
     * Utilise un flag 'cancelled' pour éviter les race conditions :
     * - Si le composant est démonté avant la fin de la requête, le flag évite le setState
     *
     * En cas d'erreur (jeu introuvable, API down, etc.), redirige vers l'accueil
     */
    useEffect(() => {
        let cancelled = false; // Flag pour annuler la requête si le composant est démonté

        (async () => {
            try {
                // Récupère l'XP de base depuis le backend
                const xp = await gameService.getBaseXp(gameCode);

                // Met à jour l'état seulement si le composant est toujours monté
                if (!cancelled) setBaseXp(xp);
            } catch (error) {
                // En cas d'erreur, log et redirige vers l'accueil
                console.error("Failed to fetch base XP for Sudoku:", error);
                navigate('/');
            }
        })();

        // Cleanup : marque la requête comme annulée lors du démontage
        return () => {
            cancelled = true;
        };
    }, [gameCode, navigate]); // Ajout gameCode & navigate pour respecter les règles de hooks

    /**
     * Effet : gère le highlight visuel des cellules contenant le même chiffre
     *
     * Quand l'utilisateur survole/focus une cellule contenant un chiffre X,
     * toutes les autres cellules contenant X sont également surlignées
     *
     * Se déclenche à chaque changement de highlightNumber
     */
    useEffect(() => {
        // Conversion du nombre en string pour comparaison (null → pas de highlight)
        const numStr = highlightNumber === null ? null : String(highlightNumber);

        // Parcours de toutes les cellules de la grille
        inputs.current.forEach((el) => {
            if (!el) return; // Sécurité : ignore les références nulles

            // Récupère la valeur de la cellule (value ou data-value en fallback)
            const val = el.value ?? el.getAttribute('data-value') ?? '';

            // Ajoute/retire la classe CSS selon si la valeur correspond
            if (numStr !== null && val === numStr) {
                el.classList.add('same-number-highlight');
            } else {
                el.classList.remove('same-number-highlight');
            }
        });
    }, [highlightNumber]); // Se déclenche quand highlightNumber change

    // Récupération de l'ID utilisateur depuis localStorage (pour les stats)
    const userId: string | null = window.localStorage.getItem('userId');

    return (
        <div className="sudoku">

            {/* ========== PANNEAU OPTIONS (gauche) ========== */}
            <div className="options">
                <h2 className="title">Options</h2>

                {/* Section des paramètres de difficulté */}
                <div className="parameters-container">
                    <div className="cluesRange">
                        <label htmlFor="emptyCellsInput">
                            Cases à remplir&nbsp;({MIN_EMPTY_CELLS}–{MAX_EMPTY_CELLS})&nbsp;:
                        </label>

                        {/* Input du nombre de cases vides (difficulté) */}
                        <input
                            id="emptyCellsInput"
                            type="number"
                            min={MIN_EMPTY_CELLS}
                            max={MAX_EMPTY_CELLS}
                            step={1}
                            inputMode="numeric"
                            value={emptyCellsInput}
                            onChange={(e) => {
                                // Saisie libre : la validation se fait plus tard
                                setEmptyCellsInput(e.target.value);
                            }}
                            onBlur={() => commitEmptyCells(emptyCellsInput)} // Validation au blur
                            onKeyDown={(e) => {
                                // Validation au Enter en déclenchant le blur
                                if (e.key === "Enter") {
                                    e.currentTarget.blur();
                                }
                            }}
                        />
                    </div>
                </div>

                {/* Boutons d'action pour les options */}
                <div className="buttons-container">
                    {/* Bouton reset : remet les options par défaut */}
                    <button type="button" className="reset-button" onClick={() => resetOptions()}>
                        Réinitialiser
                    </button>

                    {/* Bouton génération : crée et affiche une nouvelle grille */}
                    <button
                        type="button"
                        className="generate-button"
                        onClick={async () => {
                            commitEmptyCells(emptyCellsInput);
                            const parsed = Number(emptyCellsInput);
                            const safeEmpties = Number.isFinite(parsed)
                                ? clamp(Math.round(parsed), MIN_EMPTY_CELLS, MAX_EMPTY_CELLS)
                                : emptyCellsCount;
                            await generateGrid(81 - safeEmpties);
                        }}
                        disabled={isGenerating}
                    >
                        {/* Affiche l'XP gagné dynamiquement */}
                        {isGenerating ? 'Génération...' : `Générer (${calculateXpWin()}xp)`}
                    </button>
                </div>
            </div>

            <div className="game">
                <h1 className="title">Sudoku</h1>

                <div className="grid">
                    {Array.from({length: 81}, (_, i) => (
                        <input
                            key={i}
                            data-index={i}
                            ref={(el) => {
                                if (el) inputs.current[i] = el;
                                else delete inputs.current[i];
                            }}
                            className="cell"
                            type="number"
                            min={1}
                            max={9}
                            inputMode="numeric"
                            pattern="[0-9]*"
                            placeholder=" "
                            onKeyDown={(e) => {
                                const el = e.currentTarget as HTMLInputElement;
                                if (el.readOnly) {
                                    const blocked = [
                                        "Backspace",
                                        "Delete",
                                        "0", "1", "2", "3", "4", "5", "6", "7", "8", "9",
                                    ];
                                    if (blocked.includes(e.key)) {
                                        e.preventDefault();
                                        return;
                                    }
                                }

                                handleKeyDown(e, inputs);
                            }}
                            onInput={(e: FormEvent<HTMLInputElement>) => {
                                // run existing sanitizer and keep data-value updated
                                sanitizeInput(e);
                                const target = e.currentTarget as HTMLInputElement;
                                target.setAttribute('data-value', target.value ?? '');
                                // if this cell is focused, update the highlight to reflect typed value
                                if (document.activeElement === target) {
                                    const v = target.value;
                                    setHighlightNumber(v ? Number(v) : null);
                                }
                            }}
                            onMouseEnter={(e) => {
                                const v = (e.currentTarget as HTMLInputElement).value;
                                if (v !== '') setHighlightNumber(Number(v));
                            }}
                            onMouseLeave={() => setHighlightNumber(null)}
                            onFocus={(e) => {
                                const v = (e.currentTarget as HTMLInputElement).value;
                                if (v !== '') setHighlightNumber(Number(v));
                            }}
                            onBlur={() => setHighlightNumber(null)}
                        />
                    ))}
                </div>
            </div>

            <div className="actions">

                <h2 className="title">Actions</h2>

                <button
                    type="button"
                    onClick={() => {
                        setShowSuccess(true)
                    }}
                    className="validate-button">
                    Valider
                </button>
            </div>

            <SuccessPopup
                open={showSuccess}
                gameCode={gameCode}
                userId={userId}
                xpWin={calculateXpWin()}
            />
        </div>
    );
}