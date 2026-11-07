import {useState} from "react";
import {FaCheck, FaUserClock, FaUserPlus} from "react-icons/fa";
import {useAuth} from "../../Context/authContext.ts";
import {type Friendship, friendsStore, useFriends} from "../../Services/friends.service.ts";

/**
 * Bouton d'amitié sur la page d'un autre joueur (joueur connecté seulement) :
 * Ajouter en ami → Demande envoyée (Annuler) ; demande reçue → Accepter / Refuser ; amis → Retirer.
 * `initial` : lien donné par le serveur avec la page, en attendant les listes d'amis.
 */
export default function FriendButton({username, initial}: { username: string; initial: Friendship }) {
    const {userId} = useAuth();
    const lists = useFriends(userId);
    // Listes d'amis chargées : elles font foi (elles suivent les actions faites ici ou ailleurs)
    const loaded = lists.friends.length + lists.incoming.length + lists.outgoing.length > 0;
    const [acted, setActed] = useState(false);
    const relation = loaded || acted ? friendsStore.relation(username) : initial;
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const act = async (action: () => Promise<unknown>) => {
        setBusy(true);
        setError(null);
        try {
            await action();
            setActed(true);
        } catch (err) {
            setError((err as Error).message);
        } finally {
            setBusy(false);
        }
    };

    return (
        <div className="friend-button">
            {relation === "none" && (
                <button type="button" className="primary" disabled={busy} onClick={() => void act(() => friendsStore.request(username))}>
                    <FaUserPlus aria-hidden/> Ajouter en ami
                </button>
            )}
            {relation === "outgoing" && (
                <>
                    <span className="friend-state"><FaUserClock aria-hidden/> Demande envoyée</span>
                    <button type="button" disabled={busy} onClick={() => void act(() => friendsStore.remove(username))}>Annuler</button>
                </>
            )}
            {relation === "incoming" && (
                <>
                    <span className="friend-state">{username} veut être ton ami</span>
                    <button type="button" className="primary" disabled={busy} onClick={() => void act(() => friendsStore.accept(username))}>Accepter</button>
                    <button type="button" disabled={busy} onClick={() => void act(() => friendsStore.remove(username))}>Refuser</button>
                </>
            )}
            {relation === "friends" && (
                <>
                    <span className="friend-state friends"><FaCheck aria-hidden/> Vous êtes amis</span>
                    <button type="button" disabled={busy} onClick={() => {
                        if (window.confirm(`Retirer ${username} de tes amis ?`)) void act(() => friendsStore.remove(username));
                    }}>Retirer</button>
                </>
            )}
            {error && <p className="friend-error" role="alert">{error}</p>}
        </div>
    );
}
