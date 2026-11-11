/**
 * Plinko (/hasard/plinko) : on mise des crédits, on lâche une bille, elle rebondit sur les clous
 * et le multiplicateur de la case où elle tombe donne le gain.
 *
 * Le serveur encaisse la mise, tire la chute (graine) et paie le gain tout de suite ; le site rejoue la même
 * chute à l'écran. Les crédits du header baissent de la mise au lâcher et montent du gain à l'arrivée.
 * Plusieurs billes peuvent tomber en même temps. On peut en lâcher 1, 5 ou 10 d'un coup (choix retenu dans le
 * navigateur) : elles partent l'une après l'autre, à DROP_GAP_MS d'écart, et la série s'arrête faute de crédits.
 * Trois tableaux de gains au choix (prudent, équilibré, risqué) : même plateau, mêmes chances par case, mais des
 * multiplicateurs plus ou moins écartés. Le choix est retenu dans le navigateur ; il est bloqué tant qu'une bille
 * tombe (les cases affichées sont toujours celles qui paient).
 * En direct : chaque seconde, la page demande les billes lâchées par les autres joueurs et les fait tomber en fond,
 * grises et transparentes, à l'endroit où elles en sont. Deux cases à cocher (retenues dans le navigateur) choisissent
 * lesquelles montrer : celles des amis, celles des autres joueurs ; avec les deux, les billes des amis ont un contour
 * bleu. Avec beaucoup de monde, on voit mieux ses propres billes.
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
import {DEFAULT_PLINKO_RISK, isPlinkoRisk, PLINKO_BETS, PLINKO_RISKS, type PlinkoRisk, simulatePlinko} from "../../../../backend/src/utils/plinko.ts";
import PlinkoBoard, {type PlinkoBoardHandle} from "./PlinkoBoard.tsx";
import PlinkoRules from "./PlinkoRules.tsx";
import RulesButton from "../RulesButton.tsx";
import {RISK_LABELS} from "./plinkoRisks.ts";
import {useStoredFlag} from "../../PuzzleUI/useStoredFlag.ts";
import {useMaintenance} from "../../../Services/maintenance.ts";
import {useActivity} from "../../../Services/useActivity.ts";

type HistoryEntry = { id: number; bet: number; multiplier: number; payout: number };

const HISTORY_SIZE = 8;
const LIVE_POLL_MS = 1000;

// Dernier tableau choisi, retenu dans le navigateur
const RISK_KEY = "jokr:plinko-risk";

// Billes lâchées d'un coup (retenu dans le navigateur), et écart entre deux billes d'une même série
const COUNTS = [1, 5, 10] as const;
type DropCount = typeof COUNTS[number];
const COUNT_KEY = "jokr:plinko-count";
const DROP_GAP_MS = 120;

function savedCount(): DropCount {
    try {
        const saved = Number(localStorage.getItem(COUNT_KEY));
        return COUNTS.find(c => c === saved) ?? 1;
    } catch {
        return 1;
    }
}

function savedRisk(): PlinkoRisk {
    try {
        const saved = localStorage.getItem(RISK_KEY);
        return isPlinkoRisk(saved) ? saved : DEFAULT_PLINKO_RISK;
    } catch {
        return DEFAULT_PLINKO_RISK;
    }
}

export default function PlinkoPage() {
    const auth = useAuth();
    const board = useRef<PlinkoBoardHandle>(null);
    const [bet, setBet] = useState<number>(PLINKO_BETS[0]);
    const [risk, setRisk] = useState<PlinkoRisk>(savedRisk);
    const [count, setCount] = useState<DropCount>(savedCount);
    // mise à jour activée : plus de nouvelle bille ; l'écran de mise à jour arrive quand les miennes sont tombées
    const updating = useMaintenance().on;
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

    // Billes des autres joueurs : rejouées en fond, une seule fois chacune (sauf si le joueur les masque)
    const [players, setPlayers] = useState(0);
    const [hideOthers, setHideOthers] = useStoredFlag("jokr:plinko:hideOthers");
    const [hideFriends, setHideFriends] = useStoredFlag("jokr:plinko:hideFriends");
    useEffect(() => {
        if (!auth.isLoggedIn) return;
        // choix changé : on repart de zéro, les billes encore en l'air reviennent au prochain passage si elles sont montrées
        board.current?.clearGhosts();
        // amis entourés de bleu seulement quand on voit aussi les autres (sinon tout le monde est un ami)
        const ringFriends = !hideFriends && !hideOthers;
        const controller = new AbortController();
        const seen = new Set<string>();
        const load = async () => {
            const sent = Date.now();
            try {
                const live = await casinoService.plinkoLive(controller.signal);
                // âge mesuré par la base au moment de la réponse : on ajoute la moitié du trajet du retour
                const travel = (Date.now() - sent) / 2;
                for (const d of live.drops) {
                    if (seen.has(d.id) || (d.friend ? hideFriends : hideOthers)) continue;
                    seen.add(d.id);
                    board.current?.ghost(simulatePlinko(d.seed), d.ago + travel, plinkoBallFile(d.ball), ringFriends && d.friend === true);
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
    }, [auth.isLoggedIn, hideOthers, hideFriends]);

    useActivity({page: "plinko", busy: inFlight > 0 || sending});

    // Page quittée avec des billes en l'air : le header reprend tout de suite le vrai solde
    useEffect(() => () => {
        if (pending.current > 0) setCredits(serverCredits.current);
    }, [setCredits]);

    if (!auth.isLoggedIn) return <Navigate to="/login" replace/>;

    const canAfford = auth.credits >= bet;

    function chooseRisk(next: PlinkoRisk) {
        setRisk(next);
        try {
            localStorage.setItem(RISK_KEY, next);
        } catch {
            // stockage indisponible : le choix vaut pour cette visite
        }
    }

    function chooseCount(next: DropCount) {
        setCount(next);
        try {
            localStorage.setItem(COUNT_KEY, String(next));
        } catch {
            // stockage indisponible : le choix vaut pour cette visite
        }
    }

    // Lâche la série : une bille après l'autre, arrêt dès qu'il manque des crédits ou qu'une bille échoue
    async function drop() {
        if (sending || !canAfford || updating) return;
        setSending(true);
        setError(null);
        let left = auth.credits;
        try {
            for (let i = 0; i < count && left >= bet; i++) {
                if (i > 0) await new Promise(resolve => window.setTimeout(resolve, DROP_GAP_MS));
                if (!await dropOne()) break;
                left -= bet;
            }
        } finally {
            setSending(false);
        }
    }

    async function dropOne(): Promise<boolean> {
        try {
            const result = await casinoService.plinko(bet, risk);
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
            return true;
        } catch (err) {
            setError(err instanceof ApiError ? err.message : "La bille n'a pas pu partir, réessaie.");
            return false;
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

                    <span className="plinko-label">Tableau</span>
                    <div className="plinko-risks" role="radiogroup" aria-label="Tableau de gains">
                        {PLINKO_RISKS.map(r => (
                            <button key={r} type="button" role="radio" aria-checked={risk === r}
                                    className={`plinko-risk ${r} ${risk === r ? "active" : ""}`}
                                    disabled={inFlight > 0 && risk !== r}
                                    title={inFlight > 0 && risk !== r ? "Attends que tes billes soient tombées" : RISK_LABELS[r].hint}
                                    onClick={() => chooseRisk(r)}>
                                {RISK_LABELS[r].name}
                            </button>
                        ))}
                    </div>
                    <p className="plinko-risk-hint">{RISK_LABELS[risk].hint}</p>

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

                    <span className="plinko-label">Billes</span>
                    <div className="plinko-risks plinko-counts" role="radiogroup" aria-label="Billes par lancer">
                        {COUNTS.map(c => (
                            <button key={c} type="button" role="radio" aria-checked={count === c}
                                    className={`plinko-risk ${count === c ? "active" : ""}`} disabled={sending}
                                    onClick={() => chooseCount(c)}>
                                ×{c}
                            </button>
                        ))}
                    </div>

                    <button type="button" className="plinko-drop" disabled={sending || !canAfford || updating} onClick={() => void drop()}>
                        {updating ? "Mise à jour imminente"
                            : !canAfford ? "Pas assez de crédits"
                            : count === 1 ? <>Lâcher une bille · <FaCoins aria-hidden/> {bet}</>
                                : <>Lâcher {count} billes · <FaCoins aria-hidden/> {count * bet}</>}
                    </button>
                    {error && <p className="plinko-error" role="alert">{error}</p>}
                    {inFlight > 0 && <p className="plinko-inflight">{inFlight} bille{inFlight > 1 ? "s" : ""} en jeu</p>}
                    {/* autres joueurs de la dernière minute : leurs billes passent en gris sur le plateau */}
                    <p className="plinko-players">
                        <img className="plinko-ghost-dot" src={plinkoBallFile(myBall, balls)} alt="" aria-hidden/>
                        {players > 0 ? `${players} autre${players > 1 ? "s" : ""} joueur${players > 1 ? "s" : ""} sur la table`
                            : "Personne d'autre pour l'instant"}
                    </p>
                    <label className="plinko-others-toggle friends">
                        <input type="checkbox" checked={!hideFriends} onChange={e => setHideFriends(!e.target.checked)}/>
                        Voir les billes de mes amis
                    </label>
                    <label className="plinko-others-toggle">
                        <input type="checkbox" checked={!hideOthers} onChange={e => setHideOthers(!e.target.checked)}/>
                        Voir les billes des autres joueurs
                    </label>

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
                    <PlinkoBoard ref={board} risk={risk}/>
                </section>
            </div>
        </main>
    );
}
