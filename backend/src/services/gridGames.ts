import type {PuzzleStore} from "./PuzzleStore.js";
import {boucleStore, bouchonStore, coloriaStore, demineurStore, liensStore, paturagesStore, tuyauxStore} from "./stores.js";
import {boucleCredits, boucleXp, generateBoucle} from "../utils/boucle.js";
import {BOUCHON_SIZES, bouchonCredits, bouchonXp, generateBouchon} from "../utils/bouchon.js";
import {coloriaCredits, coloriaXp, generateColoria} from "../utils/coloria.js";
import {createDemineur, demineurCredits, type DemineurPuzzle, demineurXp, placeMines, reveal} from "../utils/demineur.js";
import {generateLiens, liensCredits, liensXp} from "../utils/liens.js";
import {generatePaturages, paturagesCredits, paturagesXp} from "../utils/paturages.js";
import {generateTuyaux, tuyauxCredits, tuyauxXp} from "../utils/tuyaux.js";

type Random = (max: number) => number;

/*
 * Jeux de grille ajoutés depuis 3.3 (partie libre réglée par une taille et un curseur) :
 * ce qu'il faut pour les lancer à partir d'une grille déjà connue (défi du jour, défi rejoué, défi entre amis)
 * et pour calculer leurs gains.
 * - daily : taille et curseur du défi du jour
 * - generate : grille sous la forme gardée en base (JSON)
 * - load / save : passage de la forme gardée en base à celle de la partie en mémoire (et retour)
 * - view : ce que le joueur reçoit (jamais la solution)
 * - gridSize / amount : la taille et le curseur d'une partie, pour les stats et les gains
 */
export type GridGame<P> = {
    store: PuzzleStore<P>;
    daily: { size: number; amount: number };
    generate: (size: number, amount: number, random: Random) => unknown;
    load: (stored: unknown) => P;
    save: (puzzle: P) => unknown;
    view: (puzzle: P) => unknown;
    gridSize: (puzzle: P) => number;
    xp: (baseXp: number, puzzle: P, amount: number) => number;
    credits: (puzzle: P, amount: number) => number;
};

const same = <P>(stored: unknown) => stored as P;
const keep = <P>(puzzle: P): unknown => puzzle;
const withoutSolution = <P extends { solution: unknown }>(puzzle: P): Omit<P, "solution"> => {
    const view: Partial<P> = {...puzzle};
    delete view.solution;
    return view as Omit<P, "solution">;
};

// Démineur : en base, les mines et la case de départ (une case sans mine voisine, déjà ouverte au début)
type StoredDemineur = { size: number; mineCount: number; mines: number[]; start: number };

function loadDemineur(stored: unknown): DemineurPuzzle {
    const {size, mineCount, mines, start} = stored as StoredDemineur;
    const puzzle = createDemineur(size, mineCount);
    puzzle.mines = new Set(mines);
    reveal(puzzle, [start], () => 0);
    return puzzle;
}

export const GRID_GAMES = {
    COLORIA: {
        store: coloriaStore,
        // Coloria : la « taille » est le nombre de zones, le curseur le nombre de couleurs
        daily: {size: 30, amount: 4},
        generate: generateColoria,
        load: same, save: keep, view: withoutSolution,
        gridSize: p => p.zones,
        xp: (base, p) => coloriaXp(base, p.zones, p.colors),
        credits: p => coloriaCredits(p.zones, p.colors),
    } satisfies GridGame<ReturnType<typeof generateColoria>>,
    TUYAUX: {
        store: tuyauxStore,
        daily: {size: 7, amount: 0},
        generate: generateTuyaux,
        load: same, save: keep, view: withoutSolution,
        gridSize: p => p.size,
        xp: (base, p, hints) => tuyauxXp(base, p.size, hints),
        credits: (p, hints) => tuyauxCredits(p.size, hints),
    } satisfies GridGame<ReturnType<typeof generateTuyaux>>,
    LIENS: {
        store: liensStore,
        daily: {size: 9, amount: 8},
        generate: generateLiens,
        load: same, save: keep, view: withoutSolution,
        gridSize: p => p.size,
        xp: (base, p, pairs) => liensXp(base, p.size, pairs),
        credits: (p, pairs) => liensCredits(p.size, pairs),
    } satisfies GridGame<ReturnType<typeof generateLiens>>,
    BOUCHON: {
        store: bouchonStore,
        daily: {size: 6, amount: BOUCHON_SIZES.find(s => s.size === 6)?.default ?? 10},
        generate: generateBouchon,
        load: same, save: keep, view: keep,
        gridSize: p => p.size,
        xp: (base, p, moves) => bouchonXp(base, p.size, moves),
        credits: (p, moves) => bouchonCredits(p.size, moves),
    } satisfies GridGame<ReturnType<typeof generateBouchon>>,
    PATURAGES: {
        store: paturagesStore,
        daily: {size: 8, amount: 0},
        generate: generatePaturages,
        load: same, save: keep, view: withoutSolution,
        gridSize: p => p.size,
        xp: (base, p, given) => paturagesXp(base, p.size, given),
        credits: (p, given) => paturagesCredits(p.size, given),
    } satisfies GridGame<ReturnType<typeof generatePaturages>>,
    BOUCLE: {
        store: boucleStore,
        daily: {size: 8, amount: 18},
        generate: generateBoucle,
        load: same, save: keep, view: withoutSolution,
        gridSize: p => p.size,
        xp: (base, p, walls) => boucleXp(base, p.size, walls),
        credits: (p, walls) => boucleCredits(p.size, walls),
    } satisfies GridGame<ReturnType<typeof generateBoucle>>,
    DEMINEUR: {
        store: demineurStore,
        daily: {size: 10, amount: 15},
        generate: (size, mineCount, random): StoredDemineur => {
            const start = random(size * size);
            return {size, mineCount, mines: [...placeMines(size, mineCount, start, random)], start};
        },
        load: loadDemineur,
        // grille d'une partie finie (défi entre amis) : mêmes mines, départ sur une case libérée sans mine voisine
        save: (p): StoredDemineur => ({
            size: p.size, mineCount: p.mineCount, mines: [...p.mines ?? []],
            start: [...p.revealed].find(([, count]) => count === 0)?.[0] ?? 0,
        }),
        view: ({size, mineCount, revealed, blown}) => ({size, mines: mineCount, revealed: [...revealed], blown: [...blown]}),
        gridSize: p => p.size,
        xp: (base, p) => demineurXp(base, p.size, p.mineCount),
        credits: p => demineurCredits(p.size, p.mineCount),
    } satisfies GridGame<DemineurPuzzle>,
} as const;

export type GridGameCode = keyof typeof GRID_GAMES;
export const isGridGame = (code: string): code is GridGameCode => code in GRID_GAMES;

// Accès sans le type précis de chaque grille (les fonctions restent appelées avec leur propre grille)
export const gridGame = (code: GridGameCode) => GRID_GAMES[code] as unknown as GridGame<unknown>;
