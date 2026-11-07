/**
 * Page Classements : XP globale, crédits, par jeu, et défi du jour.
 * - Podium (médailles) des trois premiers, en bref (icône, pseudo, score), puis le classement complet
 *   en dessous (trois premiers compris, avec niveau et détails)
 * - Par jeu et défi du jour : même sélecteur de jeu (GameSelector) ; pour le défi, date choisie
 *   comme sur la page Daily (mois avec flèches, bandeau des jours)
 * L'onglet est dans l'adresse (?onglet=xp|credits|jeu|defi&jeu=sudoku|binero|rikudo|tectonic|galaxies|shikaku|queens
 * [&mois=AAAA-MM][&date=AAAA-MM-JJ]) pour pouvoir y renvoyer (ex. classement d'un défi passé).
 * Anciennes adresses (?onglet=sudoku...) : ouvrent l'onglet « Par jeu » sur ce jeu.
 * Un clic sur un joueur (icône ou pseudo) ouvre sa page (/joueur/:pseudo).
 * Les ami·e·s du joueur connecté sont mis en avant (ligne bleue, badge « Ami·e »).
 * Bouton « Amis » (joueur connecté, &amis=1 dans l'adresse) : seulement lui et ses amis, chacun avec
 * sa vraie place dans le classement complet (pas de limite aux 20 premiers).
 */

import "./Leaderboard.scss";
import {type ReactNode, useEffect, useMemo, useRef, useState} from "react";
import {Link, useSearchParams} from "react-router-dom";
import {FaCoins, FaMedal, FaUserFriends} from "react-icons/fa";
import {useAuth} from "../../Context/authContext.ts";
import {type Leaderboard as Board, leaderboardService} from "../../Services/leaderboard.service.ts";
import {playerPath} from "../../Services/player.service.ts";
import {useFriends} from "../../Services/friends.service.ts";
import {dailyService} from "../../Services/daily.service.ts";
import {formatDuration} from "../../Services/format.ts";
import type {DailyLeaderboard} from "../../Models/daily.model.ts";
import MonthPicker from "../DailyHistory/MonthPicker.tsx";
import DayStrip from "../DailyHistory/DayStrip.tsx";
import {useDailyMonth} from "../DailyHistory/useDailyMonth.ts";
import {daysOfMonth, longDate} from "../DailyHistory/calendar.ts";

import Loader from "../Loader/Loader.tsx";
import Avatar from "../Avatar/Avatar.tsx";
// `short` : libellé sur téléphone
const TABS = [
    {id: "xp", label: "XP globale", short: "XP"},
    {id: "credits", label: "Crédits", short: "Crédits"},
    {id: "jeu", label: "Par jeu", short: "Par jeu"},
    {id: "defi", label: "Défi du jour", short: "Défi"},
] as const;
type Tab = typeof TABS[number]["id"];

// Jeux du sélecteur (onglets « Par jeu » et « Défi du jour »)
const GAMES = [
    {id: "sudoku", label: "Sudoku"},
    {id: "binero", label: "Binero"},
    {id: "rikudo", label: "Rikudo"},
    {id: "tectonic", label: "Tectonic"},
    {id: "galaxies", label: "Galaxies"},
    {id: "shikaku", label: "Shikaku"},
    {id: "queens", label: "Queens"},
] as const;
type GameId = typeof GAMES[number]["id"];

const isGameId = (v: string | null): v is GameId => GAMES.some(g => g.id === v);

/**
 * Sélecteur de jeu, le même pour « Par jeu » et « Défi du jour » (orange pour le défi, comme le Daily).
 */
function GameSelector({selected, onSelect, daily = false}: { selected: GameId; onSelect: (id: GameId) => void; daily?: boolean }) {
    return (
        <div className={`leaderboard-subtabs ${daily ? "daily" : ""}`} role="radiogroup" aria-label="Jeu">
            {GAMES.map(g => (
                <button key={g.id} type="button" role="radio" aria-checked={selected === g.id}
                        className={selected === g.id ? "selected" : ""} onClick={() => onSelect(g.id)}>
                    {g.label}
                </button>
            ))}
        </div>
    );
}
const MONTH_KEY = /^\d{4}-(0[1-9]|1[0-2])$/;
const DATE_KEY = /^\d{4}-\d{2}-\d{2}$/;

const ordinal = (rank: number) => <>{rank}<sup>{rank === 1 ? "er" : "e"}</sup></>;

// Une ligne de classement, prête à afficher (XP, jeu ou défi)
// userLevel : niveau global du joueur (contour et numéro sur son icône)
type Row = { rank: number; username: string; avatar: string; userLevel: number; main: ReactNode; detail?: ReactNode };

export default function Leaderboard() {
    const {username, userId} = useAuth();
    const {friends} = useFriends(userId);
    const friendNames = useMemo(() => new Set(friends.map(f => f.username)), [friends]);
    const [params, setParams] = useSearchParams();
    // Filtre « Amis » (joueur connecté seulement)
    const friendsOnly = userId !== null && params.get("amis") === "1";
    const tabParam = params.get("onglet");
    // ancienne adresse : ?onglet=sudoku (un onglet par jeu) → « Par jeu » sur ce jeu
    const legacyGame = isGameId(tabParam) ? tabParam : null;
    const tab: Tab = legacyGame ? "jeu" : TABS.some(t => t.id === tabParam) ? tabParam as Tab : "xp";
    const jeuParam = params.get("jeu");
    const game: GameId = legacyGame ?? (isGameId(jeuParam) ? jeuParam : "sudoku");

    // ---------- Défi du jour : mois et jour choisis
    const dateParam = DATE_KEY.test(params.get("date") ?? "") ? params.get("date")! : undefined;
    const monthParam = params.get("mois");
    const requestedMonth = monthParam && MONTH_KEY.test(monthParam) ? monthParam : dateParam?.slice(0, 7);
    const {data: month, dayTick} = useDailyMonth(requestedMonth, tab === "defi");
    const days = useMemo(() => (month ? daysOfMonth(month.month) : []), [month]);
    const available = useMemo(() => new Set(month?.days.map(d => d.date) ?? []), [month]);
    // Point vert : jours où le joueur a réussi le défi de ce jeu
    const completed = useMemo(() => new Set(month?.days
        .filter(d => d.games.some(g => g.code.toLowerCase() === game && g.result))
        .map(d => d.date) ?? []), [month, game]);
    // Point doré : jours où le joueur a réussi tous les défis
    const allDone = useMemo(() => new Set(month?.days
        .filter(d => d.games.length > 0 && d.games.every(g => g.result))
        .map(d => d.date) ?? []), [month]);
    const selectedDate = useMemo(() => {
        if (!month) return null;
        if (dateParam && available.has(dateParam)) return dateParam;
        if (available.has(month.today)) return month.today;
        return month.days[0]?.date ?? null;
    }, [month, dateParam, available]);

    // Téléphone : les onglets peuvent dépasser, on fait défiler jusqu'à celui qui est choisi
    const tabsRef = useRef<HTMLDivElement>(null);
    useEffect(() => {
        const bar = tabsRef.current;
        const selected = bar?.querySelector<HTMLElement>("button.selected");
        if (!bar || !selected || bar.scrollWidth <= bar.clientWidth) return;
        bar.scrollLeft = selected.offsetLeft - (bar.clientWidth - selected.clientWidth) / 2;
    }, [tab]);

    const [board, setBoard] = useState<Board | null>(null);
    const [daily, setDaily] = useState<DailyLeaderboard | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Défi : on attend de connaître le jour choisi
        if (tab === "defi" && !selectedDate) return;
        const controller = new AbortController();
        const request = tab === "defi"
            ? dailyService.leaderboard(game, controller.signal, selectedDate ?? undefined, friendsOnly).then(d => {
                setDaily(d);
                setBoard(null);
            })
            : (tab === "xp" ? leaderboardService.xp(controller.signal, friendsOnly)
                : tab === "credits" ? leaderboardService.credits(controller.signal, friendsOnly)
                    : leaderboardService.game(game, controller.signal, friendsOnly))
                .then(b => {
                    setBoard(b);
                    setDaily(null);
                });
        request
            .then(() => setError(null))
            .catch((err: Error) => {
                if (err.name !== "AbortError") setError(err.message || "Impossible de charger le classement.");
            })
            .finally(() => setLoading(false));
        return () => controller.abort();
    }, [tab, game, selectedDate, dayTick, friendsOnly]);

    // Change d'onglet / de jeu / de jour en gardant le filtre Amis
    const select = (next: Record<string, string>, amis = friendsOnly) => {
        setLoading(true);
        setParams(amis ? {...next, amis: "1"} : next, {replace: true});
    };
    const toggleFriends = () => {
        const current = Object.fromEntries([...params].filter(([key]) => key !== "amis"));
        select(current, !friendsOnly);
    };
    const dailyParams = (extra: Record<string, string> = {}) => ({
        onglet: "defi", jeu: game,
        ...(selectedDate ? {mois: selectedDate.slice(0, 7), date: selectedDate} : {}),
        ...extra,
    });

    const isMe = (name: string) => username !== null && name === username;
    // Classe de la ligne : moi, un ami, ou rien
    const rowClass = (name: string) => (isMe(name) ? "me" : friendNames.has(name) ? "friend" : "");
    const friendBadge = (name: string) => friendNames.has(name) && <span className="friend-badge">Ami·e</span>;

    // Lignes à afficher, quel que soit l'onglet
    const rows: Row[] | null = board && tab === "credits"
        ? board.entries.map(e => ({
            rank: e.rank, username: e.username, avatar: e.avatar, userLevel: e.userLevel,
            main: <span className="leaderboard-credits"><FaCoins aria-hidden/> {(e.credits ?? 0).toLocaleString("fr-FR")}</span>,
            detail: <>Niveau {e.level}</>,
        }))
        : board
        ? board.entries.map(e => ({
            rank: e.rank, username: e.username, avatar: e.avatar, userLevel: e.userLevel,
            // Classé par niveau puis par XP dans le niveau
            main: <>Niveau {e.level}</>,
            detail: <>
                {e.xp.toLocaleString("fr-FR")} XP
                {tab !== "xp" && e.gamesWon !== undefined && <> · {e.gamesWon} victoire{e.gamesWon > 1 ? "s" : ""}</>}
            </>,
        }))
        : daily
            ? daily.entries.map(e => ({rank: e.rank, username: e.username, avatar: e.avatar, userLevel: e.userLevel, main: formatDuration(e.durationMs)}))
            : null;
    const podium = rows?.slice(0, 3) ?? [];
    const me = board?.me && tab === "credits"
        ? <>Ta place : <strong>{ordinal(board.me.rank)}</strong> sur {board.me.total} · {(board.me.credits ?? 0).toLocaleString("fr-FR")} crédit{(board.me.credits ?? 0) > 1 ? "s" : ""}</>
        : board?.me
        ? <>Ta place : <strong>{ordinal(board.me.rank)}</strong> sur {board.me.total} · niveau {board.me.level}</>
        : daily?.me
            ? <>Ta place : <strong>{ordinal(daily.me.rank)}</strong> sur {daily.me.total} · {formatDuration(daily.me.durationMs)}</>
            : null;

    return (
        <main className="leaderboard">
            <section className="leaderboard-card">
                <h1>Classements</h1>

                <div className="leaderboard-tabs" role="tablist" ref={tabsRef}>
                    {TABS.map(t => (
                        <button key={t.id} type="button" role="tab" aria-selected={tab === t.id}
                                className={`${tab === t.id ? "selected" : ""} ${t.id === "defi" ? "daily" : ""}`}
                                onClick={() => select(t.id === "defi" ? dailyParams() : t.id === "jeu" ? {onglet: "jeu", jeu: game} : {onglet: t.id})}>
                            <span className="tab-long">{t.label}</span>
                            <span className="tab-short" aria-hidden>{t.short}</span>
                        </button>
                    ))}
                </div>

                {/* Filtre : tout le monde, ou seulement mes amis (et moi) */}
                {userId && (
                    <div className="leaderboard-scope" role="radiogroup" aria-label="Joueurs affichés">
                        <button type="button" role="radio" aria-checked={!friendsOnly} className={!friendsOnly ? "selected" : ""}
                                onClick={() => friendsOnly && toggleFriends()}>
                            Tout le monde
                        </button>
                        <button type="button" role="radio" aria-checked={friendsOnly} className={friendsOnly ? "selected" : ""}
                                onClick={() => !friendsOnly && toggleFriends()}>
                            <FaUserFriends aria-hidden/> Mes ami·e·s
                        </button>
                    </div>
                )}

                {tab === "jeu" && (
                    <div className="leaderboard-daily">
                        <GameSelector selected={game} onSelect={id => select({onglet: "jeu", jeu: id})}/>
                    </div>
                )}

                {tab === "defi" && (
                    <div className="leaderboard-daily">
                        <GameSelector daily selected={game} onSelect={id => select(dailyParams({jeu: id}))}/>
                        {month && (
                            <>
                                <MonthPicker month={month.month} firstMonth={month.firstMonth} currentMonth={month.currentMonth}
                                             onChange={m => select({onglet: "defi", jeu: game, mois: m})}/>
                                <DayStrip days={days} available={available} completed={completed} allDone={allDone} today={month.today}
                                          selected={selectedDate}
                                          onSelect={d => select({onglet: "defi", jeu: game, mois: d.slice(0, 7), date: d})}/>
                                {selectedDate
                                    ? <p className="leaderboard-date">
                                        {longDate(selectedDate)}{selectedDate === month.today && " · aujourd'hui"}
                                    </p>
                                    : <p className="leaderboard-status">Pas de défi ce mois-ci.</p>}
                            </>
                        )}
                    </div>
                )}

                {error && <p className="leaderboard-error" role="alert">{error}</p>}
                {loading && !error && <Loader label="Chargement du classement…"/>}

                {!loading && !error && rows && rows.length === 0 && (
                    <p className="leaderboard-status">
                        {friendsOnly
                            ? daily ? "Ni toi ni tes ami·e·s n'avez réussi ce défi." : "Ni toi ni tes ami·e·s n'êtes encore classé·e·s ici."
                            : !daily
                            ? "Personne n'est encore classé."
                            : selectedDate === month?.today
                                ? "Personne n'a encore réussi ce défi. À toi de jouer !"
                                : "Personne n'a réussi ce défi ce jour-là."}
                    </p>
                )}

                {!loading && !error && podium.length > 0 && (
                    <ol className="podium fade-in">
                        {/* Ordre d'affichage : 2e, 1er, 3e (le 1er au centre, plus haut) */}
                        {[podium[1], podium[0], podium[2]].map((row, i) => row && (
                            // place-N : marche du podium (1re, 2e, 3e de la liste affichée)
                            <li key={row.rank + row.username} className={`podium-place place-${podium.indexOf(row) + 1} ${rowClass(row.username)}`}
                                style={{order: i}}>
                                <FaMedal className="podium-medal" aria-label={`${row.rank}e place`}/>
                                <Link to={playerPath(row.username)} className="podium-player" title={`Voir le profil de ${row.username}`}>
                                    <Avatar seed={row.avatar} fallback={row.username} size={podium.indexOf(row) === 0 ? 4.6 : 3.8}
                                            level={row.userLevel} showLevel className="podium-avatar"/>
                                    <span className="podium-name">{row.username}</span>
                                    {friendBadge(row.username)}
                                </Link>
                                <span className="podium-main">{row.main}</span>
                                <span className="podium-step">{ordinal(row.rank)}</span>
                            </li>
                        ))}
                    </ol>
                )}

                {/* Classement complet, trois premiers compris (le podium n'en montre que l'essentiel) */}
                {!loading && !error && rows && rows.length > 0 && (
                    <ol className="leaderboard-list fade-in">
                        {rows.map(row => (
                            <li key={row.rank + row.username} className={rowClass(row.username)}>
                                <span className="leaderboard-rank">{ordinal(row.rank)}</span>
                                <Link to={playerPath(row.username)} className="leaderboard-player" title={`Voir le profil de ${row.username}`}>
                                    <Avatar seed={row.avatar} fallback={row.username} size={2.7}
                                            level={row.userLevel} showLevel className="leaderboard-avatar"/>
                                    <span className="leaderboard-name">{row.username}</span>
                                    {friendBadge(row.username)}
                                </Link>
                                {row.detail && <span className="leaderboard-detail">{row.detail}</span>}
                                <span className="leaderboard-main">{row.main}</span>
                            </li>
                        ))}
                    </ol>
                )}

                {/* Place du joueur connecté, utile quand il n'est pas dans le haut du classement */}
                {!loading && me && <p className="leaderboard-me">{me}</p>}
            </section>
        </main>
    );
}
