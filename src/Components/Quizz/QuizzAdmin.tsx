import "./Quizz.scss";
import {useEffect, useState} from "react";
import {Link} from "react-router-dom";
import {FaCheck, FaTimes} from "react-icons/fa";
import {ApiError} from "../../api/api.ts";
import {type PendingQuestion, quizzService} from "../../Services/quizz.service.ts";
import {playerPath} from "../../Services/player.service.ts";
import {questionProblem} from "../../../backend/src/utils/quizz.ts";
import {findTopic} from "./topics/index.ts";

/**
 * Questions du Quizz proposées par les joueurs (page Statistiques, administrateur) : les plus anciennes d'abord.
 * Chaque question se corrige sur place (texte, bonne réponse, mauvaises réponses) avant « Valider » ;
 * « Refuser » l'écarte. Une fois décidée, elle quitte la liste.
 */

const when = (iso: string) => new Date(iso).toLocaleString("fr-FR", {day: "numeric", month: "short", hour: "2-digit", minute: "2-digit"});

function PendingItem({item, onDone}: { item: PendingQuestion; onDone: () => void }) {
    const [question, setQuestion] = useState(item.question);
    const [answers, setAnswers] = useState(item.answers);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const topic = findTopic(item.topicId);
    const edited = question !== item.question || answers.some((a, i) => a !== item.answers[i]);
    const problem = edited ? questionProblem({question: question.trim(), answers: answers.map(a => a.trim())}) : null;

    async function decide(status: "approved" | "rejected") {
        setBusy(true);
        setError(null);
        try {
            await quizzService.review(item.id, status, status === "approved" && edited
                ? {question: question.trim(), answers: answers.map(a => a.trim()) as PendingQuestion["answers"]} : undefined);
            onDone();
        } catch (err) {
            setError(err instanceof ApiError ? err.message : "Impossible d'enregistrer, réessaie.");
            setBusy(false);
        }
    }

    return (
        <li className="quizz-review">
            <div className="quizz-review-head">
                <span className="quizz-review-topic" style={{background: topic?.color}}>{topic?.name ?? item.topicId}</span>
                {item.username ? <Link to={playerPath(item.username)}>{item.username}</Link> : <span>Compte supprimé</span>}
                <small>{when(item.createdAt)}</small>
            </div>
            <input type="text" value={question} aria-label="Question" onChange={e => setQuestion(e.target.value)}/>
            <div className="quizz-draft-answers">
                {answers.map((a, i) => (
                    <input key={i} type="text" value={a} className={i === 0 ? "right" : "wrong"}
                           aria-label={i === 0 ? "Bonne réponse" : "Mauvaise réponse"}
                           onChange={e => setAnswers(list => list.map((x, j) => (j === i ? e.target.value : x)) as PendingQuestion["answers"])}/>
                ))}
            </div>
            {(problem || error) && <p className="quizz-draft-error">{problem ?? error}</p>}
            <div className="quizz-review-actions">
                <button type="button" className="approve" disabled={busy || !!problem} onClick={() => void decide("approved")}>
                    <FaCheck aria-hidden/> {edited ? "Corriger et valider" : "Valider"}
                </button>
                <button type="button" className="reject" disabled={busy} onClick={() => void decide("rejected")}>
                    <FaTimes aria-hidden/> Refuser
                </button>
            </div>
        </li>
    );
}

export default function QuizzAdmin() {
    const [items, setItems] = useState<PendingQuestion[] | null>(null);
    const [error, setError] = useState(false);

    useEffect(() => {
        const controller = new AbortController();
        quizzService.pending(controller.signal).then(setItems).catch(err => {
            if (!(err instanceof DOMException)) setError(true);
        });
        return () => controller.abort();
    }, []);

    return (
        <section className="stats-section quizz-admin">
            <h2>Questions du Quizz à valider{items ? ` (${items.length})` : ""}</h2>
            {error && <p className="stats-status stats-error">Impossible de charger les questions.</p>}
            {items && items.length === 0 && <p className="stats-status">Aucune question en attente.</p>}
            <ul className="quizz-reviews">
                {items?.map(item => (
                    <PendingItem key={item.id} item={item} onDone={() => setItems(list => list?.filter(i => i.id !== item.id) ?? null)}/>
                ))}
            </ul>
        </section>
    );
}
