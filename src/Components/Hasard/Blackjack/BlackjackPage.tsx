/**
 * Blackjack en solo contre le croupier (/hasard/blackjack). Règles et gains : backend/src/utils/blackjack.ts.
 *
 * Le serveur garde la main (sabot, carte cachée) : le site envoie la mise puis chaque coup (tirer, rester, doubler,
 * séparer) et affiche ce qu'il reçoit. Une main pas finie est reprise en revenant sur la page.
 * À la fin, les cartes du croupier se retournent une à une, puis le résultat et le nouveau solde s'affichent.
 * Réglages à gauche, table au milieu, dernières mains à droite (dessous sur les écrans plus étroits).
 */

import "./Blackjack.scss";
import {useCallback, useEffect, useState} from "react";
import {Link, Navigate} from "react-router-dom";
import {FaChevronLeft, FaCoins} from "react-icons/fa";
import {BLACKJACK_BETS, type BlackjackAction, type BlackjackView, type HandOutcome} from "../../../../backend/src/utils/blackjack.ts";
import {useAuth} from "../../../Context/authContext.ts";
import {ApiError} from "../../../api/api.ts";
import {type BlackjackTable, casinoService} from "../../../Services/casino.service.ts";
import {useChipImage} from "../../../Services/chipSets.ts";
import {useMaintenance} from "../../../Services/maintenance.ts";
import {useActivity} from "../../../Services/useActivity.ts";
import RulesButton from "../RulesButton.tsx";
import BlackjackRules from "./BlackjackRules.tsx";
import PlayingCard from "./PlayingCard.tsx";

// délai entre deux cartes du croupier retournées à la fin
const REVEAL_MS = 550;
const RECENT_SIZE = 5;

const OUTCOMES: Record<HandOutcome, string> = {
    blackjack: "Blackjack !",
    win: "Gagné",
    push: "Égalité",
    lose: "Perdu",
    bust: "Plus de 21",
};

type Recent = BlackjackTable["recent"][number];

export default function BlackjackPage() {
    const auth = useAuth();
    const chipImage = useChipImage();
    const updating = useMaintenance().on;
    const [bet, setBet] = useState<number>(BLACKJACK_BETS[0]);
    const [hand, setHand] = useState<BlackjackView | null>(null);
    const [recent, setRecent] = useState<Recent[]>([]);
    const [sending, setSending] = useState(false);
    const [error, setError] = useState<string | null>(null);
    // cartes du croupier déjà retournées (main finie) ; le solde n'est mis à jour qu'après
    const [revealed, setRevealed] = useState(0);
    const [pendingCredits, setPendingCredits] = useState<number | null>(null);
    const {setCredits} = auth;

    // Main en cours (reprise) et dernières mains
    useEffect(() => {
        if (!auth.isLoggedIn) return;
        const controller = new AbortController();
        casinoService.blackjack(controller.signal).then(t => {
            setHand(t.hand);
            setRecent(t.recent);
        }).catch(() => undefined);
        return () => controller.abort();
    }, [auth.isLoggedIn]);

    const dealerCount = hand?.dealer.length ?? 0;
    const revealing = !!hand?.finished && revealed < dealerCount;
    const over = !!hand?.finished && !revealing;

    // Fin de main : cartes du croupier retournées une à une, puis résultat et solde
    useEffect(() => {
        if (!hand?.finished) return;
        if (revealed < dealerCount) {
            const timer = window.setTimeout(() => setRevealed(r => r + 1), revealed === 0 ? 0 : REVEAL_MS);
            return () => window.clearTimeout(timer);
        }
        if (pendingCredits === null) return;
        const timer = window.setTimeout(() => {
            setCredits(pendingCredits);
            setPendingCredits(null);
            setRecent(r => [{bet: hand.bet, payout: hand.payout, outcomes: hand.hands.map(h => h.outcome)}, ...r].slice(0, RECENT_SIZE));
        }, 0);
        return () => window.clearTimeout(timer);
    }, [hand, revealed, dealerCount, pendingCredits, setCredits]);

    useActivity({page: "blackjack", busy: !!hand && !over});

    const send = useCallback(async (call: () => Promise<{ hand: BlackjackView; credits: number }>) => {
        setSending(true);
        setError(null);
        try {
            const result = await call();
            setHand(result.hand);
            if (result.hand.finished) {
                // la carte visible du croupier l'est déjà : on retourne les suivantes
                setRevealed(1);
                setPendingCredits(result.credits);
            } else {
                setRevealed(0);
                setCredits(result.credits);
            }
        } catch (err) {
            setError(err instanceof ApiError ? err.message : "La partie n'a pas pu continuer, réessaie.");
        } finally {
            setSending(false);
        }
    }, [setCredits]);

    const deal = () => void send(() => casinoService.blackjackStart(bet));
    const act = (action: BlackjackAction) => void send(() => casinoService.blackjackAct(action));

    if (!auth.isLoggedIn) return <Navigate to="/login" replace/>;

    const playing = !!hand && !hand.finished;
    const activeHand = playing ? hand.hands[hand.active] : undefined;
    const extraBet = activeHand?.bet ?? 0;
    const canDeal = !playing && !revealing && !sending && !updating && auth.credits >= bet;
    // cartes du croupier affichées : la visible, puis celles déjà retournées ; la cachée reste de dos
    const dealerCards = hand ? (hand.finished ? hand.dealer.slice(0, Math.max(1, revealed)).concat(revealed < 2 ? [null] : []) : hand.dealer) : [];
    const net = over && hand ? hand.payout - hand.bet : 0;

    return (
        <main className="blackjack">
            <div className="bj-layout">
                <section className="bj-controls">
                    <Link to="/hasard" className="bj-back"><FaChevronLeft aria-hidden/> Hasard</Link>
                    <div className="casino-title">
                        <h1>Blackjack</h1>
                        <RulesButton title="Règles du blackjack"><BlackjackRules/></RulesButton>
                    </div>

                    <span className="bj-label">Mise</span>
                    <div className="bj-bets" role="radiogroup" aria-label="Mise">
                        {BLACKJACK_BETS.map(b => (
                            <button key={b} type="button" role="radio" aria-checked={bet === b} aria-label={`Miser ${b}`}
                                    className={`bj-bet ${bet === b ? "active" : ""}`} disabled={auth.credits < b || playing || revealing}
                                    onClick={() => setBet(b)}>
                                <img src={chipImage(b)} alt="" draggable={false}/>
                            </button>
                        ))}
                    </div>

                    <button type="button" className="bj-deal" disabled={!canDeal} onClick={deal}>
                        {updating ? "Mise à jour imminente"
                            : playing ? "Main en cours"
                                : auth.credits < bet ? "Pas assez de crédits"
                                    : <>{hand ? "Rejouer" : "Distribuer"} · <FaCoins aria-hidden/> {bet}</>}
                    </button>
                    {error && <p className="bj-error" role="alert">{error}</p>}
                </section>

                <section className="bj-table" aria-label="Table de blackjack">
                    <div className="bj-row dealer">
                        <span className="bj-who">Croupier{hand && <strong>{over ? hand.dealerTotal : hand.finished ? "…" : hand.dealerTotal}</strong>}</span>
                        <div className="bj-cards">
                            {dealerCards.map((c, i) => <PlayingCard key={`${i}-${c ? c.rank + c.suit : "x"}`} card={c} index={i}/>)}
                        </div>
                    </div>

                    <p className={`bj-message ${over ? (net > 0 ? "win" : net === 0 ? "push" : "lose") : ""}`} aria-live="polite">
                        {!hand ? "Choisis ta mise et distribue."
                            : over ? (net > 0 ? `Gagné : +${net.toLocaleString("fr-FR")}` : net === 0 ? "Mise rendue" : `Perdu : ${net.toLocaleString("fr-FR")}`)
                                : revealing ? "Le croupier joue…"
                                    : hand.hands.length > 1 ? `Main ${hand.active + 1} sur ${hand.hands.length}` : "À toi de jouer"}
                    </p>

                    <div className={`bj-hands ${hand && hand.hands.length > 1 ? "split" : ""}`}>
                        {hand?.hands.map((h, i) => (
                            <div key={i} className={`bj-row player ${playing && hand.hands.length > 1 && i === hand.active ? "active" : ""} ${over ? h.outcome : ""}`}>
                                <div className="bj-cards">
                                    {h.cards.map((c, j) => <PlayingCard key={j} card={c} index={j}/>)}
                                </div>
                                <span className="bj-who">
                                    <strong>{h.total}</strong>
                                    <span className="bj-hand-bet"><FaCoins aria-hidden/> {h.bet}{h.doubled && " (doublée)"}</span>
                                    {over && h.outcome && <span className={`bj-outcome ${h.outcome}`}>{OUTCOMES[h.outcome]}</span>}
                                </span>
                            </div>
                        ))}
                    </div>

                    {playing && (
                        <div className="bj-actions">
                            <button type="button" disabled={sending} onClick={() => act("hit")}>Tirer</button>
                            <button type="button" disabled={sending} onClick={() => act("stand")}>Rester</button>
                            {hand.canDouble && (
                                <button type="button" disabled={sending || auth.credits < extraBet} onClick={() => act("double")}>
                                    Doubler · <FaCoins aria-hidden/> {extraBet}
                                </button>
                            )}
                            {hand.canSplit && (
                                <button type="button" disabled={sending || auth.credits < extraBet} onClick={() => act("split")}>
                                    Séparer · <FaCoins aria-hidden/> {extraBet}
                                </button>
                            )}
                        </div>
                    )}
                </section>

                {/* dernières mains : à droite de la table (dessous sur les écrans plus étroits) */}
                <section className="bj-side" aria-label="Dernières mains">
                    <span className="bj-label">Dernières mains</span>
                    {recent.length === 0 ? <p className="bj-recent-empty">Tes mains s'afficheront ici.</p> : (
                        <ul className="bj-recent">
                            {recent.map((r, i) => {
                                const gain = r.payout - r.bet;
                                return (
                                    <li key={`${recent.length - i}`} className={gain > 0 ? "win" : gain === 0 ? "even" : "loss"}>
                                        <span>{gain > 0 ? "+" : ""}{gain.toLocaleString("fr-FR")}</span>
                                        <small>{r.outcomes.includes("blackjack") ? "blackjack · " : ""}mise {r.bet}</small>
                                    </li>
                                );
                            })}
                        </ul>
                    )}
                </section>
            </div>
        </main>
    );
}
