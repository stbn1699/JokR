import {GAMES} from "../../config/games";

export function GamesList() {
    return (
        <section>
            <h2 className="section-title">Choisis un jeu</h2>
            <div className="games-list">
                {GAMES.map((game) => (
                    <button
                        key={game.id}
                        className="game-button"
                        onClick={() => {
                            // Pour l’instant, on fait rien côté UI.
                            // Tu peux voir ce log dans la console dev.
                            console.log("[JokR] Jeu cliqué :", game.id);
                        }}
                    >
                        <div className="game-button-title">{game.name}</div>
                        {game.description && (
                            <div className="game-button-description">{game.description}</div>
                        )}
                    </button>
                ))}
            </div>
        </section>
    );
}
