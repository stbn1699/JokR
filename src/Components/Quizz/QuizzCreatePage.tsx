import "./Quizz.scss";
import {type CSSProperties, useCallback, useEffect, useMemo, useRef, useState} from "react";
import {Link, useLocation, useNavigate, useParams} from "react-router-dom";
import {FaArrowLeft, FaCheck, FaExternalLinkAlt, FaPaperPlane, FaPlus, FaSave, FaTimes, FaTrash} from "react-icons/fa";
import {useAuth} from "../../Context/authContext.ts";
import {ApiError} from "../../api/api.ts";
import Loader from "../Loader/Loader.tsx";
import {type MyThemeSummary, quizzService, type ThemeDraft, type ThemeStatus, type WikiArticle} from "../../Services/quizz.service.ts";
import {ANSWER_MAX, QUESTION_MAX, questionProblem} from "../../../backend/src/utils/quizz.ts";
import {
    THEME_COLORS, THEME_DESCRIPTION_MAX, THEME_MIN_QUESTIONS, THEME_NAME_MAX, filledQuestions, parseWikiUrl, themeProblems,
} from "../../../backend/src/utils/quizzThemes.ts";
import {QUIZZ_CATEGORIES} from "./topics/index.ts";

/**
 * Créer un thème du Quizz (/quizz/creer) : la liste de mes thèmes (brouillons à reprendre, soumis, validés, refusés),
 * puis l'éditeur (/quizz/creer/nouveau, /quizz/creer/<id>) : nom, phrase de présentation, catégorie, couleur,
 * article Wikipédia (aperçu : c'est lui qui remplit la fiche du thème) et les questions (30 au minimum, « + »).
 *
 * Rien ne se perd : chaque modification est gardée tout de suite dans ce navigateur, et enregistrée sur le serveur
 * quelques secondes après (brouillon). « Enregistrer et reprendre plus tard » enregistre tout de suite.
 * En revenant : si ce navigateur a une version plus récente que le serveur (serveur tombé, page fermée avant
 * l'enregistrement), c'est elle qui est reprise.
 * « Soumettre » ne s'active que quand tout est bon (mêmes règles que le serveur, utils/quizzThemes.ts) ;
 * le thème attend ensuite la validation d'un administrateur.
 */

type Card = { key: number; question: string; answers: [string, string, string, string] };
type Editor = Omit<ThemeDraft, "questions"> & { cards: Card[] };
type Backup = { draft: ThemeDraft; savedAt: number };

const SAVE_DELAY_MS = 3000;
const ANSWER_LABELS = ["Bonne réponse", "Mauvaise réponse", "Mauvaise réponse", "Mauvaise réponse"];
const STATUS_LABELS: Record<ThemeStatus, string> = {
    draft: "Brouillon", pending: "En attente de validation", approved: "Validé", rejected: "Refusé : à reprendre",
};

let nextKey = 1;
const emptyCard = (): Card => ({key: nextKey++, question: "", answers: ["", "", "", ""]});
const toEditor = (d: ThemeDraft): Editor => ({
    ...d, cards: d.questions.length > 0 ? d.questions.map(q => ({...q, key: nextKey++})) : [emptyCard()],
});
const toDraft = ({cards, ...rest}: Editor): ThemeDraft => ({...rest, questions: cards.map(({question, answers}) => ({question, answers}))});
const EMPTY: ThemeDraft = {name: "", description: "", category: "", color: "", wikiUrl: "", questions: []};
const isBlank = (d: ThemeDraft) => !d.name.trim() && !d.description.trim() && !d.wikiUrl.trim() && filledQuestions(d.questions).length === 0;

// ---------- Copie de secours dans ce navigateur
const backupKey = (id: string | null) => `quizz-theme:${id ?? "nouveau"}`;

function readBackup(id: string | null): Backup | null {
    try {
        return JSON.parse(localStorage.getItem(backupKey(id)) ?? "null") as Backup | null;
    } catch {
        return null;
    }
}

function writeBackup(id: string | null, draft: ThemeDraft) {
    try {
        localStorage.setItem(backupKey(id), JSON.stringify({draft, savedAt: Date.now()} satisfies Backup));
    } catch {
        // stockage indisponible : seul l'enregistrement sur le serveur protège le brouillon
    }
}

function dropBackup(id: string | null) {
    try {
        localStorage.removeItem(backupKey(id));
    } catch {
        // rien à faire
    }
}

const hour = (iso: number) => new Date(iso).toLocaleTimeString("fr-FR", {hour: "2-digit", minute: "2-digit"});

// ---------- Liste de mes thèmes
function MyThemes() {
    const [list, setList] = useState<MyThemeSummary[] | null>(null);
    const [confirm, setConfirm] = useState<string | null>(null);

    useEffect(() => {
        const controller = new AbortController();
        quizzService.myThemes(controller.signal).then(setList).catch(() => setList([]));
        return () => controller.abort();
    }, []);

    async function remove(id: string) {
        await quizzService.deleteTheme(id);
        dropBackup(id);
        setList(l => l?.filter(t => t.id !== id) ?? null);
    }

    return (
        <main className="quizz-create">
            <Link to="/quizz" className="quizz-back"><FaArrowLeft aria-hidden/> Tous les thèmes</Link>
            <h1>Créer un thème</h1>
            <p className="quizz-create-intro">Choisis un sujet que tu connais bien, relie-le à son article Wikipédia (il remplit la
                fiche du thème) et écris au moins {THEME_MIN_QUESTIONS} questions. Ton travail est enregistré au fur et à mesure :
                tu peux t'arrêter et reprendre quand tu veux. Une fois soumis, un administrateur valide le thème avant qu'il
                arrive dans le Quizz.</p>
            <Link to="/quizz/creer/nouveau" className="quizz-button"><FaPlus aria-hidden/> Nouveau thème</Link>

            {!list && <Loader/>}
            {list && list.length > 0 && (
                <section className="quizz-my-themes">
                    <h2>Mes thèmes</h2>
                    <ul>
                        {list.map(t => (
                            <li key={t.id} className={`quizz-my-theme ${t.status}`}>
                                <div>
                                    <strong>{t.name || "Thème sans nom"}</strong>
                                    <small>{STATUS_LABELS[t.status]} · {t.questionCount} question{t.questionCount > 1 ? "s" : ""}
                                        {" "}· modifié le {new Date(t.updatedAt).toLocaleDateString("fr-FR")}</small>
                                </div>
                                {t.status === "approved" && t.slug
                                    ? <Link to={`/quizz/${t.slug}`} className="quizz-button">Voir le thème</Link>
                                    : <Link to={`/quizz/creer/${t.id}`} className="quizz-button">{t.status === "pending" ? "Voir" : "Reprendre"}</Link>}
                                {(t.status === "draft" || t.status === "rejected") && (confirm === t.id ? (
                                    <span className="quizz-confirm">Supprimer ?
                                        <button type="button" onClick={() => void remove(t.id)}>Oui</button>
                                        <button type="button" onClick={() => setConfirm(null)}>Non</button>
                                    </span>
                                ) : (
                                    <button type="button" className="quizz-draft-remove" title="Supprimer ce brouillon"
                                            aria-label={`Supprimer ${t.name || "ce brouillon"}`} onClick={() => setConfirm(t.id)}>
                                        <FaTrash aria-hidden/>
                                    </button>
                                ))}
                            </li>
                        ))}
                    </ul>
                </section>
            )}
        </main>
    );
}

// ---------- Aperçu de l'article Wikipédia (lu par le serveur, quelques instants après la saisie)
function useWikiPreview(url: string) {
    const [state, setState] = useState<{ url: string; article: WikiArticle | null; error: string | null } | null>(null);
    const valid = parseWikiUrl(url) !== null;
    useEffect(() => {
        if (!valid) return;
        const controller = new AbortController();
        const timer = window.setTimeout(() => {
            quizzService.wiki(url, controller.signal)
                .then(article => setState({url, article, error: null}))
                .catch(err => {
                    if (!(err instanceof DOMException)) setState({url, article: null, error: err instanceof ApiError ? err.message : "Article introuvable"});
                });
        }, 700);
        return () => {
            window.clearTimeout(timer);
            controller.abort();
        };
    }, [url, valid]);
    if (!url.trim()) return {article: null, error: null, loading: false};
    if (!valid) return {article: null, error: "Colle l'adresse d'un article : https://fr.wikipedia.org/wiki/…", loading: false};
    if (state?.url !== url) return {article: null, error: null, loading: true};
    return {article: state.article, error: state.error, loading: false};
}

// ---------- Éditeur
// themeId : celui de l'adresse à l'ouverture (null : nouveau thème). Après la création, l'adresse change
// (/quizz/creer/<id>) sans recharger l'éditeur.
function ThemeEditor({themeId: openedId}: { themeId: string | null }) {
    const navigate = useNavigate();
    const [themeId] = useState(openedId);
    // nouveau thème : la copie de ce navigateur s'il y en a une (page fermée avant le premier enregistrement)
    const [newBackup] = useState(() => (openedId ? null : readBackup(null)));
    const [editor, setEditor] = useState<Editor | null>(() => (openedId ? null : toEditor(newBackup?.draft ?? EMPTY)));
    const [status, setStatus] = useState<ThemeStatus>("draft");
    const [restored, setRestored] = useState(() => !!newBackup && !isBlank(newBackup.draft));
    const [save, setSave] = useState<{ state: "idle" | "saving" | "saved" | "error"; at?: number; message?: string }>({state: "idle"});
    const [submitting, setSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState<string | null>(null);
    // id du thème sur le serveur (créé au premier enregistrement d'un nouveau thème)
    const idRef = useRef<string | null>(themeId);
    const dirty = useRef(restored);
    const creating = useRef<Promise<string> | null>(null);
    const focusKey = useRef<number | null>(null);
    const listRef = useRef<HTMLOListElement>(null);

    // Chargement : le serveur, ou la copie de ce navigateur si elle est plus récente
    useEffect(() => {
        if (!themeId) return;
        const controller = new AbortController();
        const backup = readBackup(themeId);
        quizzService.myTheme(themeId, controller.signal).then(theme => {
            setStatus(theme.status);
            const newer = backup && backup.savedAt > Date.parse(theme.updatedAt) && (theme.status === "draft" || theme.status === "rejected");
            const draft: ThemeDraft = newer ? backup.draft : theme;
            setEditor(toEditor(draft));
            setRestored(!!newer);
            dirty.current = !!newer;
            if (!newer) setSave({state: "saved", at: Date.parse(theme.updatedAt)});
        }).catch(err => {
            if (err instanceof DOMException) return;
            // serveur injoignable : on travaille sur la copie de ce navigateur
            setEditor(toEditor(backup?.draft ?? EMPTY));
            setSave({state: "error", message: err instanceof ApiError && err.status === 404 ? "Ce thème n'existe plus" : "Serveur injoignable : ton travail est gardé dans ce navigateur"});
        });
        return () => controller.abort();
    }, [themeId]);

    const editable = status === "draft" || status === "rejected";
    const draft = useMemo(() => (editor ? toDraft(editor) : EMPTY), [editor]);

    // Enregistrement sur le serveur (création au premier enregistrement)
    const saveNow = useCallback(async (d: ThemeDraft): Promise<boolean> => {
        if (isBlank(d) && !idRef.current) return true;
        setSave(s => ({...s, state: "saving"}));
        dirty.current = false;
        try {
            if (!idRef.current) {
                creating.current ??= quizzService.createTheme(d).then(r => r.id);
                const id = await creating.current;
                idRef.current = id;
                dropBackup(null);
                writeBackup(id, d);
                navigate(`/quizz/creer/${id}`, {replace: true, state: {created: true}});
            } else {
                await quizzService.saveTheme(idRef.current, d);
            }
            setSave({state: "saved", at: Date.now()});
            return true;
        } catch (err) {
            dirty.current = true;
            creating.current = null;
            setSave({state: "error", message: err instanceof ApiError && err.status > 0 && err.status < 500
                ? err.message : "Pas d'enregistrement sur le serveur pour l'instant : ton travail est gardé dans ce navigateur"});
            return false;
        }
    }, [navigate]);

    // Chaque modification : copie locale tout de suite, serveur après SAVE_DELAY_MS sans modification
    useEffect(() => {
        if (!editor || !editable || !dirty.current) return;
        writeBackup(idRef.current, draft);
        const timer = window.setTimeout(() => void saveNow(draft), SAVE_DELAY_MS);
        return () => window.clearTimeout(timer);
    }, [editor, editable, draft, saveNow]);

    useEffect(() => {
        if (focusKey.current === null) return;
        listRef.current?.querySelector<HTMLInputElement>(`[data-key="${focusKey.current}"] input`)?.focus();
        focusKey.current = null;
    }, [editor]);

    const wiki = useWikiPreview(draft.wikiUrl);

    // la phrase de présentation reprend celle de Wikipédia si elle est encore vide
    useEffect(() => {
        const description = wiki.article?.description;
        if (!description || !editable) return;
        setEditor(e => {
            if (!e || e.description.trim()) return e;
            dirty.current = true;
            return {...e, description: description.charAt(0).toUpperCase() + description.slice(1, THEME_DESCRIPTION_MAX)};
        });
    }, [wiki.article?.description, editable]);

    if (!editor) return <Loader/>;

    const change = (update: (e: Editor) => Editor) => {
        dirty.current = true;
        setSubmitError(null);
        setEditor(e => (e ? update(e) : e));
    };
    const setField = <K extends keyof ThemeDraft>(key: K, value: ThemeDraft[K]) => change(e => ({...e, [key]: value}));
    const updateCard = (key: number, update: (c: Card) => Card) => change(e => ({...e, cards: e.cards.map(c => (c.key === key ? update(c) : c))}));
    const addCard = () => {
        const card = emptyCard();
        focusKey.current = card.key;
        change(e => ({...e, cards: [...e.cards, card]}));
    };
    const removeCard = (key: number) => change(e => ({...e, cards: e.cards.length > 1 ? e.cards.filter(c => c.key !== key) : [emptyCard()]}));

    const filled = filledQuestions(draft.questions);
    const validCount = filled.filter(q => !questionProblem(q)).length;
    const problems = themeProblems(draft, wiki.article !== null);
    const ready = problems.length === 0 && !wiki.loading;

    async function saveAndLeave() {
        if (await saveNow(draft)) navigate("/quizz/creer");
    }

    async function submit() {
        setSubmitting(true);
        setSubmitError(null);
        if (!await saveNow(draft) || !idRef.current) {
            setSubmitting(false);
            return;
        }
        try {
            await quizzService.submitTheme(idRef.current, draft);
            dropBackup(idRef.current);
            setStatus("pending");
        } catch (err) {
            setSubmitError(err instanceof ApiError ? err.message : "La soumission n'a pas marché, réessaie.");
        } finally {
            setSubmitting(false);
        }
    }

    const color = draft.color || "#94a3b8";
    const Icon = QUIZZ_CATEGORIES.find(c => c.id === draft.category)?.icon;

    return (
        <main className="quizz-create" style={{"--topic": color} as CSSProperties}>
            <Link to="/quizz/creer" className="quizz-back"><FaArrowLeft aria-hidden/> Mes thèmes</Link>
            <h1>{draft.name.trim() || "Nouveau thème"}</h1>

            {status === "pending" && <p className="quizz-create-notice ok">Thème soumis ! Un administrateur va le relire ; tu seras prévenu·e
                dès qu'il sera validé.</p>}
            {status === "approved" && <p className="quizz-create-notice ok">Ce thème est validé et jouable.</p>}
            {status === "rejected" && <p className="quizz-create-notice ko">Ce thème a été refusé : corrige-le et soumets-le à nouveau.</p>}
            {restored && <p className="quizz-create-notice">Modifications récupérées : ce navigateur avait une version plus récente que le serveur.</p>}

            <fieldset className="quizz-create-section" disabled={!editable}>
                <legend>Le thème</legend>
                <label className="quizz-field">
                    <span>Nom</span>
                    <input type="text" value={draft.name} maxLength={THEME_NAME_MAX} placeholder="Ex. Le Seigneur des Anneaux"
                           onChange={e => setField("name", e.target.value)}/>
                </label>
                <label className="quizz-field">
                    <span>Phrase de présentation <small>(sous le nom, sur la carte du thème)</small></span>
                    <input type="text" value={draft.description} maxLength={THEME_DESCRIPTION_MAX} placeholder="Ex. La Terre du Milieu, de la Comté au Mordor"
                           onChange={e => setField("description", e.target.value)}/>
                </label>
                <div className="quizz-field">
                    <span>Catégorie</span>
                    <div className="quizz-chips">
                        {QUIZZ_CATEGORIES.map(c => (
                            <button key={c.id} type="button" className={draft.category === c.id ? "active" : ""} onClick={() => setField("category", c.id)}>
                                <c.icon aria-hidden/> {c.label}
                            </button>
                        ))}
                    </div>
                </div>
                <div className="quizz-field">
                    <span>Couleur</span>
                    <div className="quizz-swatches">
                        {THEME_COLORS.map(c => (
                            <button key={c} type="button" className={draft.color === c ? "active" : ""} style={{background: c}}
                                    aria-label={`Couleur ${c}`} aria-pressed={draft.color === c} onClick={() => setField("color", c)}/>
                        ))}
                        {Icon && <span className="quizz-create-preview" style={{background: color}}><Icon aria-hidden/></span>}
                    </div>
                </div>
            </fieldset>

            <fieldset className="quizz-create-section" disabled={!editable}>
                <legend>La fiche</legend>
                <label className="quizz-field">
                    <span>Article Wikipédia <small>(son introduction remplit la fiche du thème)</small></span>
                    <input type="url" value={draft.wikiUrl} placeholder="https://fr.wikipedia.org/wiki/…" onChange={e => setField("wikiUrl", e.target.value)}/>
                </label>
                {wiki.loading && <p className="quizz-wiki-preview muted">Lecture de l'article…</p>}
                {wiki.error && <p className="quizz-draft-error">{wiki.error}</p>}
                {wiki.article && (
                    <div className="quizz-wiki-preview">
                        <strong>{wiki.article.title}</strong>
                        {wiki.article.description && <small>{wiki.article.description}</small>}
                        {wiki.article.summary.map((p, i) => <p key={i}>{p}</p>)}
                        <a href={wiki.article.url} target="_blank" rel="noreferrer">Voir sur Wikipédia <FaExternalLinkAlt aria-hidden/></a>
                    </div>
                )}
            </fieldset>

            <fieldset className="quizz-create-section" disabled={!editable}>
                <legend>Les questions <span className={`quizz-count ${validCount >= THEME_MIN_QUESTIONS ? "ok" : ""}`}>{validCount} / {THEME_MIN_QUESTIONS}</span></legend>
                <p className="quizz-submit-intro">Pour chaque question : la bonne réponse, puis trois mauvaises. Chaque question doit se
                    comprendre seule (elles arrivent dans le désordre pendant les parties).</p>
                <ol className="quizz-drafts" ref={listRef}>
                    {editor.cards.map((c, i) => {
                        const blank = !c.question.trim() && c.answers.every(a => !a.trim());
                        const problem = blank ? null : questionProblem({question: c.question.trim(), answers: c.answers.map(a => a.trim())});
                        return (
                            <li key={c.key} data-key={c.key} className={`quizz-draft ${problem ? "incomplete" : blank ? "" : "complete"}`}>
                                <div className="quizz-draft-head">
                                    <strong>Question {i + 1} {!blank && !problem && <FaCheck aria-label="complète" className="quizz-draft-ok"/>}</strong>
                                    <button type="button" className="quizz-draft-remove" onClick={() => removeCard(c.key)}
                                            title="Retirer cette question" aria-label={`Retirer la question ${i + 1}`}>
                                        <FaTimes aria-hidden/>
                                    </button>
                                </div>
                                <input type="text" value={c.question} maxLength={QUESTION_MAX} placeholder="Ta question" aria-label={`Question ${i + 1}`}
                                       onChange={e => updateCard(c.key, x => ({...x, question: e.target.value}))}/>
                                <div className="quizz-draft-answers">
                                    {c.answers.map((a, j) => (
                                        <input key={j} type="text" value={a} maxLength={ANSWER_MAX} className={j === 0 ? "right" : "wrong"}
                                               placeholder={ANSWER_LABELS[j]} aria-label={`${ANSWER_LABELS[j]} de la question ${i + 1}`}
                                               onChange={e => updateCard(c.key, x => {
                                                   const answers = [...x.answers] as Card["answers"];
                                                   answers[j] = e.target.value;
                                                   return {...x, answers};
                                               })}/>
                                    ))}
                                </div>
                                {problem && <p className="quizz-draft-hint">{problem}</p>}
                            </li>
                        );
                    })}
                </ol>
                <button type="button" className="quizz-add" onClick={addCard}><FaPlus aria-hidden/> Ajouter une question</button>
            </fieldset>

            {editable && (
                <div className="quizz-create-footer">
                    <p className={`quizz-save-state ${save.state}`} role="status">
                        {save.state === "saving" ? "Enregistrement…"
                            : save.state === "error" ? save.message
                            : save.state === "saved" && save.at ? `Brouillon enregistré à ${hour(save.at)}`
                            : "Gardé dans ce navigateur, enregistré sur le serveur au fur et à mesure"}
                    </p>
                    {!ready && problems.length > 0 && (
                        <ul className="quizz-checklist">
                            {problems.map(p => <li key={p}>{p}</li>)}
                        </ul>
                    )}
                    {submitError && <p className="quizz-draft-error">{submitError}</p>}
                    <div className="quizz-create-actions">
                        <button type="button" className="quizz-button" disabled={save.state === "saving" || isBlank(draft)} onClick={() => void saveAndLeave()}>
                            <FaSave aria-hidden/> Enregistrer et reprendre plus tard
                        </button>
                        <button type="button" className="quizz-button primary" disabled={!ready || submitting} onClick={() => void submit()}>
                            <FaPaperPlane aria-hidden/> {submitting ? "Envoi…" : "Soumettre"}
                        </button>
                    </div>
                </div>
            )}
        </main>
    );
}

export default function QuizzCreatePage() {
    const {isLoggedIn} = useAuth();
    const {themeId} = useParams();
    const created = (useLocation().state as { created?: boolean } | null)?.created === true;
    if (!isLoggedIn) {
        return (
            <main className="quizz-create">
                <h1>Créer un thème</h1>
                <p className="quizz-create-intro"><Link to="/login">Connecte-toi</Link> pour créer ton propre thème du Quizz.</p>
            </main>
        );
    }
    if (!themeId) return <MyThemes/>;
    // key : passer d'un thème à l'autre repart d'un éditeur neuf ; un thème qui vient d'être créé garde le sien
    return <ThemeEditor key={themeId === "nouveau" || created ? "nouveau" : themeId} themeId={themeId === "nouveau" ? null : themeId}/>;
}
