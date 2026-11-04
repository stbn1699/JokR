/**
 * Page d'un joueur (/joueur/:pseudo), ouverte depuis les classements : son icône et son niveau,
 * ses crédits, sa place au classement, ses stats par jeu (niveau, victoires, meilleur temps),
 * ses défis du jour et ses dernières victoires. Même présentation que la page Profil.
 */

import "../UserSection/Profile/Profile.scss";
import "./PlayerProfile.scss";
import {useEffect, useState} from "react";
import {Link, useParams} from "react-router-dom";
import {FaCalendarDay, FaCoins, FaMedal, FaTrophy} from "react-icons/fa";
import {useAuth} from "../../Context/authContext.ts";
import {type PlayerProfile as Profile, playerService} from "../../Services/player.service.ts";
import {xpToNextLevel} from "../../Services/leveling.ts";
import {formatDuration} from "../../Services/format.ts";
import {ApiError} from "../../api/api.ts";
import Avatar from "../Avatar/Avatar.tsx";
import Loader from "../Loader/Loader.tsx";

const fmt = (n: number) => n.toLocaleString("fr-FR");
const gridLabel = (code: string, size: number) => (code === "RIKUDO" ? `${size} cases` : `${size}×${size}`);
const ordinal = (rank: number) => <>{rank}<sup>{rank === 1 ? "er" : "e"}</sup></>;

export default function PlayerProfile() {
    const {username = ""} = useParams();
    const {username: me} = useAuth();
    const [player, setPlayer] = useState<Profile | null>(null);
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
            <main className="profile">
                <section className="profile-card">
                    <p className="profile-error" role="alert">{error}</p>
                    <Link to="/classements" className="player-back">Retour aux classements</Link>
                </section>
            </main>
        );
    }
    if (!shown) return <Loader label="Chargement du profil…"/>;

    const xpNext = xpToNextLevel(shown.level);
    const played = shown.games.filter(g => g.wins > 0);

    return (
        <main className="profile player-profile">
            <section className="profile-card fade-in">
                <div className="profile-head">
                    <div className="profile-avatar">
                        <Avatar seed={shown.avatar} fallback={shown.username} size={7.5} level={shown.level} showLevel/>
                    </div>
                    <div className="profile-head-info">
                        <h1>{shown.username}</h1>
                        <p className="profile-level">Niveau {shown.level}</p>
                        <div className="profile-xp" title={`${shown.xp} / ${xpNext} xp`}>
                            <div className="profile-xp-fill" style={{width: `${Math.min(100, (shown.xp / xpNext) * 100)}%`}}/>
                        </div>
                        <p className="profile-xp-label">{fmt(shown.xp)} / {fmt(xpNext)} xp</p>
                        <p className="player-since">
                            Joue depuis le {new Date(shown.createdAt).toLocaleDateString("fr-FR", {day: "numeric", month: "long", year: "numeric"})}
                        </p>
                        {me === shown.username && <Link to="/profile" className="player-mine">C'est toi · ouvrir ton profil</Link>}
                    </div>
                </div>

                {/* Chiffres clés */}
                <div className="player-tiles">
                    <div className="player-tile">
                        <FaMedal aria-hidden className="player-tile-icon rank"/>
                        <strong>{shown.xpRank ? ordinal(shown.xpRank.rank) : "–"}</strong>
                        <span>{shown.xpRank ? `sur ${fmt(shown.xpRank.total)} joueurs` : "classement XP"}</span>
                    </div>
                    <div className="player-tile">
                        <FaTrophy aria-hidden className="player-tile-icon wins"/>
                        <strong>{fmt(shown.wins)}</strong>
                        <span>victoire{shown.wins > 1 ? "s" : ""}</span>
                    </div>
                    <div className="player-tile">
                        <FaCoins aria-hidden className="player-tile-icon credits"/>
                        <strong>{fmt(shown.credits)}</strong>
                        <span>crédit{shown.credits > 1 ? "s" : ""}</span>
                    </div>
                    <div className="player-tile">
                        <FaCalendarDay aria-hidden className="player-tile-icon daily"/>
                        <strong>{fmt(shown.daily.completions)}</strong>
                        <span>
                            défi{shown.daily.completions > 1 ? "s" : ""} du jour
                            {shown.daily.firsts > 0 && <> · {fmt(shown.daily.firsts)} fois 1<sup>er</sup></>}
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

                {shown.recent.length > 0 && (
                    <>
                        <h2>Dernières victoires</h2>
                        <table className="profile-stats profile-results">
                            <thead>
                            <tr><th>Jeu</th><th>Grille</th><th>Temps</th><th>Date</th></tr>
                            </thead>
                            <tbody>
                            {shown.recent.map((r, i) => (
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
                )}

                <Link to="/classements" className="player-back">Retour aux classements</Link>
            </section>
        </main>
    );
}
