/**
 * Loteries (/hasard/loterie) : une du jour, une de la semaine, une du mois (voir backend/src/utils/lottery.ts).
 * Chaque tranche de 10 crédits misés au Plinko ou à la roulette donne un ticket ; au tirage (23 h 59), un ticket
 * gagnant remporte une part de tous les crédits misés sur la période.
 * Pour chaque loterie : la cagnotte (ce que gagnerait le gagnant), les crédits misés, mes tickets, mes chances,
 * le compte à rebours du tirage et les derniers gagnants. Rafraîchi toutes les 15 secondes.
 * Le résumé est aussi en bandeau en haut de la page Hasard (LotteryBanner).
 */

import "./Lottery.scss";
import {Link, Navigate} from "react-router-dom";
import {FaChevronLeft, FaCoins, FaTicketAlt} from "react-icons/fa";
import {useAuth} from "../../../Context/authContext.ts";
import {useLotteries} from "./useLotteries.ts";
import {chance, countdown, drawLabel, fmt, LOTTERY_NAMES, shortDate} from "./lotteryFormat.ts";
import {playerPath} from "../../../Services/player.service.ts";
import RulesButton from "../RulesButton.tsx";
import LotteryRules from "./LotteryRules.tsx";
import Loader from "../../Loader/Loader.tsx";

export default function LotteryPage() {
    const auth = useAuth();
    const {lotteries, error, now} = useLotteries(auth.isLoggedIn);

    if (!auth.isLoggedIn) return <Navigate to="/login" replace/>;

    return (
        <main className="lottery">
            <div className="lottery-page">
                <Link to="/hasard" className="lottery-back"><FaChevronLeft aria-hidden/> Hasard</Link>
                <div className="casino-title">
                    <h1>Loterie</h1>
                    <RulesButton title="Règles des loteries"><LotteryRules/></RulesButton>
                </div>
                <p className="lottery-sub">Chaque tranche de 10 crédits misés au Plinko ou à la roulette te donne un ticket.</p>

                {error && <p className="lottery-error" role="alert">{error}</p>}
                {!lotteries ? !error && <Loader label="Chargement des loteries…"/> : (
                    <div className="lottery-cards">
                        {lotteries.map(l => (
                            <section key={l.kind} className={`lottery-card ${l.kind}`}>
                                <header>
                                    <h2>{LOTTERY_NAMES[l.kind]}</h2>
                                    <span className="lottery-draw">
                                        Tirage {drawLabel(l.kind, l.drawAt)}
                                        <b>{l.drawAt > now ? `dans ${countdown(l.drawAt - now)}` : "en cours…"}</b>
                                    </span>
                                </header>

                                <div className="lottery-prize">
                                    <span>Cagnotte</span>
                                    <strong><FaCoins aria-hidden/> {fmt(l.prize)}</strong>
                                    <small>{l.percent} % des {fmt(l.totalBet)} crédits misés sur la période</small>
                                </div>

                                <dl className="lottery-mine">
                                    <div>
                                        <dt>Tes tickets</dt>
                                        <dd><FaTicketAlt aria-hidden/> {fmt(l.myTickets)} <small>sur {fmt(l.totalTickets)}</small></dd>
                                    </div>
                                    <div>
                                        <dt>Tes chances</dt>
                                        <dd>{chance(l.myTickets, l.totalTickets)}</dd>
                                    </div>
                                    <div>
                                        <dt>Tes mises</dt>
                                        <dd>{fmt(l.myBet)} <small>crédits</small></dd>
                                    </div>
                                    <div>
                                        <dt>Joueurs</dt>
                                        <dd>{fmt(l.players)}</dd>
                                    </div>
                                </dl>
                                <p className="lottery-next">
                                    Encore <b>{l.nextTicketIn}</b> crédit{l.nextTicketIn > 1 ? "s" : ""} misé{l.nextTicketIn > 1 ? "s" : ""} pour un ticket de plus.
                                </p>

                                <div className="lottery-winners">
                                    <span>Derniers gagnants</span>
                                    {l.winners.length === 0 ? <p>Pas encore de gagnant.</p> : (
                                        <ul>
                                            {l.winners.map(w => (
                                                <li key={w.date}>
                                                    <span>{shortDate(w.date)}</span>
                                                    <Link to={playerPath(w.username)}>{w.username}</Link>
                                                    <b>+{fmt(w.prize)}</b>
                                                </li>
                                            ))}
                                        </ul>
                                    )}
                                </div>
                            </section>
                        ))}
                    </div>
                )}
            </div>
        </main>
    );
}
