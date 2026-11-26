/**
 * Page « Modération › Retours des joueurs » de la console d'administration : bugs et idées, les plus récents
 * d'abord, avec l'auteur, la page et l'appareil ; « Traité » les grise. Filtres : état (à traiter / tous) et type.
 */

import "./Feedback.scss";
import {useCallback, useEffect, useState} from "react";
import {Link} from "react-router-dom";
import {FaBug, FaCheck, FaLightbulb, FaUndo} from "react-icons/fa";
import {type FeedbackEntry, type FeedbackKind, feedbackService} from "../../Services/feedback.service.ts";
import {playerPath} from "../../Services/player.service.ts";
import AdminPage from "../Admin/AdminPage.tsx";
import {useAdminCounts} from "../Admin/AdminCounts.tsx";
import Loader from "../Loader/Loader.tsx";

type State = "todo" | "all";

const when = (iso: string) => new Date(iso).toLocaleString("fr-FR", {day: "numeric", month: "short", hour: "2-digit", minute: "2-digit"});

export default function FeedbackAdmin() {
    const {refresh} = useAdminCounts();
    const [items, setItems] = useState<FeedbackEntry[] | null>(null);
    const [state, setState] = useState<State>("todo");
    const [kind, setKind] = useState<FeedbackKind | null>(null);
    const [error, setError] = useState(false);
    const [loading, setLoading] = useState(false);

    const load = useCallback(async (signal?: AbortSignal) => {
        setLoading(true);
        try {
            setItems(await feedbackService.list(signal));
            setError(false);
        } catch (err) {
            if (!(err instanceof DOMException)) setError(true);
        } finally {
            if (!signal?.aborted) setLoading(false);
        }
    }, []);

    useEffect(() => {
        const controller = new AbortController();
        const timer = window.setTimeout(() => void load(controller.signal), 0);
        return () => {
            window.clearTimeout(timer);
            controller.abort();
        };
    }, [load]);

    async function toggle(item: FeedbackEntry) {
        const done = item.doneAt === null;
        await feedbackService.setDone(item.id, done);
        setItems(list => list?.map(i => (i.id === item.id ? {...i, doneAt: done ? new Date().toISOString() : null} : i)) ?? null);
        refresh();
    }

    const todo = items?.filter(i => i.doneAt === null) ?? [];
    const count = (k: FeedbackKind) => (state === "todo" ? todo : items ?? []).filter(i => i.kind === k).length;
    const shown = (items ?? []).filter(i => (state === "all" || i.doneAt === null) && (kind === null || i.kind === kind));

    return (
        <AdminPage group="Modération" title="Retours des joueurs" onRefresh={() => void load()} refreshing={loading}
                   description="Bugs et idées envoyés depuis le bouton « Un retour ? ». Marque-les traités une fois réglés."
                   meta={items && `${todo.length} à traiter · ${items.length} au total`}>
            <div className="admin-toolbar">
                <div className="admin-segmented" role="radiogroup" aria-label="État">
                    <button type="button" role="radio" aria-checked={state === "todo"} className={state === "todo" ? "active" : ""}
                            onClick={() => setState("todo")}>À traiter <em>{todo.length}</em></button>
                    <button type="button" role="radio" aria-checked={state === "all"} className={state === "all" ? "active" : ""}
                            onClick={() => setState("all")}>Tous <em>{items?.length ?? 0}</em></button>
                </div>
                <div className="admin-segmented" role="radiogroup" aria-label="Type">
                    <button type="button" role="radio" aria-checked={kind === null} className={kind === null ? "active" : ""}
                            onClick={() => setKind(null)}>Bugs et idées</button>
                    <button type="button" role="radio" aria-checked={kind === "bug"} className={kind === "bug" ? "active" : ""}
                            onClick={() => setKind("bug")}><FaBug aria-hidden/> Bugs <em>{count("bug")}</em></button>
                    <button type="button" role="radio" aria-checked={kind === "idea"} className={kind === "idea" ? "active" : ""}
                            onClick={() => setKind("idea")}><FaLightbulb aria-hidden/> Idées <em>{count("idea")}</em></button>
                </div>
            </div>

            {error && <p className="stats-status stats-error">Impossible de charger les retours.</p>}
            {!items && !error && <Loader label="Chargement des retours…"/>}
            {items && shown.length === 0 && <p className="admin-empty">{state === "todo" ? "Rien à traiter. 🎉" : "Aucun retour pour l'instant."}</p>}

            <ul className="feedback-list feedback-admin">
                {shown.map(item => (
                    <li key={item.id} className={`feedback-item ${item.kind} ${item.doneAt ? "done" : ""}`}>
                        <div className="feedback-item-head">
                            {item.kind === "bug" ? <span className="feedback-kind"><FaBug aria-hidden/> Bug</span> : <span className="feedback-kind"><FaLightbulb aria-hidden/> Idée</span>}
                            <Link to={playerPath(item.username)}>{item.username}</Link>
                            <small>{when(item.createdAt)}</small>
                            {item.page && <small className="feedback-item-page">{item.page}</small>}
                            <button type="button" onClick={() => void toggle(item)}>
                                {item.doneAt ? <><FaUndo aria-hidden/> Rouvrir</> : <><FaCheck aria-hidden/> Traité</>}
                            </button>
                        </div>
                        <p className="feedback-item-message">{item.message}</p>
                        {item.userAgent && <small className="feedback-item-ua">{item.userAgent}</small>}
                    </li>
                ))}
            </ul>
        </AdminPage>
    );
}
