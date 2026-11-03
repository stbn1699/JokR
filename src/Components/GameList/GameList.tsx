import "./GameList.scss"
import {type CSSProperties, useEffect, useRef, useState} from "react";
import type {Game} from "../../Models/game.model.ts";
import {gameService} from "../../Services/game.service.ts";
import type {GameStats} from "../../Models/gameStats.model.ts";
import {gameStatsService} from "../../Services/gameStats.service.ts";
import {Link, useNavigate} from "react-router-dom";
import {FaCalendarDay, FaLock} from "react-icons/fa";
import {useAuth} from "../../Context/authContext.ts";
import {xpToNextLevel} from "../../Services/leveling.ts";
import DailyBanner from "./DailyBanner.tsx";
import {useDailyOverview} from "./useDailyOverview.ts";
import {formatDuration} from "../../Services/format.ts";
import {dailyGridLabel} from "../../Services/dailyGames.ts";

// Nombre de jeux de la dernière visite : autant de cartes fantômes pendant le chargement (pas de saut de page)
const GAME_COUNT_KEY = "gameListCount";

function rememberGameCount(count: number) {
    try {
        localStorage.setItem(GAME_COUNT_KEY, String(count));
    } catch {
        // stockage indisponible (navigation privée...) : on garde la valeur par défaut
    }
}

function lastGameCount(): number {
    try {
        const count = Number(localStorage.getItem(GAME_COUNT_KEY));
        if (Number.isInteger(count) && count > 0 && count <= 30) return count;
    } catch {
        // idem
    }
    return 6;
}

// Cartes fantômes avec un reflet qui passe, le temps de récupérer les jeux
function GameListSkeleton() {
    return (
        <div className="game-list loading" role="status" aria-label="Chargement des jeux…">
            {Array.from({length: lastGameCount()}, (_, i) => (
                <div className="game-card skeleton" key={i} aria-hidden style={{"--i": i} as CSSProperties}>
                    <div className="game">
                        <div className="skeleton-icon"/>
                        <div className="skeleton-title"/>
                    </div>
                    <div className="skeleton-pill"/>
                </div>
            ))}
        </div>
    );
}

export default function GameList() {
    const [games, setGames] = useState<Game[]>([])
    const [userStats, setUserStats] = useState<GameStats[] | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null);
    const [overlayVisible, setOverlayVisible] = useState(false);
    const timeoutRef = useRef<number | null>(null);
    const {userId, isLoggedIn} = useAuth();
    const navigate = useNavigate();
    const daily = useDailyOverview();

    useEffect(() => {
        const controller = new AbortController();

        const gamesPromise = gameService.list(controller.signal);

        const statsPromise =
            userId
                ? gameStatsService.getStatsByUserId(userId)
                : Promise.resolve(null);

        Promise.all([gamesPromise, statsPromise])
            .then(([gamesResult, statsResult]) => {
                setGames(gamesResult);
                setUserStats(statsResult);
                rememberGameCount(gamesResult.length);
            })
            .catch((err) => {
                if (err.name !== "AbortError") {
                    setError(err.message || "Erreur lors du chargement des jeux");
                }
            })
            .finally(() => setLoading(false));

        return () => {
            controller.abort();
            if (timeoutRef.current) {
                window.clearTimeout(timeoutRef.current);
                timeoutRef.current = null;
            }
        };
    }, [userId]);

    if (loading) return <GameListSkeleton/>;
    if (error) return <p className="game-list-status error" role="alert">{error}</p>;

    // petit effet visuel puis navigation vers le jeu
    const handleGameSelection = (gameCode: string) => () => {
        // prevent double clicks by clearing any existing timeout
        if (timeoutRef.current) {
            window.clearTimeout(timeoutRef.current);
            timeoutRef.current = null;
        }

        // show overlay immediately
        setOverlayVisible(true);

        // navigate SPA route to avoid full page reload after a short delay
        timeoutRef.current = window.setTimeout(() => {
            // hide overlay (allows a short fade-out if desired) then navigate
            setOverlayVisible(false);
            navigate(`/playgame/${gameCode}/`);
        }, 500);
    }

    return (
        <>
            {/* overlay covering the whole viewport when a game is selected */}
            <div className={`click-overlay ${overlayVisible ? 'visible' : ''}`}/>

            {daily && <DailyBanner overview={daily}/>}

            <div className="game-list">
                {games.map((game, index) => {
                    const stat = userStats?.find(s => s.game_code === game.code);
                    const challenge = daily?.games.find(g => g.code === game.code);

                    return (
                        // --i : les cartes apparaissent l'une après l'autre
                        <div className="game-card appear" key={game.code} style={{"--i": index} as CSSProperties}>
                            {userId && stat && (
                                <div className="stats">
                                    <div>
                                        <p>Niveau {stat.game_level ?? 0}</p>
                                        <p>
                                            ({stat.game_xp ?? 0} / {xpToNextLevel(stat.game_level)} xp)
                                        </p>
                                    </div>
                                    <div>
                                        <p>Victoires:</p>
                                        <p>{stat.games_won ?? 0}</p>
                                    </div>
                                </div>
                            )}

                            <div
                                className="game"
                                onClick={handleGameSelection(game.code)}
                            >
                                <img src={`/gameIcons/${game.code}.svg`} alt={game.code}/>
                                <h1>{game.code}</h1>
                            </div>

                            {/* Défi du jour de ce jeu (invité : ouvre l'invitation à créer un compte) */}
                            {challenge && daily && (
                                <Link to={`/defi/${game.code}`}
                                      className={`daily-button ${challenge.result ? "done" : ""} ${isLoggedIn ? "" : "locked"}`}
                                      title={`Défi du jour : ${dailyGridLabel(challenge.code, challenge.size, challenge.emptyCells)} · XP et crédits ×${daily.rewardMultiplier}`}>
                                    {challenge.result
                                        ? <>✓ {formatDuration(challenge.result.durationMs)} · {challenge.result.rank}<sup>{challenge.result.rank === 1 ? "er" : "e"}</sup> / {challenge.result.total}</>
                                        : <>
                                            {isLoggedIn ? <FaCalendarDay aria-hidden/> : <FaLock aria-hidden/>} Défi du jour
                                            {daily.rewardMultiplier > 1 && <span className="daily-x2" title="XP et crédits doublés">×{daily.rewardMultiplier}</span>}
                                        </>}
                                </Link>
                            )}
                        </div>
                    );
                })}
            </div>
        </>
    )
}