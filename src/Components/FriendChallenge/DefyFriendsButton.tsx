import "./FriendChallenge.scss";
import {useState} from "react";
import {createPortal} from "react-dom";
import {Link} from "react-router-dom";
import {FaCheck, FaUserFriends} from "react-icons/fa";
import {useAuth} from "../../Context/authContext.ts";
import {useFriends} from "../../Services/friends.service.ts";
import {challengeService} from "../../Services/challenge.service.ts";
import {shareTime} from "../../Services/share.ts";
import Avatar from "../Avatar/Avatar.tsx";

type DefyFriendsButtonProps = {
    gameCode: string;
    gameName: string;
    // free : envoie la grille de cette partie ; daily : défie au défi du jour (même grille pour tous)
    mode: "free" | "daily";
    durationMs: number;
};

/**
 * Bouton « Défier un·e ami·e » (victoire, défi du jour réussi) : choix des amis, puis envoi.
 * Ils reçoivent une notification : pour une partie libre, un lien vers la même grille ; pour le défi du jour,
 * une invitation à battre ton temps.
 */
export default function DefyFriendsButton({gameCode, gameName, mode, durationMs}: DefyFriendsButtonProps) {
    const {userId} = useAuth();
    const {friends} = useFriends(userId);
    const [open, setOpen] = useState(false);
    const [chosen, setChosen] = useState<string[]>([]);
    const [sending, setSending] = useState(false);
    const [sent, setSent] = useState<number | null>(null);
    const [error, setError] = useState<string | null>(null);

    if (!userId) return null;

    const toggle = (username: string) =>
        setChosen(current => (current.includes(username) ? current.filter(u => u !== username) : [...current, username]));

    const send = async () => {
        setSending(true);
        setError(null);
        try {
            const count = mode === "daily" ? await challengeService.sendDaily(gameCode, chosen) : await challengeService.send(gameCode, chosen);
            setSent(count);
            setOpen(false);
        } catch (err) {
            setError((err as Error).message);
        } finally {
            setSending(false);
        }
    };

    return (
        <>
            <button type="button" className={`modal-button defy-button ${sent ? "sent" : ""}`}
                    onClick={() => {
                        setOpen(true);
                        setSent(null);
                        setChosen([]);
                    }}>
                {sent ? <><FaCheck aria-hidden/> Défi envoyé{sent > 1 ? ` à ${sent} ami·e·s` : ""}</> : <><FaUserFriends aria-hidden/> Défier un·e ami·e</>}
            </button>

            {/* Rendu au niveau de la page : jamais enfermé dans la popup qui contient le bouton */}
            {open && createPortal(
                <div className="modal-overlay defy-overlay" role="dialog" aria-modal="true" aria-labelledby="defy-title"
                     onClick={e => e.target === e.currentTarget && setOpen(false)}>
                    <div className="modal defy-modal">
                        <h2 id="defy-title">Défier un·e ami·e</h2>
                        <p className="defy-sub">
                            {mode === "daily"
                                ? <>Tes ami·e·s reçoivent une invitation à battre ton temps au {gameName} du jour ({shareTime(durationMs)}).</>
                                : <>Tes ami·e·s reçoivent cette grille de {gameName} pour la faire à leur tour. Ton temps : {shareTime(durationMs)}.</>}
                        </p>

                        {friends.length === 0 ? (
                            <p className="defy-empty">
                                Tu n'as pas encore d'ami·e·s. <Link to="/profile?onglet=amis">Ajoute des ami·e·s</Link> pour les défier.
                            </p>
                        ) : (
                            <ul className="defy-friends">
                                {friends.map(f => (
                                    <li key={f.username}>
                                        <label className={chosen.includes(f.username) ? "chosen" : ""}>
                                            <input type="checkbox" checked={chosen.includes(f.username)} onChange={() => toggle(f.username)}/>
                                            <Avatar seed={f.avatar} fallback={f.username} size={2.3} level={f.level}/>
                                            <span className="defy-name">{f.username}</span>
                                            {chosen.includes(f.username) && <FaCheck aria-hidden className="defy-check"/>}
                                        </label>
                                    </li>
                                ))}
                            </ul>
                        )}
                        {error && <p className="defy-error" role="alert">{error}</p>}

                        <div className="modal-buttons">
                            {friends.length > 0 && (
                                <button type="button" className="modal-button" disabled={sending || chosen.length === 0} onClick={() => void send()}>
                                    {sending ? "Envoi…" : chosen.length > 1 ? `Défier ${chosen.length} ami·e·s` : "Envoyer le défi"}
                                </button>
                            )}
                            <button type="button" className="modal-button secondary" onClick={() => setOpen(false)}>Annuler</button>
                        </div>
                    </div>
                </div>,
                document.body,
            )}
        </>
    );
}
