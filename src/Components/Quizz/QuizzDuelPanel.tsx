import {useEffect, useState} from "react";
import {Link, useNavigate} from "react-router-dom";
import {FaBolt, FaRandom, FaUserFriends} from "react-icons/fa";
import {useAuth} from "../../Context/authContext.ts";
import {useFriends} from "../../Services/friends.service.ts";
import {type MyDuels, quizzService} from "../../Services/quizz.service.ts";
import Avatar from "../Avatar/Avatar.tsx";
import type {PlayableTopic} from "./topics/index.ts";
import {buildMatch} from "./quizzMatch.ts";
import {quizzPath} from "./quizzMixes.ts";

/**
 * Duels d'un thème (page du thème, sous « Solo ») :
 * - « Adversaire au hasard » : /quizz/<thème>/duel (un duel qui attend un adversaire, sinon on joue en premier) ;
 * - « Défier un·e ami·e » : la liste des amis, chacun avec « En direct » (salon d'attente : le duel est créé
 *   et l'ami·e prévenu·e tout de suite) ou « Chacun son tour » (on joue d'abord, il ou elle jouera ensuite) ;
 * - mes duels sur ce thème : à jouer, en attente de l'adversaire, derniers résultats, et le bilan.
 */
export default function QuizzDuelPanel({topic}: { topic: PlayableTopic }) {
    const navigate = useNavigate();
    const {userId} = useAuth();
    const {friends} = useFriends(userId);
    const [picking, setPicking] = useState(false);
    const [mine, setMine] = useState<MyDuels | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);

    useEffect(() => {
        if (!userId) return;
        const controller = new AbortController();
        quizzService.myDuels(topic.id, controller.signal).then(setMine).catch(() => undefined);
        return () => controller.abort();
    }, [userId, topic.id]);

    if (!userId) {
        return (
            <div className="quizz-mode quizz-duel-locked">
                <FaUserFriends aria-hidden/>
                <span><strong>Duel</strong><small><Link to="/login">Connecte-toi</Link> pour affronter tes ami·e·s ou d'autres joueurs</small></span>
            </div>
        );
    }

    const live = async (friend: string) => {
        setBusy(true);
        setError(null);
        try {
            const id = await quizzService.createDuel({topicId: topic.id, questions: buildMatch(topic), friend});
            navigate(`/quizz/duel/${id}`);
        } catch (err) {
            setError((err as Error).message);
            setBusy(false);
        }
    };

    const record = mine?.record;
    const played = record ? record.wins + record.draws + record.losses : 0;
    const plural = (n: number, word: string) => `${n} ${word}${n > 1 ? "s" : ""}`;

    return (
        <>
            <Link to={quizzPath(topic, "duel")} className="quizz-mode">
                <FaRandom aria-hidden/>
                <span><strong>Duel au hasard</strong>
                    <small>{record && played > 0
                        ? `${plural(record.wins, "victoire")} · ${plural(record.draws, "nul")} · ${plural(record.losses, "défaite")}`
                        : "Affronte un joueur pris au hasard"}</small></span>
            </Link>
            <button type="button" className={`quizz-mode ${picking ? "open" : ""}`} aria-expanded={picking} onClick={() => setPicking(p => !p)}>
                <FaUserFriends aria-hidden/>
                <span><strong>Défier un·e ami·e</strong><small>En direct, ou chacun son tour</small></span>
            </button>
            {picking && (
                <div className="quizz-friends">
                    {friends.length === 0 ? (
                        <p>Tu n'as pas encore d'ami·e·s. <Link to="/profile?onglet=amis">Ajoute des ami·e·s</Link> pour les défier.</p>
                    ) : (
                        <ul>
                            {friends.map(f => (
                                <li key={f.username}>
                                    <Avatar seed={f.avatar} fallback={f.username} size={2} level={f.level}/>
                                    <span className="quizz-friend-name">{f.username}</span>
                                    <button type="button" className="quizz-chip" disabled={busy} onClick={() => void live(f.username)}
                                            title="Vous jouez en même temps : il ou elle te rejoint dans le salon">
                                        <FaBolt aria-hidden/> En direct
                                    </button>
                                    <Link to={quizzPath(topic, "duel", {ami: f.username})} className="quizz-chip"
                                          title="Tu joues maintenant, il ou elle jouera ensuite face à tes réponses">Chacun son tour</Link>
                                </li>
                            ))}
                        </ul>
                    )}
                    {error && <p className="defy-error" role="alert">{error}</p>}
                </div>
            )}

            {mine && (mine.toPlay.length > 0 || mine.waiting.length > 0 || mine.recent.length > 0) && (
                <div className="quizz-my-duels">
                    {mine.toPlay.length > 0 && <>
                        <h3>À toi de jouer</h3>
                        <ul>{mine.toPlay.map(d => (
                            <li key={d.id}><Link to={`/quizz/duel/${d.id}`}>
                                {d.live ? <><FaBolt aria-hidden/> {d.opponent?.username} t'attend dans le salon</> : `Contre ${d.opponent?.username ?? "toi"}`}
                            </Link></li>
                        ))}</ul>
                    </>}
                    {mine.waiting.length > 0 && <>
                        <h3>En attente</h3>
                        <ul>{mine.waiting.map(d => (
                            <li key={d.id}><Link to={`/quizz/duel/${d.id}`}>
                                {d.opponent ? `${d.opponent.username} doit jouer` : "Adversaire au hasard"} · {d.myScore} pts
                            </Link></li>
                        ))}</ul>
                    </>}
                    {mine.recent.length > 0 && <>
                        <h3>Derniers duels</h3>
                        <ul>{mine.recent.map(d => (
                            <li key={d.id} className={d.result}><Link to={`/quizz/duel/${d.id}`}>
                                {d.result === "win" ? "Victoire" : d.result === "lose" ? "Défaite" : "Égalité"} contre {d.opponent?.username ?? "?"} · {d.myScore} – {d.theirScore}
                            </Link></li>
                        ))}</ul>
                    </>}
                </div>
            )}
        </>
    );
}
