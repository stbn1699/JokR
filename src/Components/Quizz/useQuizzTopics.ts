import {useEffect, useState} from "react";
import {quizzService, type ServerTheme} from "../../Services/quizz.service.ts";
import {QUIZZ_CATEGORIES, QUIZZ_TOPICS, type QuizzCategory, type QuizzTopic} from "./topics/index.ts";

/**
 * Tous les thèmes du Quizz : ceux écrits dans le site (topics/) puis ceux créés par les joueurs et validés
 * (lus sur le serveur une fois, puis gardés en mémoire pour la visite). Leurs questions, comme toutes celles du
 * Quizz, sont en base et arrivent par useTopicQuestions.
 * Serveur injoignable : seulement les thèmes du site.
 */

let cache: QuizzTopic[] | null = null;
let loading: Promise<QuizzTopic[]> | null = null;

function toTopic(t: ServerTheme): QuizzTopic {
    const category = QUIZZ_CATEGORIES.find(c => c.id === t.category) ?? QUIZZ_CATEGORIES[QUIZZ_CATEGORIES.length - 1]!;
    return {
        id: t.id, name: t.name, description: t.description, category: category.id as QuizzCategory, icon: category.icon,
        color: t.color, wiki: {summary: t.summary, facts: [], url: t.wikiUrl}, creator: t.creator, userMade: true,
    };
}

function load(): Promise<QuizzTopic[]> {
    loading ??= quizzService.themes()
        .then(list => (cache = [...QUIZZ_TOPICS, ...list.map(toTopic)]))
        .catch(() => {
            loading = null;
            return QUIZZ_TOPICS;
        });
    return loading;
}

// Après une validation (page Stats) : les thèmes seront relus
export function forgetQuizzTopics() {
    cache = null;
    loading = null;
}

// Tous les thèmes ; ceux du site seulement tant que le serveur n'a pas répondu
export function useQuizzTopics(): QuizzTopic[] {
    const [topics, setTopics] = useState<QuizzTopic[]>(() => cache ?? QUIZZ_TOPICS);
    useEffect(() => {
        let alive = true;
        if (!cache) void load().then(list => alive && setTopics(list));
        return () => {
            alive = false;
        };
    }, []);
    return topics;
}

// Tous les thèmes, une fois ceux des joueurs lus (null avant ; serveur injoignable : ceux du site)
export function useLoadedQuizzTopics(): QuizzTopic[] | null {
    const [topics, setTopics] = useState<QuizzTopic[] | null>(() => cache);
    useEffect(() => {
        if (cache) return;
        let alive = true;
        void load().then(list => alive && setTopics(list));
        return () => {
            alive = false;
        };
    }, []);
    return topics;
}

// Un thème : undefined s'il n'existe pas, null pendant le chargement (thème de joueur pas encore lu)
export function useQuizzTopic(id: string | undefined): QuizzTopic | undefined | null {
    const local = QUIZZ_TOPICS.find(t => t.id === id);
    const [loaded, setLoaded] = useState(() => cache !== null);
    useEffect(() => {
        if (local || cache) return;
        let alive = true;
        void load().then(() => alive && setLoaded(true));
        return () => {
            alive = false;
        };
    }, [local]);
    if (local) return local;
    const found = (cache ?? []).find(t => t.id === id);
    return found ?? (loaded || cache ? undefined : null);
}
