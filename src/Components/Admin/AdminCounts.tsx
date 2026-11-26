import {createContext, type ReactNode, useCallback, useContext, useEffect, useState} from "react";
import {feedbackService} from "../../Services/feedback.service.ts";
import {quizzService} from "../../Services/quizz.service.ts";
import type {AdminBadge} from "./adminNav.ts";

/**
 * Compteurs « à traiter » de la console d'administration (barre latérale et tableau de bord) :
 * retours non traités (bugs, idées), thèmes et questions du Quizz en attente, questions contestées.
 * Les pages de modération appellent `refresh()` après chaque décision.
 */

export type AdminCounts = Record<AdminBadge, number | null> & { bugs: number | null; ideas: number | null };

const EMPTY: AdminCounts = {feedback: null, bugs: null, ideas: null, themes: null, questions: null, reports: null};

const Ctx = createContext<{ counts: AdminCounts; refresh: () => void }>({counts: EMPTY, refresh: () => undefined});

export function AdminCountsProvider({children}: { children: ReactNode }) {
    const [counts, setCounts] = useState<AdminCounts>(EMPTY);
    const [tick, setTick] = useState(0);
    const refresh = useCallback(() => setTick(t => t + 1), []);

    useEffect(() => {
        const controller = new AbortController();
        const {signal} = controller;
        const ignore = () => undefined;
        feedbackService.list(signal).then(items => {
            const todo = items.filter(i => i.doneAt === null);
            setCounts(c => ({...c, feedback: todo.length, bugs: todo.filter(i => i.kind === "bug").length, ideas: todo.filter(i => i.kind === "idea").length}));
        }).catch(ignore);
        quizzService.pendingThemes(signal).then(list => setCounts(c => ({...c, themes: list.length}))).catch(ignore);
        quizzService.pending(signal).then(list => setCounts(c => ({...c, questions: list.length}))).catch(ignore);
        quizzService.reports(signal).then(list => setCounts(c => ({...c, reports: list.length}))).catch(ignore);
        return () => controller.abort();
    }, [tick]);

    return <Ctx.Provider value={{counts, refresh}}>{children}</Ctx.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export const useAdminCounts = () => useContext(Ctx);
