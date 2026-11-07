/**
 * Cloche des notifications (header, joueur connecté) :
 * - pastille rouge avec le nombre de notifications non lues
 * - un clic ouvre le panneau des dernières notifications (et les marque comme vues) ;
 *   Échap ou un clic ailleurs le ferme
 * - une notification qui arrive s'annonce par un toast sous le header (« Voir » ouvre le panneau)
 *
 * Résultats des défis : une seule notification par jour, avec la place finale sur chaque jeu joué.
 * Si elle rapporte de l'XP (50 premiers), une popup l'annonce à la place du toast (DailyRewardPopup).
 * Amis : demande reçue (Accepter / Refuser directement dans le panneau), demande acceptée.
 * Défis entre amis : grille reçue (Relever le défi), défi du jour, résultat d'un défi envoyé.
 */

import "./Notifications.scss";
import {useEffect, useRef, useState} from "react";
import {Link} from "react-router-dom";
import {FaBell, FaFlagCheckered, FaMedal, FaTimes, FaUserFriends} from "react-icons/fa";
import {
    type AppNotification,
    type ChallengeNotification,
    type DailyResultsNotification,
    type FriendNotification,
    isDailyResults,
    isFriendNotification,
} from "../../Services/notification.service.ts";
import {challengePath} from "../../Services/challenge.service.ts";
import {shareTime} from "../../Services/share.ts";
import {friendsStore, useFriends} from "../../Services/friends.service.ts";
import {playerPath} from "../../Services/player.service.ts";
import Avatar from "../Avatar/Avatar.tsx";
import {formatDuration} from "../../Services/format.ts";
import {useNotifications} from "./useNotifications.ts";
import DailyRewardPopup from "./DailyRewardPopup.tsx";
import {useAuth} from "../../Context/authContext.ts";
import {useWhatsNewOpen} from "../../Services/popupQueue.ts";

// Durée d'affichage du toast
const TOAST_MS = 9000;

const ordinal = (rank: number) => <>{rank}<sup>{rank === 1 ? "er" : "e"}</sup></>;

const dayLabel = (date: string) =>
    new Date(`${date}T12:00:00`).toLocaleDateString("fr-FR", {weekday: "long", day: "numeric", month: "long"});

// « il y a 5 min », « il y a 3 h », « il y a 2 j »
function ago(iso: string): string {
    const minutes = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
    if (minutes < 1) return "à l'instant";
    if (minutes < 60) return `il y a ${minutes} min`;
    const hours = Math.round(minutes / 60);
    if (hours < 24) return `il y a ${hours} h`;
    return `il y a ${Math.round(hours / 24)} j`;
}

// Classement du défi d'un jour, pour un jeu
const dailyBoardLink = (code: string, date: string) =>
    `/classements?onglet=defi&jeu=${code.toLowerCase()}&mois=${date.slice(0, 7)}&date=${date}`;

// Résumé en une ligne (toast) : la meilleure place
function dailySummary(n: DailyResultsNotification) {
    const best = n.data.games[0];
    if (!best) return null;
    const others = n.data.games.length - 1;
    return <>Tu termines {ordinal(best.rank)} sur {best.total} au {best.name}{others > 0 && <> (et {others} autre{others > 1 ? "s" : ""} défi{others > 1 ? "s" : ""})</>}</>;
}

export default function NotificationBell({enabled}: { enabled: boolean }) {
    const {items, rewards, unread, toast, closeToast, markAllRead, markRead} = useNotifications(enabled);
    const [open, setOpen] = useState(false);
    // Popup des XP fermée pendant cette visite (le serveur les marque vues)
    const [rewardsClosed, setRewardsClosed] = useState(false);
    // Profil chargé : niveau et XP actuels connus (pour rejouer l'animation du header)
    const profileLoaded = useAuth().username !== null;
    // La popup des nouveautés passe d'abord
    const whatsNewOpen = useWhatsNewOpen();
    // Notifications non lues à l'ouverture du panneau : mises en avant tant qu'il est ouvert
    const [freshIds, setFreshIds] = useState<string[]>([]);
    const rootRef = useRef<HTMLDivElement>(null);

    const openPanel = () => {
        setFreshIds(items.filter(n => n.readAt === null).map(n => n.id));
        setOpen(true);
        closeToast();
        markAllRead();
    };

    // Fermeture : clic ailleurs ou Échap
    useEffect(() => {
        if (!open) return;
        const onClick = (e: MouseEvent) => {
            if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
        };
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") setOpen(false);
        };
        document.addEventListener("mousedown", onClick);
        document.addEventListener("keydown", onKey);
        return () => {
            document.removeEventListener("mousedown", onClick);
            document.removeEventListener("keydown", onKey);
        };
    }, [open]);

    // Le toast part tout seul
    useEffect(() => {
        if (!toast) return;
        const timer = window.setTimeout(closeToast, TOAST_MS);
        return () => window.clearTimeout(timer);
    }, [toast, closeToast]);

    if (!enabled) return null;

    return (
        <div className="notifications" ref={rootRef}>
            <button type="button" className={`notif-bell ${unread > 0 ? "has-unread" : ""}`}
                    aria-label={unread > 0 ? `Notifications, ${unread} non lue${unread > 1 ? "s" : ""}` : "Notifications"}
                    aria-expanded={open} onClick={() => (open ? setOpen(false) : openPanel())}>
                <FaBell aria-hidden/>
                {unread > 0 && <span className="notif-count" aria-hidden>{unread > 9 ? "9+" : unread}</span>}
            </button>

            {open && (
                <div className="notif-panel" role="dialog" aria-label="Notifications">
                    <div className="notif-panel-head">
                        <strong>Notifications</strong>
                        <button type="button" className="notif-close" aria-label="Fermer" onClick={() => setOpen(false)}>
                            <FaTimes aria-hidden/>
                        </button>
                    </div>
                    {items.length === 0 ? (
                        <p className="notif-empty">Rien pour l'instant. Tes places aux défis du jour arriveront ici, chaque soir à minuit.</p>
                    ) : (
                        <ul className="notif-list">
                            {items.map(n => (
                                <li key={n.id} className={freshIds.includes(n.id) ? "fresh" : ""}>
                                    <NotificationItem notification={n} onNavigate={() => setOpen(false)}/>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            )}

            {rewards.length > 0 && !rewardsClosed && profileLoaded && !whatsNewOpen && (
                <DailyRewardPopup rewards={rewards} onClose={() => {
                    setRewardsClosed(true);
                    markRead(rewards.map(r => r.id));
                }}/>
            )}

            {toast && !open && (
                <div className="notif-toast" role="status">
                    {isDailyResults(toast) ? <FaBell aria-hidden className="notif-toast-icon"/>
                        : !isFriendNotification(toast) ? <FaFlagCheckered aria-hidden className="notif-toast-icon friend"/>
                        : <FaUserFriends aria-hidden className="notif-toast-icon friend"/>}
                    <div className="notif-toast-text">
                        {isDailyResults(toast) ? (
                            <>
                                <strong>Défis du {dayLabel(toast.data.date)} terminés</strong>
                                <span>{dailySummary(toast)}</span>
                            </>
                        ) : !isFriendNotification(toast) ? (
                            <>
                                <strong>{challengeTitle(toast)}</strong>
                                <span>{challengeText(toast)}</span>
                            </>
                        ) : toast.kind === "friend_request" ? (
                            <>
                                <strong>Demande d'ami·e</strong>
                                <span>{toast.data.username} veut être ton ami·e</span>
                            </>
                        ) : (
                            <>
                                <strong>Nouvel·le ami·e</strong>
                                <span>{toast.data.username} a accepté ta demande</span>
                            </>
                        )}
                    </div>
                    <button type="button" className="notif-toast-open" onClick={openPanel}>Voir</button>
                    <button type="button" className="notif-close" aria-label="Fermer" onClick={closeToast}>
                        <FaTimes aria-hidden/>
                    </button>
                </div>
            )}
        </div>
    );
}

function NotificationItem({notification, onNavigate}: { notification: AppNotification; onNavigate: () => void }) {
    if (isFriendNotification(notification)) return <FriendItem notification={notification} onNavigate={onNavigate}/>;
    if (!isDailyResults(notification)) return <ChallengeItem notification={notification} onNavigate={onNavigate}/>;
    const n = notification;
    return (
        <div className="notif-daily">
            <div className="notif-daily-head">
                <span>Défis du {dayLabel(n.data.date)}</span>
                <small>{ago(n.createdAt)}</small>
            </div>
            {(n.data.xp ?? 0) > 0 && <p className="notif-daily-xp">+{n.data.xp} XP gagnés</p>}
            <ul className="notif-daily-games">
                {n.data.games.map(g => (
                    <li key={g.code}>
                        <Link to={dailyBoardLink(g.code, n.data.date)} onClick={onNavigate}
                              title={`Classement du ${g.name} ce jour-là`}>
                            <span className={`notif-rank ${g.rank <= 3 ? `podium-${g.rank}` : ""}`}>
                                {g.rank <= 3 ? <FaMedal aria-hidden/> : null}
                                {ordinal(g.rank)}
                            </span>
                            <span className="notif-game">{g.name}</span>
                            <span className="notif-detail">sur {g.total} · {formatDuration(g.durationMs)}</span>
                        </Link>
                    </li>
                ))}
            </ul>
        </div>
    );
}

// Demande d'ami reçue (avec Accepter / Refuser tant qu'elle attend), ou demande acceptée
function FriendItem({notification: n, onNavigate}: { notification: FriendNotification; onNavigate: () => void }) {
    const {userId} = useAuth();
    // les listes d'amis disent si la demande attend encore une réponse
    useFriends(userId);
    const relation = friendsStore.relation(n.data.username);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const act = async (action: () => Promise<unknown>) => {
        setBusy(true);
        setError(null);
        try {
            await action();
        } catch (err) {
            setError((err as Error).message);
        } finally {
            setBusy(false);
        }
    };

    return (
        <div className="notif-friend">
            <Link to={playerPath(n.data.username)} onClick={onNavigate} className="notif-friend-avatar">
                <Avatar seed={n.data.avatar} fallback={n.data.username} size={2.4} level={n.data.level}/>
            </Link>
            <div className="notif-friend-body">
                <div className="notif-daily-head">
                    <span>
                        <Link to={playerPath(n.data.username)} onClick={onNavigate}>{n.data.username}</Link>
                        {n.kind === "friend_request" ? " veut être ton ami·e" : " a accepté ta demande d'ami·e"}
                    </span>
                    <small>{ago(n.createdAt)}</small>
                </div>
                {n.kind === "friend_request" && (
                    relation === "incoming" ? (
                        <div className="notif-friend-actions">
                            <button type="button" className="accept" disabled={busy}
                                    onClick={() => void act(() => friendsStore.accept(n.data.username))}>Accepter</button>
                            <button type="button" disabled={busy}
                                    onClick={() => void act(() => friendsStore.remove(n.data.username))}>Refuser</button>
                        </div>
                    ) : (
                        <small className="notif-friend-state">{relation === "friends" ? "Vous êtes ami·e·s" : "Demande traitée"}</small>
                    )
                )}
                {error && <small className="notif-friend-error">{error}</small>}
            </div>
        </div>
    );
}

// ---------- Défis entre amis
const challengeTitle = (n: ChallengeNotification) =>
    n.kind === "challenge_result" ? `${n.data.by.username} a relevé ton défi` : `${n.data.from.username} te défie`;

function challengeText(n: ChallengeNotification) {
    if (n.kind === "friend_challenge") return <>Sa grille de {n.data.gameName}, faite en {shareTime(n.data.senderMs)}. À toi !</>;
    if (n.kind === "daily_challenge") return <>Au {n.data.gameName} du jour : bats son temps ({shareTime(n.data.senderMs)}) !</>;
    const won = n.data.playerMs < n.data.senderMs;
    return <>{n.data.gameName} : {shareTime(n.data.playerMs)} contre ton {shareTime(n.data.senderMs)} · {won ? `${n.data.by.username} te bat` : n.data.playerMs > n.data.senderMs ? "tu restes devant" : "égalité"}</>;
}

// Lien d'une notification de défi : la grille à faire, le défi du jour, ou la page de l'ami·e
function challengeLink(n: ChallengeNotification) {
    if (n.kind === "friend_challenge") return {to: challengePath(n.data.challengeId), label: "Relever le défi"};
    if (n.kind === "daily_challenge") return {to: `/defi/${n.data.gameCode}`, label: "Jouer le défi du jour"};
    return {to: playerPath(n.data.by.username), label: "Voir son profil"};
}

function ChallengeItem({notification: n, onNavigate}: { notification: ChallengeNotification; onNavigate: () => void }) {
    const who = n.kind === "challenge_result" ? n.data.by : n.data.from;
    const link = challengeLink(n);
    return (
        <div className="notif-friend notif-challenge">
            <Link to={playerPath(who.username)} onClick={onNavigate} className="notif-friend-avatar">
                <Avatar seed={who.avatar} fallback={who.username} size={2.4} level={who.level}/>
            </Link>
            <div className="notif-friend-body">
                <div className="notif-daily-head">
                    <span><strong>{challengeTitle(n)}</strong></span>
                    <small>{ago(n.createdAt)}</small>
                </div>
                <p className="notif-challenge-text">{challengeText(n)}</p>
                <Link to={link.to} onClick={onNavigate} className="notif-challenge-link">{link.label}</Link>
            </div>
        </div>
    );
}
