import {clampXp} from "./xpBounds.js";
import {creditsFor} from "./credits.js";
import {isAcceptedWord, ladderWords, solutionWords, type Random, type WordLength, type WordSizeLimits} from "./words.js";

/*
 * Échelle : passer d'un mot à un autre en changeant une lettre à chaque étape, sans quitter le dictionnaire.
 * Le départ et l'arrivée sont des mots courants, reliés par un chemin de mots courants d'exactement `par` étapes.
 * Le joueur peut emprunter n'importe quel chemin valide, y compris par des mots plus rares.
 */

export type EchellePuzzle = { length: WordLength; start: string; target: string; par: number };

export const ECHELLE_DEFAULT_SIZE = 4;
export const ECHELLE_SIZES: readonly WordSizeLimits[] = [
    {size: 4, min: 3, max: 8, default: 4},
    {size: 5, min: 3, max: 8, default: 4},
    {size: 6, min: 3, max: 8, default: 4},
];

const MAX_PATH = 100;

type Graph = { neighbors: Map<string, string[]>; endpoints: string[] };
const graphs = new Map<WordLength, Graph>();

// Mots reliés par une lettre, et mots à trouver dans le plus grand ensemble relié (calculé une fois par longueur)
function graphFor(length: WordLength): Graph {
    const cached = graphs.get(length);
    if (cached) return cached;

    const words = ladderWords(length);
    const buckets = new Map<string, string[]>();
    for (const word of words) {
        for (let i = 0; i < length; i++) {
            const pattern = `${word.slice(0, i)}_${word.slice(i + 1)}`;
            const bucket = buckets.get(pattern);
            if (bucket) bucket.push(word);
            else buckets.set(pattern, [word]);
        }
    }

    const neighbors = new Map<string, string[]>();
    for (const word of words) {
        const linked = new Set<string>();
        for (let i = 0; i < length; i++) {
            for (const other of buckets.get(`${word.slice(0, i)}_${word.slice(i + 1)}`) ?? []) {
                if (other !== word) linked.add(other);
            }
        }
        neighbors.set(word, [...linked]);
    }

    const seen = new Set<string>();
    let largest: string[] = [];
    for (const word of words) {
        if (seen.has(word)) continue;
        seen.add(word);
        const group = [word];
        for (let i = 0; i < group.length; i++) {
            for (const next of neighbors.get(group[i]!) ?? []) {
                if (!seen.has(next)) {
                    seen.add(next);
                    group.push(next);
                }
            }
        }
        if (group.length > largest.length) largest = group;
    }
    const connected = new Set(largest);
    const endpoints = [...new Set(solutionWords(length).map(s => s.key))].filter(key => connected.has(key));

    const graph = {neighbors, endpoints};
    graphs.set(length, graph);
    return graph;
}

// Distance (en étapes) de `start` à chaque mot, jusqu'à `maxDepth`
function distancesFrom(graph: Graph, start: string, maxDepth: number): Map<string, number> {
    const distances = new Map([[start, 0]]);
    const queue = [start];
    for (let i = 0; i < queue.length; i++) {
        const word = queue[i]!;
        const depth = distances.get(word)!;
        if (depth === maxDepth) continue;
        for (const next of graph.neighbors.get(word) ?? []) {
            if (!distances.has(next)) {
                distances.set(next, depth + 1);
                queue.push(next);
            }
        }
    }
    return distances;
}

export function generateEchelle(length: WordLength, par: number, random: Random): EchellePuzzle {
    const graph = graphFor(length);
    for (let attempt = 0; attempt < 500; attempt++) {
        const start = graph.endpoints[random(graph.endpoints.length)]!;
        const distances = distancesFrom(graph, start, par);
        const targets = graph.endpoints.filter(word => distances.get(word) === par);
        if (targets.length > 0) return {length, start, target: targets[random(targets.length)]!, par};
    }
    throw new Error(`Aucune échelle de ${par} étapes en ${length} lettres`);
}

// true si on passe de `from` à `to` en changeant exactement une lettre
export function isOneLetterApart(from: string, to: string): boolean {
    if (from.length !== to.length) return false;
    let differences = 0;
    for (let i = 0; i < from.length; i++) {
        if (from[i] !== to[i]) differences++;
    }
    return differences === 1;
}

export function isEchelleSolution(puzzle: EchellePuzzle, path: unknown): path is string[] {
    if (!Array.isArray(path) || path.length < 2 || path.length > MAX_PATH) return false;
    if (!path.every(word => typeof word === "string")) return false;
    if (path[0] !== puzzle.start || path[path.length - 1] !== puzzle.target) return false;
    if (new Set(path).size !== path.length) return false;
    return path.every((word: string, i) => i === 0 || (isAcceptedWord(word) && isOneLetterApart(path[i - 1] as string, word)));
}

// Référence : baseXp pour 5 lettres en 5 étapes
export function echelleXp(baseXp: number, length: number, par: number): number {
    return clampXp(baseXp * Math.pow(length / 5, 1.2) * (0.6 + 0.08 * par));
}

export const echelleCredits = (_length: number, par: number) => creditsFor(par, 3, 8);
