/**
 * Bandeau des loteries, en haut de la page Hasard : ce n'est pas un jeu à choisir, tout le monde y participe
 * en misant (10 crédits misés = 1 ticket). Une bande fine : le titre et la règle, puis une pastille par loterie
 * (jour, semaine, mois) avec la cagnotte, le temps avant le tirage et mes tickets. Un clic ouvre le détail.
 * Joueur pas connecté : la règle seulement, avec un lien pour se connecter.
 */

import "./Lottery.scss";
import {Link} from "react-router-dom";
import {FaChevronRight, FaCoins, FaTicketAlt} from "react-icons/fa";
import {useAuth} from "../../../Context/authContext.ts";
import {useLotteries} from "./useLotteries.ts";
import {chance, countdown, fmt, LOTTERY_SHORT} from "./lotteryFormat.ts";

export default function LotteryBanner() {
    const {isLoggedIn} = useAuth();
    const {lotteries, now} = useLotteries(isLoggedIn);

    return (
        <section className="lottery-banner" aria-label="Loteries">
            <div className="lottery-banner-head">
                <FaTicketAlt aria-hidden className="lottery-banner-icon"/>
                <p>
                    <strong>Loterie : tout le monde participe !</strong>
                    <span>10 crédits misés = 1 ticket · tirages à 23 h 59</span>
                </p>
                <Link to={isLoggedIn ? "/hasard/loterie" : "/login"} className="lottery-banner-more">
                    {isLoggedIn ? "Détails" : "Se connecter"} <FaChevronRight aria-hidden/>
                </Link>
            </div>

            {isLoggedIn && lotteries && (
                <div className="lottery-banner-draws">
                    {lotteries.map(l => (
                        <Link key={l.kind} to="/hasard/loterie" className={`lottery-banner-draw ${l.kind}`}
                              title={`${l.myTickets} ticket(s) · ${chance(l.myTickets, l.totalTickets)} de chances`}>
                            <span className="lottery-banner-kind">{LOTTERY_SHORT[l.kind]}</span>
                            <strong><FaCoins aria-hidden/> {fmt(l.prize)}</strong>
                            <small>
                                {l.drawAt > now ? countdown(l.drawAt - now) : "tirage…"} · <FaTicketAlt aria-hidden/> {fmt(l.myTickets)}
                            </small>
                        </Link>
                    ))}
                </div>
            )}
        </section>
    );
}
