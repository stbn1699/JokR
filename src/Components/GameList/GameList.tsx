import "./GameList.scss"
import {useEffect, useState} from "react";
import type {Game} from "../../Models/game.model.ts";
import {gameService} from "../../Services/game.service.ts";
import Header from "../Header/Header.tsx";
import type {GameStats} from "../../Models/gameStats.model.ts";
import {gameStatsService} from "../../Services/gameStats.service.ts";

export default function GameList() {
    const [games, setGames] = useState<Game[]>([])
    const [userStats, setUserStats] = useState<GameStats[] | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null);
    const userId = window.localStorage.getItem('userId');

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

        return () => controller.abort();
    }, [userId]);

    if (loading) return <div>Loading...</div>;
    if (error) return <div>{error}</div>;

    const handleGameSelection = (gameCode: string) => () => {
        window.location.href = `/playgame/${gameCode}/`;
    }

    return (
        <>
            <Header/>
            <div className="game-list">
                {games.map((game) => (
                    <div key={game.id} onClick={handleGameSelection(game.code)}>
                        <img src={`/gameIcons/${game.code}.svg`} alt={game.code}/>
                        <h1>{game.code}</h1>
                        {userId && (
                            <p>
                                Victoires:{" "}
                                {userStats?.find(stat => stat.game_id === game.id)?.games_won ?? 0}
                            </p>
                        )}
                    </div>
                ))}
            </div>
        </>
    )
}