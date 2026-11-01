import "./GameList.scss"
import {useEffect, useRef, useState} from "react";
import type {Game} from "../../Models/game.model.ts";
import {gameService} from "../../Services/game.service.ts";
import type {GameStats} from "../../Models/gameStats.model.ts";
import {gameStatsService} from "../../Services/gameStats.service.ts";
import {useNavigate} from "react-router-dom";
import {useAuth} from "../../Context/authContext.ts";
import {xpToNextLevel} from "../../Services/leveling.ts";

export default function GameList() {
    const [games, setGames] = useState<Game[]>([])
    const [userStats, setUserStats] = useState<GameStats[] | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null);
    const [overlayVisible, setOverlayVisible] = useState(false);
    const timeoutRef = useRef<number | null>(null);
    const {userId} = useAuth();
    const navigate = useNavigate();

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

    if (loading) return <p className="game-list-status">Chargement des jeux…</p>;
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

            <div className="game-list">
                {games.map((game) => {
                    const stat = userStats?.find(s => s.game_code === game.code);

                    return (
                        <div className="game-card" key={game.code}>
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
                        </div>
                    );
                })}
            </div>
        </>
    )
}