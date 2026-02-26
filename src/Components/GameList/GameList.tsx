import "./GameList.scss"
import {useEffect, useRef, useState} from "react";
import type {Game} from "../../Models/game.model.ts";
import {gameService} from "../../Services/game.service.ts";
import type {GameStats} from "../../Models/gameStats.model.ts";
import {gameStatsService} from "../../Services/gameStats.service.ts";
import {useNavigate} from "react-router-dom";
import sounds from "../../Services/sounds";

export default function GameList() {
    const [games, setGames] = useState<Game[]>([])
    const [userStats, setUserStats] = useState<GameStats[] | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null);
    const [overlayVisible, setOverlayVisible] = useState(false);
    const timeoutRef = useRef<number | null>(null);
    const userId = window.localStorage.getItem('userId');
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

    if (loading) return <div>Loading...</div>;
    if (error) return <div>{error}</div>;

    // jouer le son de sélection puis naviguer
    const handleGameSelection = (gameCode: string) => () => {
        // prevent double clicks by clearing any existing timeout
        if (timeoutRef.current) {
            window.clearTimeout(timeoutRef.current);
            timeoutRef.current = null;
        }

        // play select SFX from module-scoped audio so it isn't stopped by navigation
        sounds.interface12();

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
                    const stat = userStats?.find(s => s.game_id === game.id);

                    return (
                        <div className="game-card" key={game.id}>
                            {userId && stat && (
                                <div className="stats">
                                    <div>
                                        <p>Niveau {stat.game_level ?? 0}</p>
                                        <p>
                                            ({stat.game_xp ?? 0} / {Math.ceil(120 * Math.pow(stat.game_level, 1.4))} xp)
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
                                onMouseEnter={() => {
                                    sounds.interface9();
                                }}
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