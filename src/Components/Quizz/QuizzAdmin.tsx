import "./Quizz.scss";
import {type ReactNode, useCallback, useEffect, useState} from "react";
import {Link} from "react-router-dom";
import {FaCheck, FaTimes} from "react-icons/fa";
import {ApiError} from "../../api/api.ts";
import {type PendingQuestion, type PendingTheme, quizzService, type ReportedQuestion} from "../../Services/quizz.service.ts";
import {playerPath} from "../../Services/player.service.ts";
import {questionProblem} from "../../../backend/src/utils/quizz.ts";
import {QUIZZ_CATEGORIES, type QuizzTopic} from "./topics/index.ts";
import {forgetQuizzTopics, useQuizzTopics} from "./useQuizzTopics.ts";
import AdminPage from "../Admin/AdminPage.tsx";
import {useAdminCounts} from "../Admin/AdminCounts.tsx";
import Loader from "../Loader/Loader.tsx";

/**
 * Modération du Quizz (console d'administration), en trois pages :
 * - Thèmes : créés par les joueurs et soumis (fiche, questions), à valider ou refuser en entier
 * - Questions : proposées par les joueurs, les plus anciennes d'abord ; chacune se corrige sur place (texte, bonne
 *   réponse, mauvaises réponses) avant « Valider » ; « Refuser » l'écarte
 * - Contestations : questions contestées en fin de partie (regroupées, avec les explications des joueurs) ; une
 *   question (du site ou des joueurs, toutes en base) se corrige sur place ; une question qui n'est plus en base
 *   telle quelle se marque seulement corrigée. « La réponse est juste » ferme la contestation.
 * Une fois décidé, un élément quitte la liste (et les compteurs de la barre latérale suivent).
 */

const when = (iso: string) => new Date(iso).toLocaleString("fr-FR", {day: "numeric", month: "short", hour: "2-digit", minute: "2-digit"});

function PendingItem({item, topics, onDone}: { item: PendingQuestion; topics: QuizzTopic[]; onDone: () => void }) {
    const [question, setQuestion] = useState(item.question);
    const [answers, setAnswers] = useState(item.answers);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const topic = topics.find(t => t.id === item.topicId);
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

// Question contestée : les contestations, puis Corriger (sur place) / La réponse est juste
function ReportedItem({item, topics, onDone}: { item: ReportedQuestion; topics: QuizzTopic[]; onDone: () => void }) {
    const [question, setQuestion] = useState(item.question);
    const [answers, setAnswers] = useState(item.answers);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const topic = topics.find(t => t.id === item.topicId);
    const edited = question !== item.question || answers.some((a, i) => a !== item.answers[i]);
    const problem = edited ? questionProblem({question: question.trim(), answers: answers.map(a => a.trim())}) : null;

    async function decide(status: "fixed" | "dismissed") {
        setBusy(true);
        setError(null);
        try {
            await quizzService.reviewReport({topicId: item.topicId, question: item.question, status,
                ...status === "fixed" && edited ? {edit: {question: question.trim(), answers: answers.map(a => a.trim()) as ReportedQuestion["answers"]}} : {}});
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
                <span>{item.reports.length} contestation{item.reports.length > 1 ? "s" : ""}</span>
                <span>{!item.editable ? "Question modifiée depuis" : item.site ? "Question du site" : "Question des joueurs"}</span>
            </div>
            <ul className="quizz-report-list">
                {item.reports.map((r, i) => (
                    <li key={i}>
                        {r.username ? <Link to={playerPath(r.username)}>{r.username}</Link> : <span>Compte supprimé</span>}
                        {" "}a répondu <b>{r.picked ?? "rien (temps écoulé)"}</b>
                        {r.reason ? <> : « {r.reason} »</> : null} <small>{when(r.createdAt)}</small>
                    </li>
                ))}
            </ul>
            {item.editable ? <>
                <input type="text" value={question} aria-label="Question" onChange={e => setQuestion(e.target.value)}/>
                <div className="quizz-draft-answers">
                    {answers.map((a, i) => (
                        <input key={i} type="text" value={a} className={i === 0 ? "right" : "wrong"}
                               aria-label={i === 0 ? "Bonne réponse" : "Mauvaise réponse"}
                               onChange={e => setAnswers(list => list.map((x, j) => (j === i ? e.target.value : x)) as ReportedQuestion["answers"])}/>
                    ))}
                </div>
            </> : <>
                <p className="quizz-review-description">{item.question} <b>{item.answers[0]}</b>{" "}
                    <small>({item.answers.slice(1).join(" · ")})</small></p>
                <p className="quizz-review-description"><small>Cette question n'est plus en base telle quelle (déjà corrigée ou retirée) : « Marquer corrigée » ferme la contestation.</small></p>
            </>}
            {(problem || error) && <p className="quizz-draft-error">{problem ?? error}</p>}
            <div className="quizz-review-actions">
                <button type="button" className="approve" disabled={busy || !!problem || (item.editable && !edited)} onClick={() => void decide("fixed")}>
                    <FaCheck aria-hidden/> {item.editable ? "Corriger" : "Marquer corrigée"}
                </button>
                <button type="button" className="reject" disabled={busy} onClick={() => void decide("dismissed")}>
                    <FaTimes aria-hidden/> La réponse est juste
                </button>
            </div>
        </li>
    );
}

// Thème créé par un joueur et soumis : sa fiche (tirée de Wikipédia), ses questions, puis Valider / Refuser
function PendingThemeItem({theme, onDone}: { theme: PendingTheme; onDone: () => void }) {
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const category = QUIZZ_CATEGORIES.find(c => c.id === theme.category)?.label ?? theme.category;

    async function decide(status: "approved" | "rejected") {
        setBusy(true);
        setError(null);
        try {
            await quizzService.reviewTheme(theme.id, status);
            if (status === "approved") forgetQuizzTopics();
            onDone();
        } catch (err) {
            setError(err instanceof ApiError ? err.message : "Impossible d'enregistrer, réessaie.");
            setBusy(false);
        }
    }

    return (
        <li className="quizz-review">
            <div className="quizz-review-head">
                <span className="quizz-review-topic" style={{background: theme.color}}>{theme.name}</span>
                <span>{category}</span>
                {theme.username ? <Link to={playerPath(theme.username)}>{theme.username}</Link> : <span>Compte supprimé</span>}
                {theme.submittedAt && <small>{when(theme.submittedAt)}</small>}
            </div>
            <p className="quizz-review-description">{theme.description}</p>
            <details className="quizz-review-details">
                <summary>Fiche : <a href={theme.wikiUrl} target="_blank" rel="noreferrer">{theme.wikiTitle ?? theme.wikiUrl}</a></summary>
                {theme.summary.map((p, i) => <p key={i}>{p}</p>)}
            </details>
            <details className="quizz-review-details">
                <summary>{theme.questions.length} questions</summary>
                <ol>
                    {theme.questions.map((q, i) => (
                        <li key={i}>{q.question} <b>{q.answers[0]}</b> <small>({q.answers.slice(1).join(" · ")})</small></li>
                    ))}
                </ol>
            </details>
            {error && <p className="quizz-draft-error">{error}</p>}
            <div className="quizz-review-actions">
                <button type="button" className="approve" disabled={busy} onClick={() => void decide("approved")}>
                    <FaCheck aria-hidden/> Valider le thème
                </button>
                <button type="button" className="reject" disabled={busy} onClick={() => void decide("rejected")}>
                    <FaTimes aria-hidden/> Refuser
                </button>
            </div>
        </li>
    );
}

// Liste à modérer : chargement, Actualiser, et retrait d'un élément décidé (les compteurs suivent)
function useReviewList<T>(fetch: (signal?: AbortSignal) => Promise<T[]>) {
    const {refresh} = useAdminCounts();
    const [items, setItems] = useState<T[] | null>(null);
    const [error, setError] = useState(false);
    const [loading, setLoading] = useState(false);

    const load = useCallback(async (signal?: AbortSignal) => {
        setLoading(true);
        try {
            setItems(await fetch(signal));
            setError(false);
        } catch (err) {
            if (!(err instanceof DOMException)) setError(true);
        } finally {
            if (!signal?.aborted) setLoading(false);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        const controller = new AbortController();
        const timer = window.setTimeout(() => void load(controller.signal), 0);
        return () => {
            window.clearTimeout(timer);
            controller.abort();
        };
    }, [load]);

    const remove = (item: T) => {
        setItems(list => list?.filter(i => i !== item) ?? null);
        refresh();
    };
    return {items, error, loading, reload: () => void load(), remove};
}

function ReviewPage<T>({title, description, empty, list, children}: {
    title: string;
    description: string;
    empty: string;
    list: ReturnType<typeof useReviewList<T>>;
    children: (item: T) => ReactNode;
}) {
    const {items, error, loading, reload} = list;
    return (
        <AdminPage group="Modération" title={title} description={description} onRefresh={reload} refreshing={loading}
                   meta={items && `${items.length} en attente`}>
            {error && <p className="stats-status stats-error">Impossible de charger le Quizz.</p>}
            {!items && !error && <Loader label="Chargement…"/>}
            {items && items.length === 0 && <p className="admin-empty">{empty}</p>}
            {items && items.length > 0 && <ul className="quizz-reviews admin-reviews">{items.map(children)}</ul>}
        </AdminPage>
    );
}

export function QuizzThemesAdmin() {
    const list = useReviewList(quizzService.pendingThemes);
    return (
        <ReviewPage title="Thèmes du Quizz" list={list} empty="Aucun thème en attente."
                    description="Thèmes créés et soumis par les joueurs : vérifie la fiche et les questions, puis valide ou refuse le thème en entier.">
            {theme => <PendingThemeItem key={theme.id} theme={theme} onDone={() => list.remove(theme)}/>}
        </ReviewPage>
    );
}

export function QuizzQuestionsAdmin() {
    const topics = useQuizzTopics();
    const list = useReviewList(quizzService.pending);
    return (
        <ReviewPage title="Questions du Quizz" list={list} empty="Aucune question en attente."
                    description="Questions proposées par les joueurs, les plus anciennes d'abord. Corrige-les sur place si besoin avant de valider.">
            {item => <PendingItem key={item.id} item={item} topics={topics} onDone={() => list.remove(item)}/>}
        </ReviewPage>
    );
}

export function QuizzReportsAdmin() {
    const topics = useQuizzTopics();
    const list = useReviewList(quizzService.reports);
    return (
        <ReviewPage title="Questions contestées" list={list} empty="Aucune contestation en cours."
                    description="Questions signalées en fin de partie, regroupées avec les explications des joueurs. Chaque question se corrige sur place.">
            {item => <ReportedItem key={`${item.topicId}
${item.question}`} item={item} topics={topics} onDone={() => list.remove(item)}/>}
        </ReviewPage>
    );
}
