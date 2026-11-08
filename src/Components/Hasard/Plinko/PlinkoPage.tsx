/**
 * Plinko (/hasard/plinko) : on mise des crédits, on lâche une bille, elle rebondit sur les clous
 * et le multiplicateur de la case où elle tombe donne le gain.
 *
 * Le serveur encaisse la mise, tire la chute (graine) et paie le gain tout de suite ; le site rejoue la même
 * chute à l'écran. Les crédits du header baissent de la mise au lâcher et montent du gain à l'arrivée.
 * Plusieurs billes peuvent tomber en même temps.
 * En direct : chaque seconde, la page demande les billes lâchées par les autres joueurs et les fait tomber en fond,
 * grises et transparentes, à l'endroit où elles en sont.
 */

import "./Plinko.scss";
import {useEffect, useRef, useState} from "react";
import {Link, Navigate} from "react-router-dom";
import {FaChevronLeft, FaCoins} from "react-icons/fa";
import {useAuth} from "../../../Context/authContext.ts";
import {ApiError} from "../../../api/api.ts";
import {casinoService} from "../../../Services/casino.service.ts";
import {useChipImage} from "../../../Services/chipSets.ts";
import {plinkoBallFile, useMyPlinkoBall, usePlinkoBalls} from "../../../Services/plinkoBalls.ts";
import {PLINKO_BETS, simulatePlinko} from "../../../../backend/src/utils/plinko.ts";
import PlinkoBoard, {type PlinkoBoardHandle} from "./PlinkoBoard.tsx";
import PlinkoRules from "./PlinkoRules.tsx";
import RulesButton from "../RulesButton.tsx";

type HistoryEntry = { id: number; bet: number; multiplier: number; payout: number };

const HISTORY_SIZE = 8;
const LIVE_POLL_MS = 1000;

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
    const {setCredits} = auth;
    const chipImage = useChipImage();
    // bille choisie dans la boutique, et catalogue des billes (images)
    const balls = usePlinkoBalls();
    const myBall = useMyPlinkoBall();

    // Billes des autres joueurs : rejouées en fond, une seule fois chacune
    const [players, setPlayers] = useState(0);
    useEffect(() => {
        if (!auth.isLoggedIn) return;
        const controller = new AbortController();
        const seen = new Set<string>();
        const load = async () => {
            const sent = Date.now();
            try {
                const live = await casinoService.plinkoLive(controller.signal);
                // âge mesuré par la base au moment de la réponse : on ajoute la moitié du trajet du retour
                const travel = (Date.now() - sent) / 2;
                for (const d of live.drops) {
                    if (seen.has(d.id)) continue;
                    seen.add(d.id);
                    board.current?.ghost(simulatePlinko(d.seed), d.ago + travel, plinkoBallFile(d.ball));
                }
                setPlayers(live.players);
            } catch {
                // réseau coupé : on réessaie à la seconde suivante
            }
        };
        void load();
        const timer = window.setInterval(() => void load(), LIVE_POLL_MS);
        return () => {
            controller.abort();
            window.clearInterval(timer);
        };
    }, [auth.isLoggedIn]);

    // Page quittée avec des billes en l'air : le header reprend tout de suite le vrai solde
    useEffect(() => () => {
        if (pending.current > 0) setCredits(serverCredits.current);
    }, [setCredits]);

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
            }, plinkoBallFile(myBall, balls));
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
                    <div className="casino-title">
                        <h1>Plinko</h1>
                        <RulesButton title="Règles du Plinko"><PlinkoRules/></RulesButton>
                    </div>
                    <p className="plinko-sub">Lâche une bille : la case où elle tombe multiplie ta mise.</p>

                    <span className="plinko-label">Mise</span>
                    <div className="plinko-bets" role="radiogroup" aria-label="Mise">
                        {PLINKO_BETS.map(b => (
                            <button key={b} type="button" role="radio" aria-checked={bet === b} aria-label={`Miser ${b}`}
                                    className={`plinko-bet ${bet === b ? "active" : ""}`} disabled={auth.credits < b}
                                    onClick={() => setBet(b)}>
                                <img src={chipImage(b)} alt="" draggable={false}/>
                            </button>
                        ))}
                    </div>

                    <button type="button" className="plinko-drop" disabled={sending || !canAfford} onClick={() => void drop()}>
                        {canAfford ? <>Lâcher une bille · <FaCoins aria-hidden/> {bet}</> : "Pas assez de crédits"}
                    </button>
                    {error && <p className="plinko-error" role="alert">{error}</p>}
                    {inFlight > 0 && <p className="plinko-inflight">{inFlight} bille{inFlight > 1 ? "s" : ""} en jeu</p>}
                    {/* autres joueurs de la dernière minute : leurs billes passent en gris sur le plateau */}
                    <p className="plinko-players">
                        <img className="plinko-ghost-dot" src={plinkoBallFile(myBall, balls)} alt="" aria-hidden/>
                        {players > 0 ? `${players} autre${players > 1 ? "s" : ""} joueur${players > 1 ? "s" : ""} sur la table`
                            : "Personne d'autre pour l'instant"}
                    </p>

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
