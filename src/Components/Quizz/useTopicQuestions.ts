import {useEffect, useState} from "react";
import {quizzService} from "../../Services/quizz.service.ts";
import type {QuizzQuestion, QuizzTopic} from "./topics/index.ts";

/**
 * Toutes les questions jouables d'un thème : celles écrites dans le site, plus celles proposées par les joueurs et
 * validées par un administrateur (lues sur le serveur). null pendant le chargement ; serveur injoignable : on joue
 * avec les questions du site seulement.
 */
export function useTopicQuestions(topic: QuizzTopic | undefined): QuizzQuestion[] | null {
    const [extra, setExtra] = useState<{ topicId: string; questions: QuizzQuestion[] } | null>(null);

    useEffect(() => {
        if (!topic) return;
        const controller = new AbortController();
        quizzService.approved(topic.id, controller.signal)
            .then(questions => setExtra({topicId: topic.id, questions}))
            .catch(err => {
                if (!(err instanceof DOMException)) setExtra({topicId: topic.id, questions: []});
            });
        return () => controller.abort();
    }, [topic]);

    if (!topic || extra?.topicId !== topic.id) return null;
    // une question validée qui existe déjà dans le site n'est pas jouée deux fois
    const known = new Set(topic.questions.map(q => q.question.toLowerCase()));
    return [...topic.questions, ...extra.questions.filter(q => !known.has(q.question.toLowerCase()))];
}
