import type {GameDefinition} from "../../config/games";
import {formatPlayerNumbers} from "./utils";
import "./GamesList.css";

type GamesListProps = {
    games: GameDefinition[];
    creatingGameId: string | null;
    onCreate: (game: GameDefinition) => void;
};

export function GamesList({games, creatingGameId, onCreate}: GamesListProps) {
    return (
        <section className="games-list">
            {games.map((game) => (
                <button
                    key={game.id}
                    className="game-button"
                    disabled={creatingGameId === game.id}
                    onClick={() => onCreate(game)}
                >
                    <img
                        src={`public/gameIcons/${game.id}.png`}
                        alt="game icon"
                        className="game-button-icon">
                    </img>
                    <div className="game-button-title">{game.name}</div>
                    <div className="game-button-description">{game.description}</div>
                    <div className="game-button-players">{formatPlayerNumbers(game.playerNumbers)}</div>
                    <div className="game-button-start">
                        {creatingGameId === game.id ? "Création…" : "Créer un salon"}
                    </div>
                </button>
            ))}
        </section>
    );
}
