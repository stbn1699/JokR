import {useEffect, useRef, useState} from "react";
import {Link} from "react-router-dom";
import {FaPaperPlane, FaPlus, FaTimes} from "react-icons/fa";
import {useAuth} from "../../Context/authContext.ts";
import {ApiError} from "../../api/api.ts";
import {type ProposedQuestion, quizzService} from "../../Services/quizz.service.ts";
import {ANSWER_MAX, BATCH_MAX, QUESTION_MAX, QUIZZ_APPROVED_CREDITS, questionProblem} from "../../../backend/src/utils/quizz.ts";
import type {QuizzTopic} from "./topics/index.ts";

/**
 * « Proposer des questions » (page d'un thème) : une carte par question (la question, la bonne réponse et trois
 * mauvaises), le bouton « + » en ajoute autant qu'on veut, et tout part d'un coup. Les questions attendent la
 * validation d'un administrateur avant d'arriver dans les parties ; chaque question validée rapporte
 * QUIZZ_APPROVED_CREDITS crédits à son auteur (avec une notification).
 * Les brouillons sont gardés dans ce navigateur (par thème) : rien n'est perdu en quittant la page.
 * Cartes entièrement vides : ignorées à l'envoi. Mêmes règles que le serveur (backend/src/utils/quizz.ts).
 */

type Draft = { key: number; question: string; answers: [string, string, string, string] };

const ANSWER_LABELS = ["Bonne réponse", "Mauvaise réponse", "Mauvaise réponse", "Mauvaise réponse"];

let nextKey = 1;
const emptyDraft = (): Draft => ({key: nextKey++, question: "", answers: ["", "", "", ""]});

const storageKey = (topicId: string) => `quizz-drafts:${topicId}`;

function loadDrafts(topicId: string): Draft[] {
    try {
        const saved = JSON.parse(localStorage.getItem(storageKey(topicId)) ?? "null") as Omit<Draft, "key">[] | null;
        if (Array.isArray(saved) && saved.length > 0) return saved.map(d => ({...d, key: nextKey++}));
    } catch {
        // stockage indisponible ou brouillon illisible : on repart d'une carte vide
    }
    return [emptyDraft()];
}

function saveDrafts(topicId: string, drafts: Draft[]) {
    try {
        const filled = drafts.filter(d => !isEmpty(d)).map(({question, answers}) => ({question, answers}));
        if (filled.length === 0) localStorage.removeItem(storageKey(topicId));
        else localStorage.setItem(storageKey(topicId), JSON.stringify(filled));
    } catch {
        // stockage indisponible : le brouillon n'est pas gardé
    }
}

const trimmed = (d: Draft): ProposedQuestion => ({
    question: d.question.trim().replace(/\s+/g, " "),
    answers: d.answers.map(a => a.trim().replace(/\s+/g, " ")) as ProposedQuestion["answers"],
});

const isEmpty = (d: Draft) => !d.question.trim() && d.answers.every(a => !a.trim());

export default function QuizzSubmitForm({topic}: { topic: QuizzTopic }) {
    const {isLoggedIn} = useAuth();
    const [drafts, setDrafts] = useState<Draft[]>(() => loadDrafts(topic.id));
    // erreurs montrées seulement après un premier essai d'envoi
    const [tried, setTried] = useState(false);
    const [sending, setSending] = useState(false);
    const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null);
    // carte ajoutée avec « + » : son champ question prend le focus
    const focusKey = useRef<number | null>(null);
    const listRef = useRef<HTMLOListElement>(null);
    // mes propositions sur ce thème (relu après chaque envoi) : une question en attente ne compte pas encore
    // dans le nombre de questions du thème, d'où cette ligne
    const [mine, setMine] = useState<{ pending: number; approved: number; rejected: number } | null>(null);
    const [sent, setSent] = useState(0);

    useEffect(() => {
        if (!isLoggedIn) return;
        const controller = new AbortController();
        quizzService.mine(topic.id, controller.signal).then(setMine).catch(() => undefined);
        return () => controller.abort();
    }, [isLoggedIn, topic.id, sent]);

    useEffect(() => saveDrafts(topic.id, drafts), [topic.id, drafts]);

    useEffect(() => {
        if (focusKey.current === null) return;
        listRef.current?.querySelector<HTMLInputElement>(`[data-key="${focusKey.current}"] input`)?.focus();
        focusKey.current = null;
    }, [drafts]);

    if (!isLoggedIn) {
        return (
            <section className="quizz-submit">
                <h2>Proposer des questions</h2>
                <p className="quizz-submit-intro"><Link to="/login">Connecte-toi</Link> pour proposer tes propres questions sur ce thème.</p>
            </section>
        );
    }

    const update = (key: number, change: (d: Draft) => Draft) => {
        setResult(null);
        setDrafts(list => list.map(d => (d.key === key ? change(d) : d)));
    };
    const add = () => {
        const draft = emptyDraft();
        focusKey.current = draft.key;
        setDrafts(list => [...list, draft]);
    };
    const remove = (key: number) => setDrafts(list => (list.length > 1 ? list.filter(d => d.key !== key) : [emptyDraft()]));

    const filled = drafts.filter(d => !isEmpty(d));
    const problems = new Map(filled.map(d => [d.key, questionProblem(trimmed(d))]));
    const invalid = [...problems.values()].filter(Boolean).length;

    async function send() {
        setTried(true);
        if (filled.length === 0 || invalid > 0 || filled.length > BATCH_MAX) return;
        setSending(true);
        setResult(null);
        try {
            const count = await quizzService.submit(topic.id, filled.map(trimmed));
            setDrafts([emptyDraft()]);
            setTried(false);
            setSent(n => n + 1);
            setResult({ok: true, text: `Merci ! ${count > 1 ? `Tes ${count} questions sont envoyées` : "Ta question est envoyée"} : `
                    + `tu gagneras ${QUIZZ_APPROVED_CREDITS} crédits par question validée par un administrateur.`});
        } catch (err) {
            setResult({ok: false, text: err instanceof ApiError ? err.message : "L'envoi n'a pas marché, réessaie."});
        } finally {
            setSending(false);
        }
    }

    return (
        <section className="quizz-submit">
            <h2>Proposer des questions</h2>
            <p className="quizz-submit-intro">Écris la question, la bonne réponse puis trois mauvaises. Ajoute-en autant que tu
                veux avec « + » et envoie tout d'un coup : un administrateur les valide avant qu'elles arrivent dans les parties,
                et chaque question validée te rapporte {QUIZZ_APPROVED_CREDITS} crédits.</p>
            {mine && mine.pending + mine.approved + mine.rejected > 0 && (
                <p className="quizz-submit-mine">Tes propositions sur ce thème : <b>{mine.pending}</b> en attente
                    · <b>{mine.approved}</b> validée{mine.approved > 1 ? "s" : ""}
                    {mine.rejected > 0 && <> · {mine.rejected} refusée{mine.rejected > 1 ? "s" : ""}</>}</p>
            )}

            <ol className="quizz-drafts" ref={listRef}>
                {drafts.map((d, i) => {
                    const problem = tried ? problems.get(d.key) : null;
                    return (
                        <li key={d.key} data-key={d.key} className={`quizz-draft ${problem ? "invalid" : ""}`}>
                            <div className="quizz-draft-head">
                                <strong>Question {i + 1}</strong>
                                <button type="button" className="quizz-draft-remove" onClick={() => remove(d.key)}
                                        title="Retirer cette question" aria-label={`Retirer la question ${i + 1}`}>
                                    <FaTimes aria-hidden/>
                                </button>
                            </div>
                            <input type="text" value={d.question} maxLength={QUESTION_MAX} placeholder="Ta question"
                                   aria-label={`Question ${i + 1}`}
                                   onChange={e => update(d.key, x => ({...x, question: e.target.value}))}/>
                            <div className="quizz-draft-answers">
                                {d.answers.map((a, j) => (
                                    <input key={j} type="text" value={a} maxLength={ANSWER_MAX}
                                           className={j === 0 ? "right" : "wrong"} placeholder={ANSWER_LABELS[j]}
                                           aria-label={`${ANSWER_LABELS[j]} de la question ${i + 1}`}
                                           onChange={e => update(d.key, x => {
                                               const answers = [...x.answers] as Draft["answers"];
                                               answers[j] = e.target.value;
                                               return {...x, answers};
                                           })}/>
                                ))}
                            </div>
                            {problem && <p className="quizz-draft-error">{problem}</p>}
                        </li>
                    );
                })}
            </ol>

            <button type="button" className="quizz-add" onClick={add}><FaPlus aria-hidden/> Ajouter une question</button>

            <div className="quizz-submit-actions">
                <button type="button" className="quizz-button primary" disabled={sending || filled.length === 0}
                        onClick={() => void send()}>
                    <FaPaperPlane aria-hidden/> {sending ? "Envoi…" : `Envoyer ${filled.length > 1 ? `les ${filled.length} questions` : "la question"}`}
                </button>
                {tried && invalid > 0 && <span className="quizz-submit-status ko">
                    {invalid > 1 ? `${invalid} questions sont à corriger` : "Une question est à corriger"}</span>}
                {tried && filled.length > BATCH_MAX && <span className="quizz-submit-status ko">{BATCH_MAX} questions au plus par envoi</span>}
                {result && <span className={`quizz-submit-status ${result.ok ? "ok" : "ko"}`}>{result.text}</span>}
            </div>
        </section>
    );
}
