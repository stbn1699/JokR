import "./GameList.scss"
import {LEVEL_GAMES, type LevelsSummary, levelsService} from "../../Services/levels.service.ts";
import {currentLevel, levelInWorld, worldAt, WORLD_SIZE} from "../Levels/worlds.ts";
import WorldBackdrop from "../Levels/WorldBackdrop.tsx";
import {type CSSProperties, useEffect, useRef, useState} from "react";
import type {Game} from "../../Models/game.model.ts";
import {gameService} from "../../Services/game.service.ts";
import type {GameStats} from "../../Models/gameStats.model.ts";
import {gameStatsService} from "../../Services/gameStats.service.ts";
import {Link, useNavigate, useSearchParams} from "react-router-dom";
import {FaCalendarDay, FaCheck, FaLock, FaPlay, FaStar, FaTrophy} from "react-icons/fa";
import {useAuth} from "../../Context/authContext.ts";
import {xpToNextLevel} from "../../Services/leveling.ts";
import {useDailyOverview} from "./useDailyOverview.ts";
import {formatDuration} from "../../Services/format.ts";
import {dailyGridLabel} from "../../Services/dailyGames.ts";
import {formatDailyDate} from "../../Services/daily.service.ts";
import {isNewSince} from "../../Services/version.ts";
import {useWhatsNew} from "./useWhatsNew.ts";
import WhatsNewPopup from "./WhatsNewPopup.tsx";
import {GAME_TYPE_ORDER, GAME_TYPES, gameType, type GameType, groupGamesByType} from "../../Services/gameTypes.ts";

// Pastille du type de jeu (chiffres, grille, mots), en haut à droite de la carte
function GameTypeBadge({code}: { code: string }) {
    const type = gameType(code);
    const {label, icon: Icon} = GAME_TYPES[type];
    return <span className={`game-type ${type}`}><Icon aria-hidden/> {label}</span>;
}

// Icône du jeu (public/gameIcons/<CODE>.svg) ; case en pointillés tant qu'elle n'est pas dessinée
function GameIcon({code}: { code: string }) {
    const [missing, setMissing] = useState(false);
    if (missing) return <div className="game-icon-missing" aria-hidden/>;
    return <img src={`/gameIcons/${code}.svg`} alt={code} onError={() => setMissing(true)}/>;
}

// Filtre de l'accueil, retenu d'une visite à l'autre (sauf « Défi du jour », qui ne dure que la visite)
type GameFilter = GameType | "tous" | "defi";
const GAME_FILTER_KEY = "gameListFilter";

function lastGameFilter(): GameFilter {
    try {
        const saved = localStorage.getItem(GAME_FILTER_KEY);
        if (GAME_TYPE_ORDER.includes(saved as GameType)) return saved as GameType;
    } catch {
        // stockage indisponible : tous les jeux
    }
    return "tous";
}

function rememberGameFilter(filter: GameFilter) {
    if (filter === "defi") return;
    try {
        localStorage.setItem(GAME_FILTER_KEY, filter);
    } catch {
        // idem
    }
}

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
 * Jeu avec un mode Niveaux : le monde du niveau à faire, avec son décor en fond (opaque), et ce niveau.
 * Les particules du décor ne bougent que pendant le survol (il y a 8 décors sur l'accueil).
 */
function LevelsStatsPanel({levels}: { levels: LevelsSummary }) {
    // niveau à faire, numéroté dans son monde (comme au classement) : « Monde 2 », « Niveau 1 / 50 » après le 50
    const {world: worldNumber, number} = levelInWorld(currentLevel(levels.done, levels.count));
    const index = worldNumber - 1;
    const world = worldAt(index);
    const worldLevels = Math.min(WORLD_SIZE, levels.count - index * WORLD_SIZE);
    return (
        <div className="game-stats world" style={{"--w-accent": world.accent, "--w-ink": world.ink} as CSSProperties}>
            <WorldBackdrop index={index} world={world} framed/>
            <div className="game-stats-row" style={{"--k": 0} as CSSProperties}>
                <span className="game-stats-value world-number">Monde {index + 1}</span>
                <span className="game-stats-world-name">{world.name}</span>
            </div>
            <div className="game-stats-row" style={{"--k": 1} as CSSProperties}>
                <span className="game-stats-world-levels">Niveau {number} / {worldLevels}</span>
            </div>
        </div>
    );
}

/**
 * Stats du joueur sur un jeu : son monde et ses niveaux réussis (LevelsStatsPanel). Jeu sans mode Niveaux : niveau
 * du jeu, barre d'XP et victoires (l'XP par jeu reste calculée, elle ne s'affiche juste plus pour les puzzles).
 * Souris : panneau qui recouvre exactement la carte au survol (la barre se remplit, les lignes arrivent
 * l'une après l'autre). Écran tactile : petite ligne sous la carte.
 * Sans stat (aucune victoire sur ce jeu) : « Pas encore joué ».
 */
function GameStatsPanel({stat, levels}: { stat?: GameStats; levels?: LevelsSummary }) {
    if (levels?.done) return <LevelsStatsPanel levels={levels}/>;
    if (!stat?.games_won) {
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
    const level = stat?.game_level ?? 0;
    const xp = stat?.game_xp ?? 0;
    const next = xpToNextLevel(level);
    const won = stat?.games_won ?? 0;
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
    // progression du mode Niveaux, par jeu (null : pas chargée, ou indisponible)
    const [levelsSummary, setLevelsSummary] = useState<Record<string, LevelsSummary> | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null);
    const [overlayVisible, setOverlayVisible] = useState(false);
    const [searchParams, setSearchParams] = useSearchParams();
    // « Retour aux défis » (?filtre=defi) : l'accueil s'ouvre sur les défis du jour
    const wantsDaily = searchParams.get("filtre") === "defi";
    const [filter, setFilter] = useState<GameFilter>(() => (wantsDaily ? "defi" : lastGameFilter()));
    // déjà sur l'accueil : le lien choisit aussi les défis (puis l'adresse redevient « / »)
    if (wantsDaily && filter !== "defi") setFilter("defi");
    useEffect(() => {
        if (wantsDaily) setSearchParams({}, {replace: true});
    }, [wantsDaily, setSearchParams]);
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

        // un souci sur les niveaux ne doit pas empêcher l'accueil de s'afficher
        const levelsPromise =
            userId
                ? levelsService.summary(controller.signal).catch(() => null)
                : Promise.resolve(null);

        Promise.all([gamesPromise, statsPromise, levelsPromise])
            .then(([gamesResult, statsResult, levelsResult]) => {
                setGames(gamesResult);
                setUserStats(statsResult);
                setLevelsSummary(levelsResult);
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
            // défi du jour : la grille du jour ; jeux avec un mode Niveaux : la carte des niveaux d'abord
            // (la partie libre y est accessible)
            navigate(activeFilter === "defi" ? `/defi/${gameCode}` : LEVEL_GAMES.has(gameCode) ? `/niveaux/${gameCode}` : `/playgame/${gameCode}/`);
        }, 500);
    }

    const sections = groupGamesByType(games);
    // filtre retenu sur un type sans jeu (ou défis pas encore chargés) : on revient à tous les jeux
    const activeFilter: GameFilter = filter === "defi" ? (daily ? "defi" : "tous")
        : sections.some(s => s.type === filter) ? filter : "tous";
    const dailyMode = activeFilter === "defi";
    // les jeux restent dans l'ordre du serveur : les plus populaires d'abord
    const visibleGames = activeFilter === "tous" ? games
        : dailyMode ? games.filter(game => daily?.games.some(g => g.code === game.code))
            : games.filter(game => gameType(game.code) === activeFilter);
    const dailyDone = daily?.games.filter(g => g.result).length ?? 0;

    const chooseFilter = (next: GameFilter) => {
        setFilter(next);
        rememberGameFilter(next);
    };

    const renderGameCard = (game: Game, index: number) => {
        const stat = userStats?.find(s => s.game_code === game.code);
        const challenge = dailyMode ? daily?.games.find(g => g.code === game.code) : undefined;
        // défi déjà réussi aujourd'hui : la carte ne mène nulle part
        const done = challenge?.result ?? null;

        return (
            // --i : les cartes apparaissent l'une après l'autre
            <div className={`game-card appear ${dailyMode ? "daily" : gameType(game.code)} ${done ? "done" : ""}`}
                 key={`${activeFilter}-${game.code}`} style={{"--i": index} as CSSProperties}>
                {/* Carte du jeu, et par-dessus (au survol) les stats du joueur sur ce jeu */}
                <div className="game-tile">
                    {challenge
                        ? <span className="game-type daily">
                            {done ? <><FaCheck aria-hidden/> Réussi</> : isLoggedIn ? <>×{daily?.rewardMultiplier}</> : <><FaLock aria-hidden/> Compte</>}
                        </span>
                        : <GameTypeBadge code={game.code}/>}
                    {!challenge && isNewSince(game.added_in, whatsNew.since) && <span className="game-new">Nouveau</span>}
                    <div
                        className="game"
                        onClick={done ? undefined : handleGameSelection(game.code)}
                        title={challenge ? `Défi du jour : ${dailyGridLabel(challenge.code, challenge.size, challenge.emptyCells)}` : undefined}
                        aria-disabled={done ? true : undefined}
                    >
                        <GameIcon code={game.code}/>
                        <h1>{game.designation}</h1>
                        {done && (
                            <span className="game-daily-result">
                                {formatDuration(done.durationMs)} · {done.rank}<sup>{done.rank === 1 ? "er" : "e"}</sup> / {done.total}
                            </span>
                        )}
                    </div>

                    {/* stats chargées : celles du jeu, ou « pas encore joué » (pas en mode défi) */}
                    {!dailyMode && userId && userStats && <GameStatsPanel stat={stat} levels={levelsSummary?.[game.code]}/>}
                </div>

            </div>
        );
    };

    return (
        <>
            {whatsNew.versions.length > 0 && <WhatsNewPopup versions={whatsNew.versions} onClose={whatsNew.closePopup}/>}

            {/* overlay covering the whole viewport when a game is selected */}
            <div className={`click-overlay ${overlayVisible ? 'visible' : ''}`}/>

            {/* Filtres par type */}
            <div className="game-filters" role="group" aria-label="Filtrer les jeux par type">
                <button type="button" className={`game-filter tous ${activeFilter === "tous" ? "active" : ""}`}
                        aria-pressed={activeFilter === "tous"} onClick={() => chooseFilter("tous")}>
                    Tous <span className="game-filter-count">{games.length}</span>
                </button>
                {daily && (
                    <button type="button" className={`game-filter daily ${dailyMode ? "active" : ""}`}
                            aria-pressed={dailyMode} onClick={() => chooseFilter("defi")}>
                        <FaCalendarDay aria-hidden/> Défi du jour
                        <span className="game-filter-count">{isLoggedIn ? `${dailyDone}/${daily.games.length}` : daily.games.length}</span>
                    </button>
                )}
                {sections.map(({type, games: sectionGames}) => {
                    const {label, icon: Icon} = GAME_TYPES[type];
                    return (
                        <button type="button" key={type} className={`game-filter ${type} ${activeFilter === type ? "active" : ""}`}
                                aria-pressed={activeFilter === type} onClick={() => chooseFilter(type)}>
                            <Icon aria-hidden/> {label} <span className="game-filter-count">{sectionGames.length}</span>
                        </button>
                    );
                })}
            </div>

            {/* Mode défi : le jour, les gains doublés et les défis passés */}
            {dailyMode && daily && (
                <p className="daily-strip">
                    <strong>{formatDailyDate(daily.date)}</strong>
                    {daily.rewardMultiplier > 1 && <span className="daily-strip-x2">XP et crédits ×{daily.rewardMultiplier}</span>}
                    {!isLoggedIn && <span><Link to="/register">Crée un compte</Link> pour jouer les défis</span>}
                    <Link to="/defi">Défis précédents →</Link>
                </p>
            )}

            <div className={`game-list ${dailyMode ? "daily-mode" : ""}`}>
                {visibleGames.map(renderGameCard)}
            </div>
        </>
    )
}