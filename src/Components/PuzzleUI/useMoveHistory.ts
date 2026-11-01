import {useEffect, useState} from "react";

// Un coup joué : la case `index` est passée de `before` à `after`
export type Move<V> = { index: number; before: V; after: V };

type History<V> = { past: Move<V>[]; future: Move<V>[] };

/**
 * Historique des coups pour annuler / rétablir.
 * Le jeu enregistre chaque coup avec record(), puis applique lui-même la valeur
 * renvoyée par undo() (move.before) ou redo() (move.after), sans la ré-enregistrer.
 */
export function useMoveHistory<V>() {
    const [history, setHistory] = useState<History<V>>({past: [], future: []});

    const record = (move: Move<V>) => {
        if (move.before === move.after) return;
        // Un nouveau coup efface ce qui pouvait être rétabli
        setHistory(h => ({past: [...h.past, move], future: []}));
    };

    const undo = (): Move<V> | null => {
        const move = history.past[history.past.length - 1];
        if (!move) return null;
        setHistory({past: history.past.slice(0, -1), future: [...history.future, move]});
        return move;
    };

    const redo = (): Move<V> | null => {
        const move = history.future[history.future.length - 1];
        if (!move) return null;
        setHistory({past: [...history.past, move], future: history.future.slice(0, -1)});
        return move;
    };

    const clear = () => setHistory({past: [], future: []});

    return {
        record,
        undo,
        redo,
        clear,
        canUndo: history.past.length > 0,
        canRedo: history.future.length > 0,
    };
}

/**
 * Raccourcis clavier : Ctrl+Z pour annuler, Ctrl+Y ou Ctrl+Maj+Z pour rétablir (Cmd sur Mac).
 * Actifs tant que `enabled` est vrai.
 */
export function useUndoShortcuts(onUndo: () => void, onRedo: () => void, enabled: boolean) {
    useEffect(() => {
        if (!enabled) return;
        const onKey = (e: KeyboardEvent) => {
            if (!(e.ctrlKey || e.metaKey) || e.altKey) return;
            const key = e.key.toLowerCase();
            if (key === "z" && !e.shiftKey) {
                e.preventDefault();
                onUndo();
            } else if (key === "y" || (key === "z" && e.shiftKey)) {
                e.preventDefault();
                onRedo();
            }
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [onUndo, onRedo, enabled]);
}
