/**
 * Page de retour (/retour, joueurs connectés) : signaler un bug ou suggérer une amélioration.
 * La page d'où vient le joueur est jointe au message (le serveur ajoute le navigateur et l'appareil).
 */

import "./Feedback.scss";
import {type FormEvent, useState} from "react";
import {Link, Navigate, useLocation, useNavigate} from "react-router-dom";
import {FaBug, FaCheckCircle, FaLightbulb} from "react-icons/fa";
import {useAuth} from "../../Context/authContext.ts";
import {ApiError} from "../../api/api.ts";
import {FEEDBACK_MAX, FEEDBACK_MIN, type FeedbackKind, feedbackService} from "../../Services/feedback.service.ts";

const PLACEHOLDERS: Record<FeedbackKind, string> = {
    bug: "Qu'est-ce qui s'est passé ? Sur quel jeu, après quelle action ? Qu'attendais-tu à la place ?",
    idea: "Qu'est-ce qui rendrait JokR plus agréable ? Un jeu, une option, un réglage…",
};

export default function FeedbackPage() {
    const {isLoggedIn} = useAuth();
    const navigate = useNavigate();
    const from = (useLocation().state as { from?: string } | null)?.from ?? null;
    const [kind, setKind] = useState<FeedbackKind>("bug");
    const [message, setMessage] = useState("");
    const [sending, setSending] = useState(false);
    const [sent, setSent] = useState(false);
    const [error, setError] = useState<string | null>(null);

    if (!isLoggedIn) return <Navigate to="/login" replace/>;

    const length = message.trim().length;
    const tooShort = length < FEEDBACK_MIN;

    async function submit(e: FormEvent) {
        e.preventDefault();
        if (tooShort || sending) return;
        setSending(true);
        setError(null);
        try {
            await feedbackService.send(kind, message, from);
            setSent(true);
        } catch (err) {
            setError(err instanceof ApiError ? err.message : "Envoi impossible, réessaie.");
        } finally {
            setSending(false);
        }
    }

    const back = () => navigate(from ?? "/");

    if (sent) {
        return (
            <main className="feedback">
                <section className="feedback-card feedback-sent fade-in">
                    <FaCheckCircle className="feedback-sent-icon" aria-hidden/>
                    <h1>Merci !</h1>
                    <p>{kind === "bug" ? "Ton signalement est bien arrivé, on va regarder ça." : "Ton idée est bien arrivée, merci de nous aider à améliorer JokR."}</p>
                    <div className="feedback-actions">
                        <button type="button" className="feedback-submit" onClick={back}>{from ? "Revenir où j'étais" : "Retour à l'accueil"}</button>
                        <button type="button" className="feedback-secondary" onClick={() => {
                            setSent(false);
                            setMessage("");
                        }}>Écrire un autre message</button>
                    </div>
                </section>
            </main>
        );
    }

    return (
        <main className="feedback">
            <form className="feedback-card" onSubmit={submit}>
                <h1>Un bug ? Une idée ?</h1>
                <p className="feedback-sub">Ton message arrive directement à l'équipe de JokR.</p>

                <div className="feedback-kinds" role="radiogroup" aria-label="Type de message">
                    <button type="button" role="radio" aria-checked={kind === "bug"}
                            className={`feedback-kind ${kind === "bug" ? "active" : ""}`} onClick={() => setKind("bug")}>
                        <FaBug aria-hidden/> Signaler un bug
                    </button>
                    <button type="button" role="radio" aria-checked={kind === "idea"}
                            className={`feedback-kind idea ${kind === "idea" ? "active" : ""}`} onClick={() => setKind("idea")}>
                        <FaLightbulb aria-hidden/> Suggérer une amélioration
                    </button>
                </div>

                <label className="feedback-label" htmlFor="feedback-message">Ton message</label>
                <textarea id="feedback-message" className="feedback-text" value={message} maxLength={FEEDBACK_MAX} rows={8}
                          placeholder={PLACEHOLDERS[kind]} onChange={e => setMessage(e.target.value)} autoFocus/>
                <div className="feedback-meta">
                    <span>{from ? <>Page jointe : <code>{from}</code></> : null}</span>
                    <span className={length > FEEDBACK_MAX * 0.9 ? "near-limit" : ""}>{length} / {FEEDBACK_MAX}</span>
                </div>

                {error && <p className="feedback-error" role="alert">{error}</p>}

                <div className="feedback-actions">
                    <button type="submit" className="feedback-submit" disabled={tooShort || sending}>
                        {sending ? "Envoi…" : "Envoyer"}
                    </button>
                    {from ? <button type="button" className="feedback-secondary" onClick={back}>Annuler</button>
                        : <Link to="/" className="feedback-secondary">Annuler</Link>}
                </div>
            </form>
        </main>
    );
}
