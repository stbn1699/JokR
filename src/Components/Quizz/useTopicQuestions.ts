import {useEffect, useState} from "react";
import {quizzService} from "../../Services/quizz.service.ts";
import type {QuizzQuestion, QuizzTopic} from "./topics/index.ts";
import {fromServer} from "./quizzMatch.ts";

/**
 * Toutes les questions jouables d'un thème, lues sur le serveur (quizz_questions) : celles du site et celles
 * proposées par les joueurs et validées par un administrateur. null pendant le chargement ; serveur injoignable :
 * aucune question.
 */
export function useTopicQuestions(topic: QuizzTopic | undefined): QuizzQuestion[] | null {
    const [extra, setExtra] = useState<{ topicId: string; questions: QuizzQuestion[] } | null>(null);

    useEffect(() => {
        if (!topic) return;
        const controller = new AbortController();
        quizzService.approved(topic.id, controller.signal)
            .then(questions => setExtra({topicId: topic.id, questions: questions.map(fromServer)}))
            .catch(err => {
                if (!(err instanceof DOMException)) setExtra({topicId: topic.id, questions: []});
            });
        return () => controller.abort();
    }, [topic]);

    if (!topic || extra?.topicId !== topic.id) return null;
    return extra.questions;
}
