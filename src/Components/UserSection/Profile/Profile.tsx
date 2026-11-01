/**
 * Page Profil - joueur connecté
 *
 * Affiche le pseudo, le niveau global (icône + barre d'XP) et les stats par jeu.
 * Redirige vers /login si personne n'est connecté.
 */

import "./Profile.scss";
import {useEffect, useState} from "react";
import {Navigate, useNavigate} from "react-router-dom";
import {useAuth} from "../../../Context/authContext.ts";
import {gameStatsService} from "../../../Services/gameStats.service.ts";
import {gameService} from "../../../Services/game.service.ts";
import {levelIconSrc, xpToNextLevel} from "../../../Services/leveling.ts";
import type {GameStats} from "../../../Models/gameStats.model.ts";
import type {Game} from "../../../Models/game.model.ts";

export default function Profile() {
    const {isLoggedIn, userId, username, level, xp, logout} = useAuth();
    const navigate = useNavigate();
    const [stats, setStats] = useState<GameStats[] | null>(null);
    const [games, setGames] = useState<Game[]>([]);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!userId) return;
        const controller = new AbortController();
        Promise.all([gameStatsService.getStatsByUserId(userId), gameService.list(controller.signal)])
            .then(([s, g]) => {
                setStats(s);
                setGames(g);
            })
            .catch((err: Error) => {
                if (err.name !== "AbortError") setError(err.message || "Erreur lors du chargement du profil");
            });
        return () => controller.abort();
    }, [userId]);

    if (!isLoggedIn) return <Navigate to="/login" replace/>;

    const xpNextLevel = xpToNextLevel(level);
    const xpPercent = Math.min(100, (xp / xpNextLevel) * 100);
    const gameName = (code: string) => games.find(g => g.code === code)?.designation ?? code;

    const handleLogout = () => {
        logout();
        navigate("/");
    };

    return (
        <main className="profile">
            <section className="profile-card">
                <img src={levelIconSrc(level)} alt={`Niveau ${level}`} className="profile-level-icon"/>
                <h1>{username ?? "…"}</h1>
                <p className="profile-level">Niveau {level}</p>

                <div className="profile-xp" title={`${xp} / ${xpNextLevel} xp`}>
                    <div className="profile-xp-fill" style={{width: `${xpPercent}%`}}/>
                </div>
                <p className="profile-xp-label">{xp} / {xpNextLevel} xp</p>

                <h2>Mes jeux</h2>
                {error && <p className="profile-error">{error}</p>}
                {!error && stats === null && <p>Chargement…</p>}
                {stats?.length === 0 && <p>Aucune victoire pour l'instant. À toi de jouer !</p>}
                {stats && stats.length > 0 && (
                    <table className="profile-stats">
                        <thead>
                        <tr>
                            <th>Jeu</th>
                            <th>Niveau</th>
                            <th>XP</th>
                            <th>Victoires</th>
                        </tr>
                        </thead>
                        <tbody>
                        {stats.map(s => (
                            <tr key={s.game_code}>
                                <td>{gameName(s.game_code)}</td>
                                <td>{s.game_level}</td>
                                <td>{s.game_xp} / {xpToNextLevel(s.game_level)}</td>
                                <td>{s.games_won}</td>
                            </tr>
                        ))}
                        </tbody>
                    </table>
                )}

                <button type="button" className="profile-logout" onClick={handleLogout}>
                    Se déconnecter
                </button>
            </section>
        </main>
    );
}
