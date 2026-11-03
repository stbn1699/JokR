/**
 * Page Classements : XP globale, par jeu, et défi du jour.
 * - Podium (médailles) des trois premiers, en bref (icône, pseudo, score), puis le classement complet
 *   en dessous (trois premiers compris, avec niveau et détails)
 * - Défi du jour : jeu, puis date choisie comme sur la page Daily (mois avec flèches, bandeau des jours)
 * L'onglet est dans l'adresse (?onglet=xp|sudoku|binero|rikudo|tectonic|galaxies|shikaku|queens|defi&jeu=sudoku|binero|rikudo|tectonic|galaxies|shikaku|queens
 * [&mois=AAAA-MM][&date=AAAA-MM-JJ]) pour pouvoir y renvoyer (ex. classement d'un défi passé).
 */

import "./Leaderboard.scss";
import {type ReactNode, useEffect, useMemo, useRef, useState} from "react";
import {useSearchParams} from "react-router-dom";
import {FaMedal} from "react-icons/fa";
import {useAuth} from "../../Context/authContext.ts";
import {type Leaderboard as Board, leaderboardService} from "../../Services/leaderboard.service.ts";
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
    {id: "sudoku", label: "Sudoku", short: "Sudoku"},
    {id: "binero", label: "Binero", short: "Binero"},
    {id: "rikudo", label: "Rikudo", short: "Rikudo"},
    {id: "tectonic", label: "Tectonic", short: "Tectonic"},
    {id: "galaxies", label: "Galaxies", short: "Galaxies"},
    {id: "shikaku", label: "Shikaku", short: "Shikaku"},
    {id: "queens", label: "Queens", short: "Queens"},
    {id: "defi", label: "Défi du jour", short: "Défi"},
] as const;
type Tab = typeof TABS[number]["id"];

const DAILY_GAMES = [{id: "sudoku", label: "Sudoku"}, {id: "binero", label: "Binero"}, {id: "rikudo", label: "Rikudo"}, {id: "tectonic", label: "Tectonic"}, {id: "galaxies", label: "Galaxies"}, {id: "shikaku", label: "Shikaku"}, {id: "queens", label: "Queens"}] as const;
const MONTH_KEY = /^\d{4}-(0[1-9]|1[0-2])$/;
const DATE_KEY = /^\d{4}-\d{2}-\d{2}$/;

const ordinal = (rank: number) => <>{rank}<sup>{rank === 1 ? "er" : "e"}</sup></>;

// Une ligne de classement, prête à afficher (XP, jeu ou défi)
// userLevel : niveau global du joueur (contour et numéro sur son icône)
type Row = { rank: number; username: string; avatar: string; userLevel: number; main: ReactNode; detail?: ReactNode };

export default function Leaderboard() {
    const {username} = useAuth();
    const [params, setParams] = useSearchParams();
    const tab: Tab = TABS.some(t => t.id === params.get("onglet")) ? params.get("onglet") as Tab : "xp";
    const dailyGame = DAILY_GAMES.find(g => g.id === params.get("jeu"))?.id ?? "sudoku";

    // ---------- Défi du jour : mois et jour choisis
    const dateParam = DATE_KEY.test(params.get("date") ?? "") ? params.get("date")! : undefined;
    const monthParam = params.get("mois");
    const requestedMonth = monthParam && MONTH_KEY.test(monthParam) ? monthParam : dateParam?.slice(0, 7);
    const {data: month, dayTick} = useDailyMonth(requestedMonth, tab === "defi");
    const days = useMemo(() => (month ? daysOfMonth(month.month) : []), [month]);
    const available = useMemo(() => new Set(month?.days.map(d => d.date) ?? []), [month]);
    // Point vert : jours où le joueur a réussi le défi de ce jeu
    const completed = useMemo(() => new Set(month?.days
        .filter(d => d.games.some(g => g.code.toLowerCase() === dailyGame && g.result))
        .map(d => d.date) ?? []), [month, dailyGame]);
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
            ? dailyService.leaderboard(dailyGame, controller.signal, selectedDate ?? undefined).then(d => {
                setDaily(d);
                setBoard(null);
            })
            : (tab === "xp" ? leaderboardService.xp(controller.signal) : leaderboardService.game(tab, controller.signal))
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
    }, [tab, dailyGame, selectedDate, dayTick]);

    const select = (next: Record<string, string>) => {
        setLoading(true);
        setParams(next, {replace: true});
    };
    const dailyParams = (extra: Record<string, string> = {}) => ({
        onglet: "defi", jeu: dailyGame,
        ...(selectedDate ? {mois: selectedDate.slice(0, 7), date: selectedDate} : {}),
        ...extra,
    });

    const isMe = (name: string) => username !== null && name === username;

    // Lignes à afficher, quel que soit l'onglet
    const rows: Row[] | null = board
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
    const me = board?.me
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
                                onClick={() => select(t.id === "defi" ? dailyParams() : {onglet: t.id})}>
                            <span className="tab-long">{t.label}</span>
                            <span className="tab-short" aria-hidden>{t.short}</span>
                        </button>
                    ))}
                </div>

                {tab === "defi" && (
                    <div className="leaderboard-daily">
                        <div className="leaderboard-subtabs">
                            {DAILY_GAMES.map(g => (
                                <button key={g.id} type="button" className={dailyGame === g.id ? "selected" : ""}
                                        onClick={() => select(dailyParams({jeu: g.id}))}>
                                    {g.label}
                                </button>
                            ))}
                        </div>
                        {month && (
                            <>
                                <MonthPicker month={month.month} firstMonth={month.firstMonth} currentMonth={month.currentMonth}
                                             onChange={m => select({onglet: "defi", jeu: dailyGame, mois: m})}/>
                                <DayStrip days={days} available={available} completed={completed} allDone={allDone} today={month.today}
                                          selected={selectedDate}
                                          onSelect={d => select({onglet: "defi", jeu: dailyGame, mois: d.slice(0, 7), date: d})}/>
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
                        {!daily
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
                            <li key={row.rank + row.username} className={`podium-place place-${row.rank} ${isMe(row.username) ? "me" : ""}`}
                                style={{order: i}}>
                                <FaMedal className="podium-medal" aria-label={`${row.rank}e place`}/>
                                <Avatar seed={row.avatar} fallback={row.username} size={row.rank === 1 ? 4.6 : 3.8}
                                        level={row.userLevel} showLevel className="podium-avatar"/>
                                <span className="podium-name">{row.username}</span>
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
                            <li key={row.rank + row.username} className={isMe(row.username) ? "me" : ""}>
                                <span className="leaderboard-rank">{ordinal(row.rank)}</span>
                                <Avatar seed={row.avatar} fallback={row.username} size={2.7}
                                        level={row.userLevel} showLevel className="leaderboard-avatar"/>
                                <span className="leaderboard-name">{row.username}</span>
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
