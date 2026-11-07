import "./FriendsTab.scss";
import {type FormEvent, type ReactNode, useState} from "react";
import {Link} from "react-router-dom";
import {FaUserPlus} from "react-icons/fa";
import {useAuth} from "../../../Context/authContext.ts";
import {type FriendPlayer, friendsStore, useFriends} from "../../../Services/friends.service.ts";
import {playerPath} from "../../../Services/player.service.ts";
import Avatar from "../../Avatar/Avatar.tsx";

const REQUEST_MESSAGES = {
    requested: "Demande envoyée.",
    accepted: "Vous êtes maintenant amis !",
    already_requested: "Tu lui as déjà envoyé une demande.",
    already_friends: "Vous êtes déjà amis.",
} as const;

/**
 * Onglet « Amis » du profil :
 * - ajouter un ami par son pseudo (s'il t'avait déjà demandé, vous devenez amis tout de suite)
 * - demandes reçues : Accepter / Refuser
 * - mes amis (lien vers leur page, Retirer) et demandes envoyées (Annuler)
 * Les amis sont mis en avant dans les classements.
 */
export default function FriendsTab() {
    const {userId} = useAuth();
    const {friends, incoming, outgoing} = useFriends(userId);
    const [name, setName] = useState("");
    const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
    const [busy, setBusy] = useState<string | null>(null);

    const act = async (key: string, action: () => Promise<unknown>) => {
        setBusy(key);
        setMessage(null);
        try {
            await action();
        } catch (err) {
            setMessage({ok: false, text: (err as Error).message});
        } finally {
            setBusy(null);
        }
    };

    const send = (e: FormEvent) => {
        e.preventDefault();
        const username = name.trim();
        if (!username) return;
        void act("send", async () => {
            const result = await friendsStore.request(username);
            setMessage({ok: true, text: REQUEST_MESSAGES[result]});
            setName("");
        });
    };

    return (
        <section className="profile-card friends-tab fade-in">
            <h1>Amis</h1>

            <form className="friends-add" onSubmit={send}>
                <input value={name} onChange={e => setName(e.target.value)} maxLength={30} spellCheck={false}
                       placeholder="Pseudo d'un joueur" aria-label="Pseudo du joueur à ajouter"/>
                <button type="submit" disabled={busy === "send" || !name.trim()}>
                    <FaUserPlus aria-hidden/> Ajouter
                </button>
            </form>
            <p className="friends-hint">Tu peux aussi l'ajouter depuis sa page, en cliquant sur son nom dans les classements.</p>
            {message && <p className={message.ok ? "account-success" : "account-error"} role="status">{message.text}</p>}

            {incoming.length > 0 && (
                <FriendList title={`Demandes reçues (${incoming.length})`} className="incoming" players={incoming}
                            actions={p => (
                                <>
                                    <button type="button" className="accept" disabled={busy !== null}
                                            onClick={() => void act(p.username, () => friendsStore.accept(p.username))}>Accepter</button>
                                    <button type="button" disabled={busy !== null}
                                            onClick={() => void act(p.username, () => friendsStore.remove(p.username))}>Refuser</button>
                                </>
                            )}/>
            )}

            <FriendList title={`Mes amis (${friends.length})`} players={friends}
                        empty="Pas encore d'amis. Ajoute des joueurs pour les retrouver dans les classements."
                        detail={p => `Amis depuis le ${new Date(p.since).toLocaleDateString("fr-FR")}`}
                        actions={p => (
                            <button type="button" disabled={busy !== null}
                                    onClick={() => {
                                        if (window.confirm(`Retirer ${p.username} de tes amis ?`)) {
                                            void act(p.username, () => friendsStore.remove(p.username));
                                        }
                                    }}>Retirer</button>
                        )}/>

            {outgoing.length > 0 && (
                <FriendList title="Demandes envoyées" players={outgoing} detail={() => "En attente de réponse"}
                            actions={p => (
                                <button type="button" disabled={busy !== null}
                                        onClick={() => void act(p.username, () => friendsStore.remove(p.username))}>Annuler</button>
                            )}/>
            )}
        </section>
    );
}

function FriendList({title, players, actions, detail, empty, className = ""}: {
    title: string;
    players: FriendPlayer[];
    actions: (p: FriendPlayer) => ReactNode;
    detail?: (p: FriendPlayer) => string;
    empty?: string;
    className?: string;
}) {
    return (
        <div className={`friends-section ${className}`}>
            <h2>{title}</h2>
            {players.length === 0 ? <p className="friends-hint">{empty}</p> : (
                <ul className="friends-list">
                    {players.map(p => (
                        <li key={p.username}>
                            <Link to={playerPath(p.username)} className="friends-player">
                                <Avatar seed={p.avatar} fallback={p.username} size={2.6} level={p.level} showLevel/>
                                <span className="friends-name">
                                    {p.username}
                                    {detail && <small>{detail(p)}</small>}
                                </span>
                            </Link>
                            <span className="friends-actions">{actions(p)}</span>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}
