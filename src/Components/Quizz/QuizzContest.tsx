import {useState} from "react";
import {FaCheck, FaFlag} from "react-icons/fa";
import {useAuth} from "../../Context/authContext.ts";
import {quizzService} from "../../Services/quizz.service.ts";
import {REPORT_REASON_MAX} from "../../../backend/src/utils/quizz.ts";
import type {MatchQuestion} from "./quizzMatch.ts";

/**
 * « Contester » une question du récapitulatif de fin de partie, quand la réponse donnée par le jeu semble fausse :
 * une explication facultative, puis l'envoi. Un administrateur examine la question (page Statistiques) et le
 * joueur est prévenu de sa décision. Réservé aux joueurs connectés.
 * topicId : thème d'origine de la question (celui du mélange ne suffit pas à la retrouver).
 */
export default function QuizzContest({topicId, question, picked}: { topicId: string; question: MatchQuestion; picked: number | null }) {
    const {isLoggedIn} = useAuth();
    const [open, setOpen] = useState(false);
    const [reason, setReason] = useState("");
    const [state, setState] = useState<"idle" | "sending" | "sent">("idle");
    const [error, setError] = useState<string | null>(null);
    if (!isLoggedIn) return null;

    if (state === "sent") return <span className="quizz-contest-sent"><FaCheck aria-hidden/> Contestée, merci !</span>;

    const send = async () => {
        setState("sending");
        setError(null);
        try {
            const right = question.answers[question.correct]!;
            await quizzService.report({
                topicId, question: question.question, answers: [right, ...question.answers.filter((_, i) => i !== question.correct)],
                picked: picked === null ? null : question.answers[picked]!, reason: reason.trim(),
            });
            setState("sent");
        } catch (err) {
            setError((err as Error).message);
            setState("idle");
        }
    };

    if (!open) {
        return (
            <button type="button" className="quizz-contest-toggle" onClick={() => setOpen(true)} title="La réponse te semble fausse ?">
                <FaFlag aria-hidden/> Contester
            </button>
        );
    }
    return (
        <form className="quizz-contest" onSubmit={e => {
            e.preventDefault();
            void send();
        }}>
            <label>
                <span>Pourquoi la réponse « {question.answers[question.correct]} » te semble fausse ? (facultatif)</span>
                <textarea value={reason} maxLength={REPORT_REASON_MAX} rows={2} autoFocus
                          placeholder="Ex. : c'est l'inverse, la bonne réponse est…" onChange={e => setReason(e.target.value)}/>
            </label>
            {error && <p className="defy-error" role="alert">{error}</p>}
            <div className="quizz-contest-actions">
                <button type="submit" className="quizz-chip" disabled={state === "sending"}>
                    <FaFlag aria-hidden/> {state === "sending" ? "Envoi…" : "Envoyer"}
                </button>
                <button type="button" className="quizz-chip" onClick={() => setOpen(false)}>Annuler</button>
            </div>
        </form>
    );
}
