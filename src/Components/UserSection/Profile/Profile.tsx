/**
 * Page Profil - joueur connecté
 *
 * Affiche le pseudo, le niveau global (icône + barre d'XP), les stats par jeu
 * l'historique des parties gagnées (temps, XP) et la gestion du compte.
 * Redirige vers /login si personne n'est connecté.
 */

import {FaCoins, FaPen} from "react-icons/fa";
import "./Profile.scss";
import {useEffect, useState} from "react";
import {Navigate} from "react-router-dom";
import {useAuth} from "../../../Context/authContext.ts";
import {gameStatsService} from "../../../Services/gameStats.service.ts";
import {gameService} from "../../../Services/game.service.ts";
import {xpToNextLevel} from "../../../Services/leveling.ts";
import type {GameStats} from "../../../Models/gameStats.model.ts";
import type {Game} from "../../../Models/game.model.ts";
import type {RecentResult} from "../../../Models/gameResult.model.ts";
import {userService} from "../../../Services/user.service.ts";
import {formatDuration} from "../../../Services/format.ts";
import AccountSettings from "./AccountSettings.tsx";

import Loader from "../../Loader/Loader.tsx";
import Avatar from "../../Avatar/Avatar.tsx";
import AvatarPicker from "../../Avatar/AvatarPicker.tsx";
const PAGE_SIZE = 10;

export default function Profile() {
    const {isLoggedIn, userId, username, level, xp, credits, avatar, setAvatar, logout} = useAuth();
    const [pickingAvatar, setPickingAvatar] = useState(false);
    // Vrai quand le joueur quitte volontairement (déconnexion, compte supprimé) : retour à l'accueil
    const [leaving, setLeaving] = useState(false);
    const [stats, setStats] = useState<GameStats[] | null>(null);
    const [games, setGames] = useState<Game[]>([]);
    const [results, setResults] = useState<RecentResult[]>([]);
    // Il reste peut-être des parties plus anciennes à charger
    const [hasMore, setHasMore] = useState(false);
    const [loadingMore, setLoadingMore] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!userId) return;
        const controller = new AbortController();
        Promise.all([
            gameStatsService.getStatsByUserId(userId),
            gameService.list(controller.signal),
            userService.getMyResults(PAGE_SIZE, 0, controller.signal),
        ])
            .then(([s, g, r]) => {
                setStats(s);
                setGames(g);
                setResults(r);
                setHasMore(r.length === PAGE_SIZE);
            })
            .catch((err: Error) => {
                if (err.name !== "AbortError") setError(err.message || "Erreur lors du chargement du profil");
            });
        return () => controller.abort();
    }, [userId]);

    // Sans session : vers la connexion, sauf si le joueur vient de se déconnecter (alors l'accueil)
    if (!isLoggedIn) return <Navigate to={leaving ? "/" : "/login"} replace/>;

    const loadMore = async () => {
        setLoadingMore(true);
        try {
            const page = await userService.getMyResults(PAGE_SIZE, results.length);
            setResults(current => [...current, ...page]);
            setHasMore(page.length === PAGE_SIZE);
        } catch (err) {
            setError((err as Error).message);
        } finally {
            setLoadingMore(false);
        }
    };

    const xpNextLevel = xpToNextLevel(level);
    const xpPercent = Math.min(100, (xp / xpNextLevel) * 100);
    const gameName = (code: string) => games.find(g => g.code === code)?.designation ?? code;

    const handleLogout = () => {
        setLeaving(true);
        logout();
    };

    return (
        <main className="profile">
            <section className="profile-card">
                {/* Icône de profil (contour et numéro selon le niveau) puis infos : en colonne sur grand écran, côte à côte sur téléphone */}
                <div className="profile-head">
                    <div className="profile-avatar">
                        <button type="button" className="profile-avatar-button" title="Changer d'icône"
                                onClick={() => setPickingAvatar(true)}>
                            <Avatar seed={avatar} fallback={username ?? userId ?? undefined} size={7.5}
                                    level={level} showLevel/>
                            <span className="profile-avatar-edit" aria-hidden><FaPen/></span>
                        </button>
                    </div>
                    {pickingAvatar && (
                        <AvatarPicker value={avatar ?? username ?? "jokr"} onClose={() => setPickingAvatar(false)}
                                      onConfirm={async seed => {
                                          await userService.changeAvatar(seed);
                                          setAvatar(seed);
                                      }}/>
                    )}
                    <div className="profile-head-info">
                        <h1>{username ?? "…"}</h1>
                        <p className="profile-level">Niveau {level}</p>

                        <div className="profile-xp" title={`${xp} / ${xpNextLevel} xp`}>
                            <div className="profile-xp-fill" style={{width: `${xpPercent}%`}}/>
                        </div>
                        <p className="profile-xp-label">{xp} / {xpNextLevel} xp</p>
                        <p className="profile-credits"><FaCoins aria-hidden/> {credits} crédit{credits > 1 ? "s" : ""}</p>
                    </div>
                </div>

                <h2>Mes jeux</h2>
                {error && <p className="profile-error">{error}</p>}
                {!error && stats === null && <Loader size="small"/>}
                {stats?.length === 0 && <p>Aucune victoire pour l'instant. À toi de jouer !</p>}
                {stats && stats.length > 0 && (
                    <table className="profile-stats fade-in">
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

                {results.length > 0 && (
                    <>
                        <h2>Historique</h2>
                        <table className="profile-stats profile-results">
                            <thead>
                            <tr>
                                <th>Jeu</th>
                                <th>Grille</th>
                                <th>Temps</th>
                                <th>Gains</th>
                                <th>Date</th>
                            </tr>
                            </thead>
                            <tbody>
                            {results.map((r, i) => (
                                <tr key={i}>
                                    <td>{r.designation}</td>
                                    <td title={r.game_code === "GALAXIES" ? `${r.empty_cells} murs donnés` : r.game_code === "SHIKAKU" ? `${r.empty_cells} rectangles donnés` : r.game_code === "QUEENS" ? `${r.empty_cells} dames données` : `${r.empty_cells} cases à remplir`}>
                                        {r.game_code === "RIKUDO" ? `${r.grid_size} cases` : `${r.grid_size}×${r.grid_size}`} · {r.empty_cells}
                                    </td>
                                    <td>{formatDuration(r.duration_ms)}</td>
                                    <td>+{r.xp}{r.credits > 0 && <span className="profile-credits-gain"> · +{r.credits} <FaCoins aria-hidden/></span>}</td>
                                    <td>{new Date(r.finished_at).toLocaleDateString("fr-FR")}</td>
                                </tr>
                            ))}
                            </tbody>
                        </table>
                        {hasMore && (
                            <button type="button" className="profile-more" onClick={loadMore} disabled={loadingMore}>
                                {loadingMore ? "Chargement…" : "Voir plus"}
                            </button>
                        )}
                    </>
                )}

                <AccountSettings onDeleted={handleLogout}/>

                <button type="button" className="profile-logout" onClick={handleLogout}>
                    Se déconnecter
                </button>
            </section>
        </main>
    );
}
