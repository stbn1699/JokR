/**
 * Plinko (/hasard/plinko) : on mise des crédits, on lâche une bille, elle rebondit sur les clous
 * et le multiplicateur de la case où elle tombe donne le gain.
 *
 * Le serveur encaisse la mise, tire la chute (graine) et paie le gain tout de suite ; le site rejoue la même
 * chute à l'écran. Les crédits du header baissent de la mise au lâcher et montent du gain à l'arrivée.
 * Plusieurs billes peuvent tomber en même temps.
 */

import "./Plinko.scss";
import {useRef, useState} from "react";
import {Link, Navigate} from "react-router-dom";
import {FaChevronLeft, FaCoins} from "react-icons/fa";
import {useAuth} from "../../../Context/authContext.ts";
import {ApiError} from "../../../api/api.ts";
import {casinoService} from "../../../Services/casino.service.ts";
import {PLINKO_BETS, simulatePlinko} from "../../../../backend/src/utils/plinko.ts";
import PlinkoBoard, {type PlinkoBoardHandle} from "./PlinkoBoard.tsx";

type HistoryEntry = { id: number; bet: number; multiplier: number; payout: number };

const HISTORY_SIZE = 8;

export default function PlinkoPage() {
    const auth = useAuth();
    const board = useRef<PlinkoBoardHandle>(null);
    const [bet, setBet] = useState<number>(PLINKO_BETS[0]);
    const [sending, setSending] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [history, setHistory] = useState<HistoryEntry[]>([]);
    const [inFlight, setInFlight] = useState(0);
    // Solde réel (serveur) et gains des billes encore en l'air : le header affiche le solde moins ces gains
    const serverCredits = useRef(0);
    const pending = useRef(0);
    const nextId = useRef(0);

    if (!auth.isLoggedIn) return <Navigate to="/login" replace/>;

    const canAfford = auth.credits >= bet;

    async function drop() {
        if (sending || !canAfford) return;
        setSending(true);
        setError(null);
        try {
            const result = await casinoService.plinko(bet);
            const fall = simulatePlinko(result.seed);
            // même moteur des deux côtés : la case doit être la même (sinon on garde celle du serveur)
            if (fall.slot !== result.slot) console.warn("Plinko : chute rejouée différente du serveur", result.seed);

            serverCredits.current = result.credits;
            pending.current += result.payout;
            auth.setCredits(serverCredits.current - pending.current);
            setInFlight(n => n + 1);

            const entry: HistoryEntry = {id: nextId.current++, bet, multiplier: result.multiplier, payout: result.payout};
            board.current?.drop({...fall, slot: result.slot}, () => {
                pending.current -= result.payout;
                auth.setCredits(serverCredits.current - pending.current);
                setInFlight(n => n - 1);
                setHistory(h => [entry, ...h].slice(0, HISTORY_SIZE));
            });
        } catch (err) {
            setError(err instanceof ApiError ? err.message : "La bille n'a pas pu partir, réessaie.");
        } finally {
            setSending(false);
        }
    }

    return (
        <main className="plinko">
            <div className="plinko-layout">
                <section className="plinko-controls">
                    <Link to="/hasard" className="plinko-back"><FaChevronLeft aria-hidden/> Hasard</Link>
                    <h1>Plinko</h1>
                    <p className="plinko-sub">Lâche une bille : la case où elle tombe multiplie ta mise.</p>

                    <span className="plinko-label">Mise</span>
                    <div className="plinko-bets" role="radiogroup" aria-label="Mise">
                        {PLINKO_BETS.map(b => (
                            <button key={b} type="button" role="radio" aria-checked={bet === b}
                                    className={`plinko-bet ${bet === b ? "active" : ""}`} disabled={auth.credits < b}
                                    onClick={() => setBet(b)}>
                                {b}
                            </button>
                        ))}
                    </div>

                    <button type="button" className="plinko-drop" disabled={sending || !canAfford} onClick={() => void drop()}>
                        {canAfford ? <>Lâcher une bille · <FaCoins aria-hidden/> {bet}</> : "Pas assez de crédits"}
                    </button>
                    {error && <p className="plinko-error" role="alert">{error}</p>}
                    {inFlight > 0 && <p className="plinko-inflight">{inFlight} bille{inFlight > 1 ? "s" : ""} en jeu</p>}

                    {history.length > 0 && (
                        <ul className="plinko-history" aria-label="Dernières billes">
                            {history.map(h => (
                                <li key={h.id} className={h.payout > h.bet ? "win" : h.payout === h.bet ? "even" : "loss"}>
                                    <span>{h.multiplier}×</span>
                                    <span>{h.payout - h.bet >= 0 ? "+" : ""}{h.payout - h.bet}</span>
                                </li>
                            ))}
                        </ul>
                    )}
                </section>

                <section className="plinko-board">
                    <PlinkoBoard ref={board}/>
                </section>
            </div>
        </main>
    );
}
