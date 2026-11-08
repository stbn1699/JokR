/**
 * Retours des joueurs (page Statistiques, administrateur) : bugs et idées, les plus récents d'abord,
 * avec l'auteur, la page et l'appareil ; « Traité » les grise.
 */

import "./Feedback.scss";
import {useEffect, useState} from "react";
import {Link} from "react-router-dom";
import {FaBug, FaLightbulb} from "react-icons/fa";
import {type FeedbackEntry, feedbackService} from "../../Services/feedback.service.ts";
import {playerPath} from "../../Services/player.service.ts";

type Filter = "todo" | "all";

const when = (iso: string) => new Date(iso).toLocaleString("fr-FR", {day: "numeric", month: "short", hour: "2-digit", minute: "2-digit"});

export default function FeedbackAdmin() {
    const [items, setItems] = useState<FeedbackEntry[] | null>(null);
    const [filter, setFilter] = useState<Filter>("todo");
    const [error, setError] = useState(false);

    useEffect(() => {
        const controller = new AbortController();
        feedbackService.list(controller.signal).then(setItems).catch(err => {
            if (!(err instanceof DOMException)) setError(true);
        });
        return () => controller.abort();
    }, []);

    async function toggle(item: FeedbackEntry) {
        const done = item.doneAt === null;
        await feedbackService.setDone(item.id, done);
        setItems(list => list?.map(i => (i.id === item.id ? {...i, doneAt: done ? new Date().toISOString() : null} : i)) ?? null);
    }

    const todo = items?.filter(i => i.doneAt === null).length ?? 0;
    const shown = items?.filter(i => filter === "all" || i.doneAt === null) ?? [];

    return (
        <section className="stats-section feedback-admin">
            <div className="feedback-admin-head">
                <h2>Retours des joueurs{items ? ` (${todo} à traiter)` : ""}</h2>
                <div className="feedback-filter">
                    <button type="button" className={filter === "todo" ? "active" : ""} onClick={() => setFilter("todo")}>À traiter</button>
                    <button type="button" className={filter === "all" ? "active" : ""} onClick={() => setFilter("all")}>Tous</button>
                </div>
            </div>

            {error && <p className="stats-status stats-error">Impossible de charger les retours.</p>}
            {items && shown.length === 0 && <p className="stats-status">{filter === "todo" ? "Rien à traiter." : "Aucun retour pour l'instant."}</p>}

            <ul className="feedback-list">
                {shown.map(item => (
                    <li key={item.id} className={`feedback-item ${item.kind} ${item.doneAt ? "done" : ""}`}>
                        <div className="feedback-item-head">
                            {item.kind === "bug" ? <span><FaBug aria-hidden/> Bug</span> : <span><FaLightbulb aria-hidden/> Idée</span>}
                            <Link to={playerPath(item.username)}>{item.username}</Link>
                            <small>{when(item.createdAt)}</small>
                            {item.page && <small>{item.page}</small>}
                            <button type="button" onClick={() => void toggle(item)}>{item.doneAt ? "Rouvrir" : "Traité"}</button>
                        </div>
                        <p className="feedback-item-message">{item.message}</p>
                        {item.userAgent && <small className="feedback-item-ua">{item.userAgent}</small>}
                    </li>
                ))}
            </ul>
        </section>
    );
}
