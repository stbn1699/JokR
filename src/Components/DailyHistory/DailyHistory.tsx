/**
 * Page des défis (/defi) : tous les défis du jour, mois par mois.
 * - Sélecteur de mois (avec l'année) et flèches ; la flèche est grisée au premier mois et au mois courant
 * - Bandeau des jours : on le fait glisser puis on clique un jour (jours sans défi grisés,
 *   point vert sur les jours où le joueur a réussi un défi)
 * - Défis du jour choisi : aujourd'hui « Jouer » (classé, XP et crédits ×2),
 *   les jours passés « Rejouer » (partie normale, hors classement), et le classement de ce jour
 * Le mois et le jour sont dans l'adresse (?mois=AAAA-MM&jour=JJ) pour que le retour arrière y ramène.
 */

import "./DailyHistory.scss";
import {useMemo} from "react";
import {Link, useSearchParams} from "react-router-dom";
import {FaCoins} from "react-icons/fa";
import {formatDuration} from "../../Services/format.ts";
import {useAuth} from "../../Context/authContext.ts";
import {DAILY_GAME_NAMES, DAILY_REWARD_MULTIPLIER, dailyGridLabel} from "../../Services/dailyGames.ts";
import {daysOfMonth, longDate} from "./calendar.ts";
import DayStrip from "./DayStrip.tsx";
import MonthPicker from "./MonthPicker.tsx";
import {useDailyMonth} from "./useDailyMonth.ts";

const MONTH_KEY = /^\d{4}-(0[1-9]|1[0-2])$/;

export default function DailyHistory() {
    const {isLoggedIn} = useAuth();
    const [params, setParams] = useSearchParams();
    const monthParam = params.get("mois");
    const requestedMonth = monthParam && MONTH_KEY.test(monthParam) ? monthParam : undefined;

    // Défis du mois (rechargés à la connexion et à minuit)
    const {data, error} = useDailyMonth(requestedMonth);

    // Données du mois demandé (pendant un changement de mois, on garde l'ancien affichage)
    const month = data?.month ?? requestedMonth ?? null;
    const days = useMemo(() => (month ? daysOfMonth(month) : []), [month]);
    const available = useMemo(() => new Set(data?.days.map(d => d.date) ?? []), [data]);
    const completed = useMemo(
        () => new Set(data?.days.filter(d => d.games.some(g => g.result)).map(d => d.date) ?? []),
        [data],
    );
    // Tous les défis du jour réussis : point doré
    const allDone = useMemo(
        () => new Set(data?.days.filter(d => d.games.length > 0 && d.games.every(g => g.result)).map(d => d.date) ?? []),
        [data],
    );

    // Jour choisi : celui de l'adresse s'il a un défi, sinon aujourd'hui (mois courant) ou le dernier jour du mois
    const dayParam = params.get("jour");
    const selected = useMemo(() => {
        if (!data || !month) return null;
        const fromParam = dayParam ? `${month}-${dayParam.padStart(2, "0")}` : null;
        if (fromParam && available.has(fromParam)) return fromParam;
        if (available.has(data.today)) return data.today;
        return data.days[0]?.date ?? null;
    }, [data, month, dayParam, available]);
    const selectedDay = data?.days.find(d => d.date === selected) ?? null;

    const goToMonth = (next: string) => setParams({mois: next}, {replace: true});
    const selectDay = (date: string) => setParams({mois: date.slice(0, 7), jour: String(Number(date.slice(8)))}, {replace: true});

    const isToday = !!data && selected === data.today;

    return (
        <main className="daily-history">
            <section className="daily-history-card">
                <h1>Défis du jour</h1>
                <p className="daily-history-intro">
                    Le défi du jour rapporte XP et crédits ×{DAILY_REWARD_MULTIPLIER} et compte au classement.
                    Les défis des jours passés se rejouent comme une partie normale, hors classement.
                </p>

                {!isLoggedIn && (
                    <p className="daily-history-login">
                        <Link to="/register" state={{from: "/defi"}}>Crée un compte</Link> ou{" "}
                        <Link to="/login" state={{from: "/defi"}}>connecte-toi</Link> pour jouer aux défis.
                    </p>
                )}

                {error && <p className="daily-history-error" role="alert">{error}</p>}
                {!error && !data && <p className="daily-history-status">Chargement…</p>}

                {data && month && (
                    <>
                        <MonthPicker month={month} firstMonth={data.firstMonth} currentMonth={data.currentMonth}
                                     onChange={goToMonth}/>

                        <DayStrip days={days} available={available} completed={completed} allDone={allDone} today={data.today}
                                  selected={selected} onSelect={selectDay}/>

                        {!selectedDay && (
                            <p className="daily-history-status">Pas de défi ce mois-ci.</p>
                        )}

                        {selectedDay && (
                            <div className="daily-history-day">
                                <h2>
                                    {longDate(selectedDay.date)}
                                    {isToday && <span className="daily-history-today-badge">
                                        Aujourd'hui · XP et <FaCoins aria-hidden/> ×{DAILY_REWARD_MULTIPLIER}
                                    </span>}
                                </h2>

                                <div className="daily-history-games">
                                    {selectedDay.games.map(game => {
                                        const leaderboard = `/classements?onglet=defi&jeu=${game.code.toLowerCase()}${isToday ? "" : `&date=${selectedDay.date}`}`;
                                        return (
                                            <article key={game.code} className={`daily-history-game ${game.result ? "done" : ""}`}>
                                                <h3>{DAILY_GAME_NAMES[game.code] ?? game.code}</h3>
                                                <p className="daily-history-grid">{dailyGridLabel(game.code, game.size, game.emptyCells)}</p>
                                                <p className="daily-history-result">
                                                    {game.result
                                                        ? <>✓ {formatDuration(game.result.durationMs)} · {game.result.rank}<sup>{game.result.rank === 1 ? "er" : "e"}</sup> / {game.result.total}</>
                                                        : <>{game.players} joueur{game.players > 1 ? "s" : ""} classé{game.players > 1 ? "s" : ""}</>}
                                                </p>
                                                <div className="daily-history-actions">
                                                    {isLoggedIn && !(isToday && game.result) && (
                                                        <Link className="primary"
                                                              to={isToday ? `/defi/${game.code}` : `/defi/${game.code}/${selectedDay.date}`}>
                                                            {isToday ? "Jouer" : "Rejouer"}
                                                        </Link>
                                                    )}
                                                    <Link to={leaderboard}>Classement</Link>
                                                </div>
                                            </article>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </>
                )}
            </section>
        </main>
    );
}
