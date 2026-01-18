import "./GameList.scss"
import {useEffect, useState} from "react";
import type {Game} from "../../Models/game.model.ts";
import {gameService} from "../../Services/game.service.ts";

export default function GameList() {
    const [games, setGames] = useState<Game[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const controller = new AbortController();

        gameService
            .list(controller.signal)
            .then(setGames)
            .catch((err) => {
                if (err.name !== "AbortError") {
                    setError(err.message || "Erreur lors du chargement des jeux");
                }
            })
            .finally(() => setLoading(false));

        return () => controller.abort();
    }, []);

    if (loading) return <div>Loading...</div>;
    if (error) return <div>{error}</div>;

    return (
        <div className="game-list">
            {games.map((game) => (
                <div key={game.id}>
                    <img src={`/gameIcons/${game.code}.svg`} alt={game.code} />
                    <h1>{game.code}</h1>
                </div>
            ))}
        </div>
    )
}