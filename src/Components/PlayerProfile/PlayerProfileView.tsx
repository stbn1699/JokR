/**
 * Page d'un joueur, la même pour tout le monde : depuis les classements (/joueur/:pseudo) et pour
 * son propre profil (onglet « Profil » de /profile).
 * - Toujours visibles : icône (contour selon le niveau), pseudo, niveau
 * - Si le joueur les montre : barre d'XP, date d'inscription, chiffres clés (classement, victoires,
 *   crédits, défis), stats par jeu ; et ses dernières victoires. Sinon, un encart « privé » à la place.
 * - Le joueur connecté voit toujours tout de sa propre page, avec un rappel de ce que les autres ne voient pas.
 */

import "../UserSection/Profile/Profile.scss";
import "./PlayerProfile.scss";
import {type ReactNode, useEffect, useState} from "react";
import {Link} from "react-router-dom";
import {FaCalendarDay, FaCoins, FaLock, FaMedal, FaTrophy} from "react-icons/fa";
import {type PlayerProfile, playerService} from "../../Services/player.service.ts";
import {xpToNextLevel} from "../../Services/leveling.ts";
import {formatDuration} from "../../Services/format.ts";
import {ApiError} from "../../api/api.ts";
import type {Privacy} from "../../Models/user.model.ts";
import Avatar from "../Avatar/Avatar.tsx";
import FriendButton from "./FriendButton.tsx";
import Loader from "../Loader/Loader.tsx";

const fmt = (n: number) => n.toLocaleString("fr-FR");
const gridLabel = (code: string, size: number) => (code === "RIKUDO" ? `${size} cases` : `${size}×${size}`);
const ordinal = (rank: number) => <>{rank}<sup>{rank === 1 ? "er" : "e"}</sup></>;

type PlayerProfileViewProps = {
    username: string;
    // Son propre profil : réglages de visibilité (rappel de ce que les autres voient) et action sur l'icône
    privacy?: Privacy;
    // Bouton sur l'icône (ex. changer d'icône depuis son profil)
    avatarAction?: ReactNode;
    // Lien de retour en bas (aucun sur son propre profil)
    backLink?: boolean;
    // Lien vers les réglages de visibilité (son propre profil)
    onOpenSettings?: () => void;
};

export default function PlayerProfileView({username, privacy, avatarAction, backLink = true, onOpenSettings}: PlayerProfileViewProps) {
    const [player, setPlayer] = useState<PlayerProfile | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const controller = new AbortController();
        playerService.profile(username, controller.signal)
            .then(p => {
                setPlayer(p);
                setError(null);
            })
            .catch((err: Error) => {
                if (err.name === "AbortError") return;
                setError(err instanceof ApiError && err.status === 404
                    ? "Ce joueur n'existe pas (ou plus)."
                    : err.message || "Impossible de charger ce profil.");
            });
        return () => controller.abort();
    }, [username]);

    // Profil d'un autre joueur pas encore chargé (ou ancien profil encore affiché)
    const shown = player?.username === username ? player : null;

    if (error) {
        return (
            <section className="profile-card">
                <p className="profile-error" role="alert">{error}</p>
                {backLink && <Link to="/classements" className="player-back">Retour aux classements</Link>}
            </section>
        );
    }
    if (!shown) return <Loader label="Chargement du profil…"/>;

    const {stats, recent} = shown;
    const xpNext = xpToNextLevel(shown.level);
    const played = stats?.games.filter(g => g.wins > 0) ?? [];
    // Son propre profil : ce que les autres joueurs ne voient pas
    const hiddenForOthers = shown.isOwner && privacy
        ? [!privacy.showStats && "tes statistiques", !privacy.showHistory && "tes dernières victoires"].filter(Boolean)
        : [];

    return (
        <section className="profile-card fade-in">
            <div className="profile-head">
                <div className="profile-avatar">
                    <Avatar seed={shown.avatar} fallback={shown.username} size={7.5} level={shown.level} showLevel/>
                    {avatarAction}
                </div>
                <div className="profile-head-info">
                    <h1>{shown.username}</h1>
                    <p className="profile-level">Niveau {shown.level}</p>
                    {stats && (
                        <>
                            <div className="profile-xp" title={`${stats.xp} / ${xpNext} xp`}>
                                <div className="profile-xp-fill" style={{width: `${Math.min(100, (stats.xp / xpNext) * 100)}%`}}/>
                            </div>
                            <p className="profile-xp-label">{fmt(stats.xp)} / {fmt(xpNext)} xp</p>
                            <p className="player-since">
                                Joue depuis le {new Date(stats.createdAt).toLocaleDateString("fr-FR", {day: "numeric", month: "long", year: "numeric"})}
                            </p>
                        </>
                    )}
                </div>
            </div>

            {/* Autre joueur, visiteur connecté : demande d'ami, acceptation, retrait */}
            {!shown.isOwner && shown.friendship !== null && <FriendButton username={shown.username} initial={shown.friendship}/>}

            {hiddenForOthers.length > 0 && (
                <p className="player-owner-note">
                    <FaLock aria-hidden/> Les autres joueurs ne voient pas {hiddenForOthers.join(" ni ")}.
                    {onOpenSettings && <> <button type="button" onClick={onOpenSettings}>Modifier</button></>}
                </p>
            )}

            {stats ? (
                <>
                    {/* Chiffres clés */}
                    <div className="player-tiles">
                        <div className="player-tile">
                            <FaMedal aria-hidden className="player-tile-icon rank"/>
                            <strong>{stats.xpRank ? ordinal(stats.xpRank.rank) : "–"}</strong>
                            <span>{stats.xpRank ? `sur ${fmt(stats.xpRank.total)} joueurs` : "classement XP"}</span>
                        </div>
                        <div className="player-tile">
                            <FaTrophy aria-hidden className="player-tile-icon wins"/>
                            <strong>{fmt(stats.wins)}</strong>
                            <span>victoire{stats.wins > 1 ? "s" : ""}</span>
                        </div>
                        <div className="player-tile">
                            <FaCoins aria-hidden className="player-tile-icon credits"/>
                            <strong>{fmt(stats.credits)}</strong>
                            <span>crédit{stats.credits > 1 ? "s" : ""}</span>
                        </div>
                        <div className="player-tile">
                            <FaCalendarDay aria-hidden className="player-tile-icon daily"/>
                            <strong>{fmt(stats.daily.completions)}</strong>
                            <span>
                                défi{stats.daily.completions > 1 ? "s" : ""} du jour
                                {stats.daily.firsts > 0 && <> · {fmt(stats.daily.firsts)} fois 1<sup>er</sup></>}
                            </span>
                        </div>
                    </div>

                    <h2>Jeux</h2>
                    {played.length === 0 ? <p>Aucune victoire pour l'instant.</p> : (
                        <table className="profile-stats">
                            <thead>
                            <tr><th>Jeu</th><th>Niveau</th><th>Victoires</th><th>Meilleur temps</th></tr>
                            </thead>
                            <tbody>
                            {played.map(g => (
                                <tr key={g.code}>
                                    <td>{g.name}</td>
                                    <td>{g.level}</td>
                                    <td>{fmt(g.wins)}</td>
                                    <td>
                                        {g.bestMs === null ? "–" : <>
                                            {formatDuration(g.bestMs)}
                                            {g.bestGridSize !== null && <small className="player-grid"> · {gridLabel(g.code, g.bestGridSize)}</small>}
                                        </>}
                                    </td>
                                </tr>
                            ))}
                            </tbody>
                        </table>
                    )}
                </>
            ) : <PrivateBlock what="ses statistiques" username={shown.username}/>}

            {recent ? recent.length > 0 && (
                <>
                    <h2>Dernières victoires</h2>
                    <table className="profile-stats profile-results">
                        <thead>
                        <tr><th>Jeu</th><th>Grille</th><th>Temps</th><th>Date</th></tr>
                        </thead>
                        <tbody>
                        {recent.map((r, i) => (
                            <tr key={i}>
                                <td>{r.name}</td>
                                <td>{gridLabel(r.code, r.gridSize)}</td>
                                <td>{formatDuration(r.durationMs)}</td>
                                <td>{new Date(r.finishedAt).toLocaleDateString("fr-FR")}</td>
                            </tr>
                        ))}
                        </tbody>
                    </table>
                </>
            ) : <PrivateBlock what="ses dernières victoires" username={shown.username}/>}

            {backLink && <Link to="/classements" className="player-back">Retour aux classements</Link>}
        </section>
    );
}

// À la place d'une partie masquée par le joueur
function PrivateBlock({what, username}: { what: string; username: string }) {
    return (
        <div className="player-private">
            <FaLock aria-hidden/>
            <span><strong>Privé</strong> · {username} ne montre pas {what}.</span>
        </div>
    );
}
