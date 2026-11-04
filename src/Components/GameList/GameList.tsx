import "./GameList.scss"
import {type CSSProperties, useEffect, useRef, useState} from "react";
import type {Game} from "../../Models/game.model.ts";
import {gameService} from "../../Services/game.service.ts";
import type {GameStats} from "../../Models/gameStats.model.ts";
import {gameStatsService} from "../../Services/gameStats.service.ts";
import {Link, useNavigate} from "react-router-dom";
import {FaCalendarDay, FaLock, FaPlay, FaStar, FaTrophy} from "react-icons/fa";
import {useAuth} from "../../Context/authContext.ts";
import {xpToNextLevel} from "../../Services/leveling.ts";
import DailyBanner from "./DailyBanner.tsx";
import {useDailyOverview} from "./useDailyOverview.ts";
import {formatDuration} from "../../Services/format.ts";
import {dailyGridLabel} from "../../Services/dailyGames.ts";
import {isNewSince} from "../../Services/version.ts";
import {useWhatsNew} from "./useWhatsNew.ts";
import WhatsNewPopup from "./WhatsNewPopup.tsx";

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

/**
 * Stats du joueur sur un jeu : niveau, barre d'XP, victoires.
 * Souris : panneau qui recouvre exactement la carte au survol (la barre se remplit, les lignes arrivent
 * l'une après l'autre). Écran tactile : petite ligne sous la carte.
 * Sans stat (aucune victoire sur ce jeu) : « Pas encore joué ».
 */
function GameStatsPanel({stat}: { stat?: GameStats }) {
    if (!stat || !stat.games_won) {
        return (
            <div className="game-stats empty">
                <div className="game-stats-row" style={{"--k": 0} as CSSProperties}>
                    <span className="game-stats-play" aria-hidden><FaPlay/></span>
                </div>
                <div className="game-stats-row" style={{"--k": 1} as CSSProperties}>
                    <span className="game-stats-empty-title">Pas encore joué</span>
                    <span className="game-stats-xp">Lance ta première partie !</span>
                </div>
            </div>
        );
    }
    const level = stat.game_level ?? 0;
    const xp = stat.game_xp ?? 0;
    const next = xpToNextLevel(level);
    const won = stat.games_won ?? 0;
    return (
        <div className="game-stats" style={{"--xp": Math.min(1, xp / next)} as CSSProperties}>
            <div className="game-stats-row" style={{"--k": 0} as CSSProperties}>
                <span className="game-stats-label">Niveau</span>
                <span className="game-stats-value level"><FaStar aria-hidden/> {level}</span>
            </div>
            <div className="game-stats-row xp" style={{"--k": 1} as CSSProperties}>
                <span className="game-stats-bar" aria-hidden><span className="game-stats-bar-fill"/></span>
                <span className="game-stats-xp">{xp} / {next} XP</span>
            </div>
            <div className="game-stats-row" style={{"--k": 2} as CSSProperties}>
                <span className="game-stats-label">{won > 1 ? "Victoires" : "Victoire"}</span>
                <span className="game-stats-value won"><FaTrophy aria-hidden/> {won}</span>
            </div>
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
    // Nouvelle version depuis la dernière visite : popup des nouveautés, pastille « Nouveau » sur les jeux apparus depuis
    const whatsNew = useWhatsNew(isLoggedIn);

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
            {whatsNew.versions.length > 0 && <WhatsNewPopup versions={whatsNew.versions} onClose={whatsNew.closePopup}/>}

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
                            {/* Carte du jeu, et par-dessus (au survol) les stats du joueur sur ce jeu */}
                            <div className="game-tile">
                                {isNewSince(game.added_in, whatsNew.since) && <span className="game-new">Nouveau</span>}
                                <div
                                    className="game"
                                    onClick={handleGameSelection(game.code)}
                                >
                                    <img src={`/gameIcons/${game.code}.svg`} alt={game.code}/>
                                    <h1>{game.code}</h1>
                                </div>

                                {/* stats chargées : celles du jeu, ou « pas encore joué » */}
                                {userId && userStats && <GameStatsPanel stat={stat}/>}
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