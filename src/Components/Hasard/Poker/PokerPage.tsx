/**
 * Poker à 5 cartes en solo (/hasard/poker), vidéo poker « Jacks or Better » : règles et gains dans
 * backend/src/utils/poker.ts. Le joueur mise, reçoit 5 cartes, clique celles qu'il garde, puis tire : les autres
 * sont remplacées et la main est payée selon sa combinaison. Le serveur garde le paquet ; une main donnée mais pas
 * encore tirée est reprise en revenant sur la page.
 *
 * Le tirage se voit étape par étape : les cartes non gardées s'envolent, de nouvelles arrivent face cachée puis se
 * retournent une à une ; ensuite un bandeau donne le résultat, les cartes de la combinaison s'allument (ou, main
 * perdue, on explique pourquoi), puis le solde se met à jour.
 * Réglages à gauche, table au milieu (tableau des gains et cartes), dernières mains à droite.
 */

import "./Poker.scss";
import {useEffect, useState} from "react";
import {Link, Navigate} from "react-router-dom";
import {FaChevronLeft, FaCoins} from "react-icons/fa";
import type {Card} from "../../../../backend/src/utils/blackjack.ts";
import {
    POKER_BETS,
    POKER_PAYTABLE,
    type PokerHand,
    pokerHandName,
    pokerMiss,
    pokerResultName,
    pokerScoringCards,
    type PokerView,
} from "../../../../backend/src/utils/poker.ts";
import {useAuth} from "../../../Context/authContext.ts";
import {ApiError} from "../../../api/api.ts";
import {casinoService, type PokerTable} from "../../../Services/casino.service.ts";
import {useChipImage} from "../../../Services/chipSets.ts";
import {useMaintenance} from "../../../Services/maintenance.ts";
import {useActivity} from "../../../Services/useActivity.ts";
import {confetti} from "../../Confetti/Confetti.tsx";
import RulesButton from "../RulesButton.tsx";
import PlayingCard from "../Blackjack/PlayingCard.tsx";
import PokerRules from "./PokerRules.tsx";

const RECENT_SIZE = 6;
// cartes non gardées qui s'envolent, nouvelles cartes face cachée, puis retournées une à une
const TOSS_MS = 380;
const BACKS_MS = 420;
const FLIP_MS = 300;
const NONE = [false, false, false, false, false];
const fr = (n: number) => n.toLocaleString("fr-FR");

type Recent = PokerTable["recent"][number];
// hold : choix des cartes ; toss / backs / reveal : tirage en train de se jouer ; done : résultat affiché
type Phase = "idle" | "hold" | "toss" | "backs" | "reveal" | "done";

export default function PokerPage() {
    const auth = useAuth();
    const chipImage = useChipImage();
    const updating = useMaintenance().on;
    const [bet, setBet] = useState<number>(POKER_BETS[0]);
    const [hand, setHand] = useState<PokerView | null>(null);
    // cartes avant le tirage (affichées pendant que les autres s'envolent)
    const [before, setBefore] = useState<Card[] | null>(null);
    const [held, setHeld] = useState<boolean[]>(NONE);
    const [phase, setPhase] = useState<Phase>("idle");
    // nouvelles cartes déjà retournées
    const [flipped, setFlipped] = useState(0);
    const [pendingCredits, setPendingCredits] = useState<number | null>(null);
    // donnes faites sur la page : rejoue l'animation de distribution
    const [round, setRound] = useState(0);
    const [recent, setRecent] = useState<Recent[]>([]);
    const [sending, setSending] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const {setCredits} = auth;

    // Main en cours (reprise) et dernières mains
    useEffect(() => {
        if (!auth.isLoggedIn) return;
        const controller = new AbortController();
        casinoService.poker(controller.signal).then(t => {
            setHand(t.hand);
            if (t.hand) {
                setHeld(t.hand.held);
                setPhase(t.hand.finished ? "done" : "hold");
            }
            setRecent(t.recent);
        }).catch(() => undefined);
        return () => controller.abort();
    }, [auth.isLoggedIn]);

    const replaced = held.map(h => !h);
    const toReplace = replaced.filter(Boolean).length;

    // Déroulé du tirage : envol → dos → cartes retournées une à une → résultat, puis solde et historique
    useEffect(() => {
        if (!hand?.finished) return;
        let timer: number | undefined;
        if (phase === "toss") timer = window.setTimeout(() => setPhase(toReplace > 0 ? "backs" : "reveal"), toReplace > 0 ? TOSS_MS : 0);
        else if (phase === "backs") timer = window.setTimeout(() => setPhase("reveal"), BACKS_MS);
        else if (phase === "reveal") {
            timer = window.setTimeout(() => {
                if (flipped < toReplace) return setFlipped(f => f + 1);
                setPhase("done");
                if (pendingCredits !== null) setCredits(pendingCredits);
                setPendingCredits(null);
                setRecent(list => [{bet: hand.bet, payout: hand.payout ?? 0, hand: hand.hand ?? "nothing"}, ...list].slice(0, RECENT_SIZE));
                if (pokerMultiplierOf(hand.hand) >= 25) confetti();
            }, flipped === 0 ? 60 : FLIP_MS);
        }
        return () => window.clearTimeout(timer);
    }, [hand, phase, flipped, toReplace, pendingCredits, setCredits]);

    const holding = phase === "hold";
    const drawing = phase === "toss" || phase === "backs" || phase === "reveal";
    useActivity({page: "poker", busy: holding || drawing || sending});

    async function deal() {
        setSending(true);
        setError(null);
        try {
            const r = await casinoService.pokerDeal(bet);
            setHand(r.hand);
            setBefore(null);
            setHeld(NONE);
            setFlipped(0);
            setPhase("hold");
            setRound(n => n + 1);
            setCredits(r.credits);
        } catch (err) {
            setError(err instanceof ApiError ? err.message : "La donne n'a pas pu avoir lieu, réessaie.");
        } finally {
            setSending(false);
        }
    }

    async function draw() {
        if (!hand) return;
        setSending(true);
        setError(null);
        try {
            const r = await casinoService.pokerDraw(held);
            setBefore(hand.cards);
            setHand(r.hand);
            setFlipped(0);
            setPendingCredits(r.credits);
            setPhase("toss");
        } catch (err) {
            setError(err instanceof ApiError ? err.message : "Le tirage n'a pas pu avoir lieu, réessaie.");
        } finally {
            setSending(false);
        }
    }

    const toggle = (i: number) => {
        if (!holding || sending) return;
        setHeld(h => h.map((v, j) => j === i ? !v : v));
    };

    // Espace ou Entrée : donner ou tirer ; 1 à 5 : garder une carte
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if ((e.target as HTMLElement).closest("input, textarea, button, a")) return;
            const n = Number(e.key);
            if (holding && n >= 1 && n <= 5) {
                toggle(n - 1);
            } else if (e.code === "Space" || e.key === "Enter") {
                e.preventDefault();
                document.querySelector<HTMLButtonElement>(".poker-main:not(:disabled)")?.click();
            }
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    });

    if (!auth.isLoggedIn) return <Navigate to="/login" replace/>;

    const done = phase === "done" && !!hand?.finished;
    const won: PokerHand | null = done ? hand.hand ?? "nothing" : null;
    const scoring = done && hand ? (won === "nothing" ? pokerMiss(hand.cards).cards : pokerScoringCards(hand.cards, won!)) : [];
    const miss = done && won === "nothing" && hand ? pokerMiss(hand.cards) : null;
    const shownBet = hand?.bet ?? bet;
    const canDeal = !holding && !drawing && !sending && !updating && auth.credits >= bet;

    // Carte affichée à chaque place : celle d'avant pendant l'envol, de dos en attendant, puis la nouvelle
    const replacedOrder = replaced.map((r, i) => r ? replaced.slice(0, i).filter(Boolean).length : -1);
    const slot = (i: number): { card: Card | null; state: string } => {
        if (!hand) return {card: null, state: "empty"};
        const isNew = replaced[i] && (drawing || done) && before !== null;
        if (!isNew) return {card: hand.cards[i]!, state: ""};
        if (phase === "toss") return {card: before[i]!, state: "toss"};
        if (phase === "backs" || (phase === "reveal" && replacedOrder[i]! >= flipped)) return {card: null, state: "back"};
        return {card: hand.cards[i]!, state: "flip"};
    };

    const status = !hand ? "Mise, puis distribue tes 5 cartes."
        : holding ? (toReplace === 5 ? "Clique les cartes à garder (aucune gardée : les 5 seront changées)."
            : toReplace === 0 ? "Tu gardes tout : aucune carte ne sera changée."
                : `${5 - toReplace} gardée${5 - toReplace > 1 ? "s" : ""}, ${toReplace} à changer.`)
            : drawing ? (toReplace === 0 ? "Tu gardes ta main…" : `Nouvelle${toReplace > 1 ? "s" : ""} carte${toReplace > 1 ? "s" : ""}…`)
                : "";

    return (
        <main className="poker">
            <div className="poker-layout">
                <section className="poker-controls">
                    <Link to="/hasard" className="poker-back"><FaChevronLeft aria-hidden/> Hasard</Link>
                    <div className="casino-title">
                        <h1>Poker</h1>
                        <RulesButton title="Règles du poker"><PokerRules/></RulesButton>
                    </div>

                    <span className="poker-label">Mise</span>
                    <div className="poker-bets" role="radiogroup" aria-label="Mise">
                        {POKER_BETS.map(b => (
                            <button key={b} type="button" role="radio" aria-checked={bet === b} aria-label={`Miser ${b}`}
                                    className={`poker-bet ${bet === b ? "active" : ""}`} disabled={auth.credits < b || holding || drawing || sending}
                                    onClick={() => setBet(b)}>
                                <img src={chipImage(b)} alt="" draggable={false}/>
                            </button>
                        ))}
                    </div>

                    {holding || drawing ? (
                        <button type="button" className="poker-main draw" disabled={sending || drawing} onClick={() => void draw()}>
                            {drawing ? "Tirage…" : toReplace === 0 ? "Garder ma main" : `Changer ${toReplace} carte${toReplace > 1 ? "s" : ""}`}
                        </button>
                    ) : (
                        <button type="button" className="poker-main" disabled={!canDeal} onClick={() => void deal()}>
                            {updating ? "Mise à jour imminente"
                                : auth.credits < bet ? "Pas assez de crédits"
                                    : <>{hand ? "Rejouer" : "Distribuer"} · <FaCoins aria-hidden/> {bet}</>}
                        </button>
                    )}
                    {error && <p className="poker-error" role="alert">{error}</p>}
                </section>

                <section className={`poker-table ${done ? (won === "nothing" ? "lost" : "won") : ""}`} aria-label="Table de poker">
                    <table className="poker-pays">
                        <tbody>
                            {POKER_PAYTABLE.map(p => (
                                <tr key={p.hand} className={won === p.hand ? "won" : ""}>
                                    <td>{p.name}</td>
                                    <td>×{fr(p.pays)}</td>
                                    <td><FaCoins aria-hidden/> {fr(p.pays * shownBet)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>

                    <div className="poker-stage">
                        {/* bandeau du résultat, par-dessus le haut des cartes */}
                        {done && hand && (
                            <div className={`poker-banner ${won === "nothing" ? "lose" : "win"}`} role="status" key={`banner-${round}`}>
                                {won === "nothing" ? (
                                    <>
                                        <strong>Perdu · −{fr(hand.bet)}</strong>
                                        <span>{miss?.text}</span>
                                    </>
                                ) : (
                                    <>
                                        <strong>{pokerResultName(hand.cards, won!)} !</strong>
                                        <span className="poker-banner-gain"><FaCoins aria-hidden/> +{fr(hand.payout ?? 0)}</span>
                                    </>
                                )}
                            </div>
                        )}
                        {!done && <p className="poker-message" aria-live="polite">{status}</p>}

                        <div className="poker-cards">
                            {Array.from({length: 5}, (_, i) => {
                                const {card, state} = slot(i);
                                const kept = held[i]!;
                                const lit = scoring.includes(i);
                                const classes = [
                                    "poker-card",
                                    holding && kept ? "held" : "",
                                    holding && !kept ? "to-change" : "",
                                    state,
                                    done && lit ? (won === "nothing" ? "near" : "scoring") : "",
                                    done && !lit && scoring.length > 0 ? "dim" : "",
                                ].join(" ");
                                return (
                                    <button key={`${round}-${i}-${state}-${card ? card.rank + card.suit : "back"}`} type="button"
                                            className={classes} disabled={!holding || sending}
                                            aria-pressed={holding ? kept : undefined} onClick={() => toggle(i)}>
                                        <PlayingCard card={card} index={state === "" && phase === "hold" ? i : 0}/>
                                        <span className="poker-hold">{holding ? (kept ? "Gardée" : "Changer") : ""}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </section>

                <section className="poker-side" aria-label="Dernières mains">
                    <span className="poker-label">Dernières mains</span>
                    {recent.length === 0 ? <p className="poker-empty">Tes mains s'afficheront ici.</p> : (
                        <ul className="poker-recent">
                            {recent.map((r, i) => {
                                const gain = r.payout - r.bet;
                                return (
                                    <li key={`${recent.length - i}`} className={`${gain > 0 ? "win" : gain === 0 ? "even" : "loss"} ${i === 0 && done ? "fresh" : ""}`}>
                                        <span>{gain > 0 ? "+" : ""}{fr(gain)}</span>
                                        <small>{r.hand === "nothing" ? "rien" : pokerHandName(r.hand).toLowerCase()}</small>
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

const pokerMultiplierOf = (hand: PokerHand | undefined) => POKER_PAYTABLE.find(p => p.hand === hand)?.pays ?? 0;
