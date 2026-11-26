import {useEffect, useMemo, useState} from "react";
import {FaCrown, FaSlidersH} from "react-icons/fa";
import {quizzService} from "../../Services/quizz.service.ts";
import {
    ALL_TOPICS_ID, CATEGORY_MIX_PREFIX, customMixId, type MixKind, mixKind, mixName,
} from "../../../backend/src/utils/quizzMixes.ts";
import {type PlayableTopic, QUIZZ_CATEGORIES, type QuizzCategory, type QuizzQuestion, type QuizzTopic} from "./topics/index.ts";
import {useLoadedQuizzTopics, useQuizzTopic} from "./useQuizzTopics.ts";
import {useTopicQuestions} from "./useTopicQuestions.ts";
import {fromServer} from "./quizzMatch.ts";

/**
 * Mélanges de thèmes (règles partagées avec le serveur : backend/src/utils/quizzMixes.ts) : « Tous les thèmes »
 * (/quizz/tout), une catégorie entière (/quizz/categorie-cinema) et la partie custom (/quizz/mix-…?themes=a,b,c).
 * Un mélange se joue comme un thème (même page, solo, duels) : c'est un thème « virtuel » dont les questions sont
 * celles de tous ses thèmes, chacune marquée de son thème d'origine (pour vérifier un duel reçu).
 */

export {ALL_TOPICS_ID, customMixId, mixKind};

export const categoryMixId = (category: QuizzCategory) => `${CATEGORY_MIX_PREFIX}${category}`;

// Adresse d'un thème ou d'un mélange (garde la liste des thèmes d'une partie custom), avec ses paramètres
export function quizzPath(topic: Pick<QuizzTopic, "id" | "mix">, sub?: "solo" | "duel", params: Record<string, string> = {}): string {
    const search = new URLSearchParams(topic.mix?.query ?? "");
    for (const [key, value] of Object.entries(params)) search.set(key, value);
    const query = search.toString().replace(/%2C/g, ",");
    return `/quizz/${topic.id}${sub ? `/${sub}` : ""}${query ? `?${query}` : ""}`;
}

// Thèmes réunis par un mélange
export function mixMembers(mix: MixKind, topics: QuizzTopic[], customThemes: string[]): QuizzTopic[] {
    if (mix.kind === "all") return topics;
    if (mix.kind === "category") return topics.filter(t => t.category === mix.category);
    return topics.filter(t => customThemes.includes(t.id));
}

// Le mélange, en thème jouable : questions validées de tous ses thèmes (lues sur le serveur), par thème
export function buildMixTopic(id: string, mix: MixKind, members: QuizzTopic[], approved: Record<string, QuizzQuestion[]>): PlayableTopic {
    const questions = members.flatMap(t => (approved[t.id] ?? []).map(q => ({...q, topic: t.id})));
    const category = mix.kind === "category" ? QUIZZ_CATEGORIES.find(c => c.id === mix.category)! : null;
    const names = members.map(t => t.name);
    const description = mix.kind === "all" ? "Toutes les questions de tous les thèmes, tirées au hasard."
        : mix.kind === "category" ? `Toutes les questions des thèmes ${category!.label.toLowerCase()} : ${names.join(", ")}.`
            : `Ton mélange : ${names.join(", ")}.`;
    return {
        id,
        name: mixName(mix),
        description,
        category: category?.id ?? members[0]?.category ?? "culture",
        icon: category?.icon ?? (mix.kind === "all" ? FaCrown : FaSlidersH),
        color: mix.kind === "all" ? "#facc15" : mix.kind === "custom" ? "#db2777" : members[0]?.color ?? "#2563eb",
        wiki: {summary: [description], facts: [["Thèmes", String(members.length)], ["Questions", String(questions.length)]], url: ""},
        questions,
        mix: {
            kind: mix.kind,
            topics: members.map(t => ({id: t.id, name: t.name, color: t.color})),
            query: mix.kind === "custom" ? `?themes=${members.map(t => t.id).join(",")}` : "",
        },
    };
}

/*
 * Thème ou mélange prêt à jouer, avec toutes ses questions : undefined s'il n'existe pas, null pendant le chargement.
 * customThemes : les thèmes d'une partie custom (paramètre ?themes=, ou ceux des questions d'un duel reçu).
 */
export function usePlayableTopic(id: string | undefined, customThemes: string[] = []): PlayableTopic | undefined | null {
    const mix = id ? mixKind(id) : null;
    const all = useLoadedQuizzTopics();
    const single = useQuizzTopic(mix ? undefined : id);
    const singleQuestions = useTopicQuestions(mix ? undefined : single ?? undefined);
    const themesKey = customThemes.join(",");
    const members = useMemo(() => (mix && all ? mixMembers(mix, all, themesKey.split(",")) : null),
        [id, all, themesKey]); // eslint-disable-line react-hooks/exhaustive-deps
    const key = members?.map(t => t.id).join(",") ?? "";
    const [approved, setApproved] = useState<{ key: string; data: Record<string, QuizzQuestion[]> } | null>(null);

    useEffect(() => {
        if (!key) return;
        const controller = new AbortController();
        quizzService.approvedMany(key.split(","), controller.signal)
            .then(data => setApproved({key, data: Object.fromEntries(Object.entries(data).map(([id, list]) => [id, list.map(fromServer)]))}))
            .catch(err => {
                if (!(err instanceof DOMException)) setApproved({key, data: {}});
            });
        return () => controller.abort();
    }, [key]);

    return useMemo(() => {
        if (!mix) {
            if (single === null) return null;
            if (!single) return undefined;
            return singleQuestions ? {...single, questions: singleQuestions} : null;
        }
        if (!all) return null;
        if (!members || members.length === 0) return undefined;
        if (approved?.key !== key) return null;
        return buildMixTopic(id!, mix, members, approved.data);
    }, [id, single, singleQuestions, all, members, approved, key]); // eslint-disable-line react-hooks/exhaustive-deps
}
