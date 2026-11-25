import "./SocialPage.scss";
import {type FormEvent, useCallback, useEffect, useMemo, useRef, useState} from "react";
import {Link, Navigate, useSearchParams} from "react-router-dom";
import {
    FaBolt, FaCheck, FaCommentDots, FaHourglassHalf, FaPaperPlane, FaSearch, FaTimes, FaTrophy, FaUserFriends, FaUserPlus,
} from "react-icons/fa";
import Avatar from "../Avatar/Avatar.tsx";
import Loader from "../Loader/Loader.tsx";
import {useAuth} from "../../Context/authContext.ts";
import {friendsStore} from "../../Services/friends.service.ts";
import {playerPath} from "../../Services/player.service.ts";
import {challengePath} from "../../Services/challenge.service.ts";
import {shareTime} from "../../Services/share.ts";
import {GAME_TYPES, groupGamesByType} from "../../Services/gameTypes.ts";
import {
    type ChallengeMessage, challengeStatus, type DuelGame, type Presence, type SocialFriend, type SocialMessage,
    type SocialOverview, socialService,
} from "../../Services/social.service.ts";

/**
 * Onglet Social (/social, ?ami=<pseudo> pour ouvrir une discussion) :
 * - à gauche : ami·e·s (en partie, en ligne, hors ligne), recherche, demandes reçues, ajout par pseudo
 * - au centre : la discussion avec l'ami·e choisi·e, défis compris (cartes avec les deux temps)
 * - à droite : sa fiche, le bilan de vos défis et « Défier » (jeu + difficulté) : un duel, la même grille pour les deux
 * Tout se relit tout seul toutes les quelques secondes (pas encore de connexion en direct).
 */

const OVERVIEW_REFRESH_MS = 10_000;
const CONVERSATION_REFRESH_MS = 4_000;

const PRESENCE_LABEL: Record<Presence, string> = {online: "En ligne", playing: "En partie", offline: "Hors ligne"};
const PRESENCE_ORDER: Presence[] = ["playing", "online", "offline"];

// Heure d'un message : l'heure aujourd'hui, « hier », sinon la date
function messageTime(iso: string) {
    const date = new Date(iso);
    const time = date.toLocaleTimeString("fr-FR", {hour: "2-digit", minute: "2-digit"});
    const days = Math.round((new Date().setHours(0, 0, 0, 0) - new Date(date).setHours(0, 0, 0, 0)) / 86_400_000);
    if (days === 0) return time;
    if (days === 1) return `hier ${time}`;
    return date.toLocaleDateString("fr-FR", {day: "numeric", month: "short"});
}

// Recharge `load` tout de suite, puis toutes les `ms` (et quand `key` change)
function usePolling(load: (signal: AbortSignal) => Promise<void>, ms: number, key: unknown, enabled = true) {
    useEffect(() => {
        if (!enabled) return;
        let controller = new AbortController();
        const run = () => {
            controller.abort();
            controller = new AbortController();
            load(controller.signal).catch(() => undefined);
        };
        run();
        const timer = setInterval(run, ms);
        return () => {
            clearInterval(timer);
            controller.abort();
        };
    }, [load, ms, key, enabled]);
}

export default function SocialPage() {
    const {isLoggedIn, userId} = useAuth();
    const [params, setParams] = useSearchParams();
    const [overview, setOverview] = useState<SocialOverview | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [search, setSearch] = useState("");

    const loadOverview = useCallback(async (signal?: AbortSignal) => {
        try {
            setOverview(await socialService.overview(signal));
            setError(null);
        } catch (err) {
            if ((err as Error).name !== "AbortError") setError((err as Error).message);
        }
    }, []);
    usePolling(loadOverview, OVERVIEW_REFRESH_MS, userId, isLoggedIn);
    const refresh = useCallback(() => void loadOverview(), [loadOverview]);

    const friends = useMemo(() => [...(overview?.friends ?? [])].sort((a, b) =>
        PRESENCE_ORDER.indexOf(a.presence) - PRESENCE_ORDER.indexOf(b.presence)
        || (b.lastMessageAt ?? "").localeCompare(a.lastMessageAt ?? "")
        || a.username.localeCompare(b.username)), [overview]);

    const wanted = params.get("ami");
    const friend = friends.find(f => f.username === wanted) ?? friends[0] ?? null;
    const select = (username: string) => setParams({ami: username}, {replace: true});

    const visible = useMemo(() => {
        const q = search.trim().toLowerCase();
        return friends.filter(f => !q || f.username.toLowerCase().includes(q));
    }, [friends, search]);

    if (!isLoggedIn) return <Navigate to="/login" replace state={{from: "/social"}}/>;
    if (!overview) {
        return error
            ? <p className="game-list-status error" role="alert">{error}</p>
            : <Loader label="Chargement de tes ami·e·s…"/>;
    }

    const onlineCount = friends.filter(f => f.presence !== "offline").length;

    return (
        <div className="social fade-in">
            <div className="social-shell">
                <aside className="social-friends">
                    <header className="social-friends-head">
                        <h1>Social</h1>
                        <span className="social-online-count"><i className="presence-dot online"/> {onlineCount} en ligne</span>
                    </header>

                    <label className="social-search">
                        <FaSearch aria-hidden/>
                        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Chercher un·e ami·e"
                               spellCheck={false}/>
                    </label>

                    <Requests overview={overview} onChange={refresh}/>

                    <ul className="social-friend-list">
                        {visible.map(f => (
                            <li key={f.username}>
                                <button type="button" className={`social-friend ${f.username === friend?.username ? "selected" : ""}`}
                                        onClick={() => select(f.username)}>
                                    <span className="social-friend-avatar">
                                        <Avatar seed={f.avatar} fallback={f.username} size={2.6} level={f.level}/>
                                        <i className={`presence-dot ${f.presence}`} title={PRESENCE_LABEL[f.presence]}/>
                                    </span>
                                    <span className="social-friend-text">
                                        <span className="social-friend-name">{f.username}</span>
                                        <span className={`social-friend-status ${f.presence}`}>{presenceText(f)}</span>
                                    </span>
                                    {f.unread > 0 && f.username !== friend?.username && <span className="social-unread">{f.unread}</span>}
                                </button>
                            </li>
                        ))}
                        {friends.length > 0 && visible.length === 0 && <li className="social-empty">Personne ne s'appelle comme ça.</li>}
                        {friends.length === 0 && <li className="social-empty">Pas encore d'ami·e·s : ajoute quelqu'un par son pseudo.</li>}
                    </ul>

                    <AddFriend onAdded={refresh}/>
                </aside>

                {friend ? (
                    <Conversation key={friend.username} friend={friend} duelGames={overview.duelGames} onChange={refresh}/>
                ) : (
                    <section className="social-chat social-no-friend">
                        <div className="social-chat-empty">
                            <FaUserFriends aria-hidden/>
                            <p>Ajoute des ami·e·s pour discuter avec eux<br/>et les défier sur les mêmes grilles.</p>
                        </div>
                    </section>
                )}
            </div>
        </div>
    );
}

function presenceText(f: SocialFriend) {
    if (f.presence === "playing") return f.gameName ? `Joue au ${f.gameName}` : "En partie";
    return PRESENCE_LABEL[f.presence];
}

// Demandes d'ami·e reçues : Accepter / Refuser
function Requests({overview, onChange}: { overview: SocialOverview; onChange: () => void }) {
    const [busy, setBusy] = useState<string | null>(null);
    if (overview.incoming.length === 0) return null;
    const act = async (username: string, action: () => Promise<void>) => {
        setBusy(username);
        try {
            await action();
            onChange();
        } finally {
            setBusy(null);
        }
    };
    return (
        <div className="social-requests">
            <h2>Demandes ({overview.incoming.length})</h2>
            {overview.incoming.map(r => (
                <div key={r.username} className="social-request">
                    <Link to={playerPath(r.username)}><Avatar seed={r.avatar} fallback={r.username} size={2.2} level={r.level}/></Link>
                    <span className="social-request-name">{r.username}</span>
                    <button type="button" className="icon-btn accept" title="Accepter" disabled={busy !== null}
                            onClick={() => void act(r.username, () => friendsStore.accept(r.username))}><FaCheck/></button>
                    <button type="button" className="icon-btn" title="Refuser" disabled={busy !== null}
                            onClick={() => void act(r.username, () => friendsStore.remove(r.username))}><FaTimes/></button>
                </div>
            ))}
        </div>
    );
}

const REQUEST_MESSAGES = {
    requested: "Demande envoyée.",
    accepted: "Vous êtes maintenant ami·e·s !",
    already_requested: "Tu lui as déjà envoyé une demande.",
    already_friends: "Vous êtes déjà ami·e·s.",
} as const;

function AddFriend({onAdded}: { onAdded: () => void }) {
    const [open, setOpen] = useState(false);
    const [name, setName] = useState("");
    const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
    const [busy, setBusy] = useState(false);

    if (!open) {
        return <button type="button" className="social-add" onClick={() => setOpen(true)}><FaUserPlus aria-hidden/> Ajouter un·e ami·e</button>;
    }
    const submit = async (e: FormEvent) => {
        e.preventDefault();
        const username = name.trim();
        if (!username) return;
        setBusy(true);
        try {
            const result = await friendsStore.request(username);
            setMessage({ok: true, text: REQUEST_MESSAGES[result]});
            setName("");
            onAdded();
        } catch (err) {
            setMessage({ok: false, text: (err as Error).message});
        } finally {
            setBusy(false);
        }
    };
    return (
        <form className="social-add-form" onSubmit={e => void submit(e)}>
            <div className="social-add-row">
                <input autoFocus value={name} onChange={e => setName(e.target.value)} maxLength={30} spellCheck={false}
                       placeholder="Pseudo" aria-label="Pseudo du joueur à ajouter"/>
                <button type="submit" disabled={busy || !name.trim()} title="Envoyer la demande"><FaUserPlus/></button>
                <button type="button" className="icon-btn" title="Fermer" onClick={() => {
                    setOpen(false);
                    setMessage(null);
                }}><FaTimes/></button>
            </div>
            {message && <p className={message.ok ? "social-ok" : "social-error"} role="status">{message.text}</p>}
        </form>
    );
}

// Discussion et fiche d'un·e ami·e (remontées à neuf quand on change d'ami·e)
function Conversation({friend, duelGames, onChange}: { friend: SocialFriend; duelGames: DuelGame[]; onChange: () => void }) {
    const [messages, setMessages] = useState<SocialMessage[] | null>(null);

    const load = useCallback(async (signal?: AbortSignal) => {
        setMessages(await socialService.messages(friend.username, signal));
    }, [friend.username]);
    usePolling(load, CONVERSATION_REFRESH_MS, friend.username);

    // les non lus de cet·te ami·e viennent d'être lus : la liste se met à jour
    const hadUnread = friend.unread > 0;
    useEffect(() => {
        if (hadUnread && messages) onChange();
    }, [hadUnread, messages, onChange]);

    return (
        <>
            <Chat friend={friend} messages={messages} onSent={m => setMessages(list => [...(list ?? []), m])}/>
            <FriendPanel friend={friend} messages={messages ?? []} duelGames={duelGames} onDuel={() => {
                void load();
                onChange();
            }}/>
        </>
    );
}

function Chat({friend, messages, onSent}: { friend: SocialFriend; messages: SocialMessage[] | null; onSent: (m: SocialMessage) => void }) {
    const [draft, setDraft] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [sending, setSending] = useState(false);
    const scroller = useRef<HTMLDivElement>(null);
    const count = messages?.length ?? 0;

    useEffect(() => {
        scroller.current?.scrollTo({top: scroller.current.scrollHeight, behavior: "smooth"});
    }, [count]);

    const submit = async (e: FormEvent) => {
        e.preventDefault();
        const text = draft.trim();
        if (!text || sending) return;
        setSending(true);
        setError(null);
        try {
            onSent(await socialService.send(friend.username, text));
            setDraft("");
        } catch (err) {
            setError((err as Error).message);
        } finally {
            setSending(false);
        }
    };

    return (
        <section className="social-chat">
            <header className="social-chat-head">
                <Link to={playerPath(friend.username)} className="social-friend-avatar">
                    <Avatar seed={friend.avatar} fallback={friend.username} size={2.4} level={friend.level}/>
                    <i className={`presence-dot ${friend.presence}`}/>
                </Link>
                <div>
                    <strong>{friend.username}</strong>
                    <span className={`social-friend-status ${friend.presence}`}>{presenceText(friend)}</span>
                </div>
            </header>

            <div className="social-messages" ref={scroller}>
                {messages === null && <p className="social-chat-empty">Chargement…</p>}
                {messages?.length === 0 && (
                    <div className="social-chat-empty">
                        <FaCommentDots aria-hidden/>
                        <p>Aucun message avec {friend.username} pour l'instant.<br/>Dis bonjour, ou lance-lui un défi !</p>
                    </div>
                )}
                {messages?.map(m => (
                    <div key={m.id} className={`social-msg ${m.from}`}>
                        {m.kind === "text"
                            ? <p className="social-bubble">{m.text}</p>
                            : <ChallengeCard message={m} friend={friend.username}/>}
                        <time dateTime={m.at}>{messageTime(m.at)}</time>
                    </div>
                ))}
            </div>

            {error && <p className="social-error social-compose-error" role="alert">{error}</p>}
            <form className="social-compose" onSubmit={e => void submit(e)}>
                <input value={draft} onChange={e => setDraft(e.target.value)} maxLength={500}
                       placeholder={`Écrire à ${friend.username}…`}/>
                <button type="submit" disabled={!draft.trim() || sending} aria-label="Envoyer"><FaPaperPlane/></button>
            </form>
        </section>
    );
}

function ChallengeCard({message, friend}: { message: ChallengeMessage; friend: string }) {
    const {gameCode, gameName, difficulty, myMs, theirMs} = message;
    const status = challengeStatus(message);
    const duel = difficulty !== null;
    const who = message.from === "me"
        ? (duel ? `Tu as défié ${friend}` : `Tu as envoyé ta grille`)
        : `${friend} te défie`;
    return (
        <div className={`social-challenge ${status}`}>
            <div className="social-challenge-top">
                <img src={`/gameIcons/${gameCode}.svg`} alt=""/>
                <div>
                    <span className="social-challenge-who">{who}</span>
                    <strong>{gameName} · {difficulty ?? "sa grille"}</strong>
                </div>
            </div>
            <div className="social-challenge-times">
                <span><small>Toi</small>{myMs !== null ? shareTime(myMs) : "—"}</span>
                <span className="vs">VS</span>
                <span><small>{friend}</small>{theirMs !== null ? shareTime(theirMs) : "—"}</span>
            </div>
            {status === "toPlay" && (
                <Link to={challengePath(message.challengeId)} className="social-challenge-play">
                    <FaBolt aria-hidden/> {message.from === "me" ? "Jouer ma grille" : "Relever le défi"}
                </Link>
            )}
            {status === "pending" && <p className="social-challenge-state"><FaHourglassHalf aria-hidden/> En attente de {friend}</p>}
            {status === "won" && <p className="social-challenge-state"><FaTrophy aria-hidden/> Victoire !</p>}
            {status === "lost" && <p className="social-challenge-state">Défaite… revanche ?</p>}
            {status === "tie" && <p className="social-challenge-state">Égalité parfaite !</p>}
        </div>
    );
}

function FriendPanel({friend, messages, duelGames, onDuel}: {
    friend: SocialFriend;
    messages: SocialMessage[];
    duelGames: DuelGame[];
    onDuel: () => void;
}) {
    const [gameCode, setGameCode] = useState(duelGames[0]?.code ?? "SUDOKU");
    const [difficulty, setDifficulty] = useState("Moyen");
    const [sending, setSending] = useState(false);
    const [sent, setSent] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const game = duelGames.find(g => g.code === gameCode) ?? duelGames[0];
    // difficulté proposée pour ce jeu (Standard pour les jeux sans niveaux)
    const chosen = game?.difficulties.includes(difficulty) ? difficulty : game?.difficulties[0] ?? difficulty;
    const {wins, losses} = friend.record;
    const total = wins + losses;
    const ongoing = messages.filter(m => m.kind === "challenge" && (challengeStatus(m) === "toPlay" || challengeStatus(m) === "pending")).length;

    const launch = async () => {
        if (!game) return;
        setSending(true);
        setError(null);
        try {
            setSent(await socialService.duel(friend.username, game.code, chosen));
            onDuel();
        } catch (err) {
            setError((err as Error).message);
        } finally {
            setSending(false);
        }
    };

    return (
        <aside className="friend-sidebar">
            <Link to={playerPath(friend.username)} className="friend-sidebar-id">
                <Avatar seed={friend.avatar} fallback={friend.username} size={5} level={friend.level} showLevel/>
                <h2>{friend.username}</h2>
                <span className={`social-friend-status ${friend.presence}`}>{presenceText(friend)}</span>
            </Link>

            <div className="social-record">
                <h3>Vos duels</h3>
                <div className="social-record-score">
                    <span className="me">{wins}</span>
                    <span className="sep">–</span>
                    <span className="them">{losses}</span>
                </div>
                <div className="social-record-bar" aria-hidden>
                    <span style={{width: `${total ? (wins / total) * 100 : 50}%`}}/>
                </div>
                <div className="social-record-legend"><span>Toi</span><span>{friend.username}</span></div>
                {ongoing > 0 && <p className="social-record-ongoing">{ongoing} défi{ongoing > 1 ? "s" : ""} en cours</p>}
            </div>

            <div className="social-defy">
                <h3>Défier {friend.username}</h3>
                <div className="social-game-picker">
                    {groupGamesByType(duelGames).map(({type, games}) => {
                        const {label, icon: Icon} = GAME_TYPES[type];
                        return (
                            <div key={type} className="social-game-group">
                                <h4><Icon aria-hidden/> {label}</h4>
                                <div className="social-game-grid">
                                    {games.map(g => (
                                        <button key={g.code} type="button" title={g.name}
                                                className={g.code === game?.code ? "selected" : ""} onClick={() => {
                                            setGameCode(g.code);
                                            setSent(null);
                                        }}>
                                            <img src={`/gameIcons/${g.code}.svg`} alt={g.name}/>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        );
                    })}
                </div>
                <p className="social-defy-game">{game?.name}</p>
                <div className="social-difficulty">
                    {game?.difficulties.map(d => (
                        <button key={d} type="button" className={d === chosen ? "selected" : ""}
                                onClick={() => {
                                    setDifficulty(d);
                                    setSent(null);
                                }}>{d}</button>
                    ))}
                </div>
                {sent ? (
                    <Link to={challengePath(sent)} className="social-defy-send">
                        <FaBolt aria-hidden/> Défi envoyé, jouer ma grille
                    </Link>
                ) : (
                    <button type="button" className="social-defy-send" disabled={sending || !game} onClick={() => void launch()}>
                        <FaBolt aria-hidden/> {sending ? "Préparation de la grille…" : "Lancer le défi"}
                    </button>
                )}
                {error && <p className="social-error" role="alert">{error}</p>}
                <p className="social-hint">Vous jouez la même grille, chacun quand il veut : le meilleur temps gagne.</p>
            </div>
        </aside>
    );
}
