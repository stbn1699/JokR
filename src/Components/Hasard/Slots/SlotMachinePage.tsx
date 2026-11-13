/**
 * Une machine à sous (/hasard/machines/:id) : choix de la mise (jetons), du nombre de colonnes (3 à 5) et de lignes
 * de gain (1, 3, 5 ou 10 : moins de lignes, chaque ligne vaut plus), lancer (bouton ou barre d'espace), les rouleaux
 * qui s'arrêtent l'un après l'autre, les lignes gagnantes et le gain, les derniers lancers (colonne de droite).
 * Colonnes et lignes sont retenues dans le navigateur ; les lignes jouées sont tracées sur les rouleaux.
 * Lancers en série : 1, 5, 10 ou 25 lancers d'affilée (50 et 100 sous cadenas, à débloquer plus tard dans la
 * boutique). La machine enchaîne seule, avec une courte pause pour voir chaque résultat ; « Arrêter » laisse finir le
 * lancer en cours. La série s'arrête aussi faute de crédits ou à l'approche d'une mise à jour. Bilan de la série.
 *
 * Le serveur tire les arrêts, encaisse la mise et paie tout de suite ; le site anime les rouleaux jusqu'à ces
 * arrêts. Les crédits du header baissent de la mise au lancer et montent du gain à l'arrêt des rouleaux.
 * Pendant une mise à jour : plus de lancer, l'écran de mise à jour arrive une fois les rouleaux arrêtés.
 */

import "./Slots.scss";
import {useCallback, useEffect, useRef, useState} from "react";
import {Link, Navigate, useParams} from "react-router-dom";
import {FaChevronLeft, FaCoins, FaLock, FaStop} from "react-icons/fa";
import {useAuth} from "../../../Context/authContext.ts";
import {ApiError} from "../../../api/api.ts";
import {casinoService, type SlotSpinResult} from "../../../Services/casino.service.ts";
import {useChipImage} from "../../../Services/chipSets.ts";
import {useMaintenance} from "../../../Services/maintenance.ts";
import {useActivity} from "../../../Services/useActivity.ts";
import {
    isSlotLineCount,
    isSlotReelCount,
    SLOT_BETS,
    SLOT_LINE_COUNTS,
    SLOT_REEL_COUNTS,
    slotMachine,
} from "../../../../backend/src/utils/slots.ts";
import RulesButton from "../RulesButton.tsx";
import SlotReels, {type SlotReelsHandle} from "./SlotReels.tsx";
import SlotRules from "./SlotRules.tsx";
import {useStoredFlag} from "../../PuzzleUI/useStoredFlag.ts";

type HistoryEntry = { id: number; bet: number; payout: number };

const HISTORY_SIZE = 8;

// arrêts affichés à l'arrivée sur la page ou après un changement de colonnes (avant un lancer)
const randomStops = (reels: number, length: number) => Array.from({length: reels}, () => Math.floor(Math.random() * length));

// Colonnes et lignes choisies, retenues dans le navigateur
const REELS_KEY = "jokr:slots-reels";
const LINES_KEY = "jokr:slots-lines";

function saved(key: string, valid: (v: unknown) => v is number, fallback: number): number {
    try {
        const value = Number(localStorage.getItem(key));
        return valid(value) ? value : fallback;
    } catch {
        return fallback;
    }
}

function save(key: string, value: number) {
    try {
        localStorage.setItem(key, String(value));
    } catch {
        // stockage indisponible : le choix vaut pour cette visite
    }
}

// durée pendant laquelle les lignes restent bien visibles après en avoir changé le nombre
const SHOW_LINES_MS = 1800;

// Lancers en série : nombre de lancers d'affilée ; certains sont sous cadenas (boutique, plus tard)
const SPIN_COUNTS = [1, 5, 10, 25, 50, 100];
const LOCKED_COUNTS = new Set([50, 100]);
const COUNT_KEY = "jokr:slots-count";
const isSpinCount = (v: unknown): v is number => typeof v === "number" && SPIN_COUNTS.includes(v) && !LOCKED_COUNTS.has(v);
// pause entre deux lancers d'une série (le temps de voir le résultat)
const AUTO_GAP_MS = 700;

type Series = { total: number; spins: number; bet: number; won: number };

export default function SlotMachinePage() {
    const {id} = useParams();
    const machine = slotMachine(id);
    const auth = useAuth();
    const {setCredits} = auth;
    const chipImage = useChipImage();
    const reels = useRef<SlotReelsHandle>(null);
    const [reelCount, setReelCount] = useState(() => saved(REELS_KEY, isSlotReelCount, 3));
    const [lineCount, setLineCount] = useState(() => saved(LINES_KEY, isSlotLineCount, 5));
    const [initialStops, setInitialStops] = useState(() => randomStops(reelCount, machine?.strip.length ?? 1));
    // lignes bien visibles un instant après en avoir changé le nombre
    const [showLines, setShowLines] = useState(false);
    // tracés des lignes jouées masqués (choix retenu dans le navigateur)
    const [hideLines, setHideLines] = useStoredFlag("jokr:slots:hideLines");
    const [bet, setBet] = useState<number>(SLOT_BETS[0]);
    const [spinning, setSpinning] = useState(false);
    const [error, setError] = useState<string | null>(null);
    // résultat en cours d'animation, puis lignes gagnantes et gain une fois les rouleaux arrêtés
    const current = useRef<SlotSpinResult | null>(null);
    const [shown, setShown] = useState<{ wins: { line: number; count: number }[]; payout: number; bet: number } | null>(null);
    const [history, setHistory] = useState<HistoryEntry[]>([]);
    const nextId = useRef(0);
    // mise du lancer en cours (le joueur peut changer de jeton pendant que les rouleaux tournent)
    const lastBet = useRef(bet);
    const updating = useMaintenance().on;
    // série : lancers prévus, lancers encore à faire après celui en cours, et bilan
    const [spinCount, setSpinCount] = useState(() => saved(COUNT_KEY, isSpinCount, 1));
    const [autoLeft, setAutoLeft] = useState(0);
    const autoLeftRef = useRef(0);
    const autoTimer = useRef<number | null>(null);
    const [series, setSeries] = useState<Series | null>(null);
    // dernière version de spin, pour le lancer suivant d'une série (mise à jour après chaque rendu)
    const spinRef = useRef<() => Promise<boolean>>(async () => false);
    const setAuto = (n: number) => {
        autoLeftRef.current = n;
        setAutoLeft(n);
    };

    useActivity({page: "slots", busy: spinning || autoLeft > 0});

    const onStopped = useCallback(() => {
        const result = current.current;
        current.current = null;
        setSpinning(false);
        if (!result) return;
        setCredits(result.credits);
        setShown({wins: result.wins, payout: result.payout, bet: lastBet.current});
        setHistory(h => [{id: nextId.current++, bet: lastBet.current, payout: result.payout}, ...h].slice(0, HISTORY_SIZE));
        setSeries(s => s && {...s, spins: s.spins + 1, bet: s.bet + lastBet.current, won: s.won + result.payout});
        // série en cours : le lancer suivant après une courte pause
        if (autoLeftRef.current > 0) {
            autoTimer.current = window.setTimeout(() => {
                autoTimer.current = null;
                setAuto(autoLeftRef.current - 1);
                void spinRef.current().then(ok => {
                    if (!ok) setAuto(0);
                });
            }, AUTO_GAP_MS);
        }
    }, [setCredits]);

    const canSpin = !spinning && !updating && auth.credits >= bet;

    // Un lancer ; false s'il n'a pas pu partir (crédits, mise à jour, erreur du serveur)
    const spin = useCallback(async (): Promise<boolean> => {
        if (!machine || !canSpin) {
            if (machine && !spinning && auth.credits < bet) setError("Plus assez de crédits pour continuer");
            return false;
        }
        setSpinning(true);
        setShown(null);
        setError(null);
        lastBet.current = bet;
        try {
            const result = await casinoService.slotSpin(machine.id, bet, reelCount, lineCount);
            current.current = result;
            // le gain s'affiche à l'arrêt des rouleaux : en attendant, le solde sans le gain
            setCredits(result.credits - result.payout);
            reels.current?.spin(result.stops);
            return true;
        } catch (err) {
            setError(err instanceof ApiError ? err.message : "Les rouleaux n'ont pas pu partir, réessaie.");
            setSpinning(false);
            return false;
        }
    }, [machine, canSpin, spinning, auth.credits, bet, reelCount, lineCount, setCredits]);

    // le lancer suivant d'une série utilise toujours la dernière version de spin (crédits à jour)
    useEffect(() => {
        spinRef.current = spin;
    }, [spin]);

    // Lance la série choisie (ou un seul lancer)
    const start = useCallback(() => {
        if (!canSpin) return;
        setSeries(spinCount > 1 ? {total: spinCount, spins: 0, bet: 0, won: 0} : null);
        setAuto(spinCount - 1);
        void spin().then(ok => {
            if (!ok) setAuto(0);
        });
    }, [canSpin, spinCount, spin]);

    // Arrête la série : le lancer en cours finit, il n'y en a pas d'autre
    const stop = useCallback(() => {
        setAuto(0);
        if (autoTimer.current !== null) {
            window.clearTimeout(autoTimer.current);
            autoTimer.current = null;
        }
    }, []);

    // page quittée : plus de lancer prévu
    useEffect(() => () => {
        if (autoTimer.current !== null) window.clearTimeout(autoTimer.current);
    }, []);

    // mise à jour activée : la série s'arrête
    useEffect(() => {
        if (!updating) return;
        const timer = window.setTimeout(stop, 0);
        return () => window.clearTimeout(timer);
    }, [updating, stop]);

    function chooseCount(n: number) {
        if (LOCKED_COUNTS.has(n) || spinning || autoLeft > 0) return;
        setSpinCount(n);
        save(COUNT_KEY, n);
    }

    useEffect(() => {
        if (!showLines) return;
        const timer = window.setTimeout(() => setShowLines(false), SHOW_LINES_MS);
        return () => window.clearTimeout(timer);
    }, [showLines]);

    function chooseReels(n: number) {
        if (spinning || n === reelCount || !machine) return;
        setReelCount(n);
        save(REELS_KEY, n);
        setInitialStops(randomStops(n, machine.strip.length));
        setShown(null);
        setShowLines(true);
    }

    function chooseLines(n: number) {
        if (spinning) return;
        setLineCount(n);
        save(LINES_KEY, n);
        setShown(null);
        setShowLines(true);
    }

    // barre d'espace : lancer, ou arrêter la série en cours
    const running = autoLeft > 0;
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.code !== "Space" || (e.target as HTMLElement).closest("input, textarea, button, a")) return;
            e.preventDefault();
            if (running) stop();
            else start();
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [running, start, stop]);

    if (!auth.isLoggedIn) return <Navigate to="/login" replace/>;
    if (!machine) return <Navigate to="/hasard/machines" replace/>;

    const net = shown ? shown.payout - shown.bet : 0;
    const spinLabel = running ? <><FaStop aria-hidden/> Arrêter · {autoLeft} restant{autoLeft > 1 ? "s" : ""}</>
        : updating ? "Mise à jour imminente"
            : auth.credits < bet ? "Pas assez de crédits"
                : spinCount > 1 ? <>Lancer {spinCount} fois · <FaCoins aria-hidden/> {bet} chacun</>
                    : <>Lancer · <FaCoins aria-hidden/> {bet}</>;
    const spinButton = (extra = "") => (
        <button type="button" className={`slots-spin ${running ? "stop" : ""} ${extra}`} disabled={!running && !canSpin}
                onClick={running ? stop : start}>{spinLabel}</button>
    );
    const locked = spinning || running;

    return (
        <main className="slots">
            <div className="slots-layout">
                <section className="slots-controls">
                    <Link to="/hasard/machines" className="slots-back"><FaChevronLeft aria-hidden/> Machines à sous</Link>
                    <div className="casino-title">
                        <h1>{machine.name}</h1>
                        <RulesButton title={`Règles · ${machine.name}`}><SlotRules machine={machine} reels={reelCount} lines={lineCount}/></RulesButton>
                    </div>

                    <span className="slots-label">Mise</span>
                    <div className="slots-bets" role="radiogroup" aria-label="Mise">
                        {SLOT_BETS.map(b => (
                            <button key={b} type="button" role="radio" aria-checked={bet === b} aria-label={`Miser ${b}`}
                                    className={`slots-bet ${bet === b ? "active" : ""}`} disabled={auth.credits < b || locked}
                                    onClick={() => setBet(b)}>
                                <img src={chipImage(b)} alt="" draggable={false}/>
                            </button>
                        ))}
                    </div>

                    <span className="slots-label">Colonnes</span>
                    <div className="slots-choices" role="radiogroup" aria-label="Nombre de colonnes">
                        {SLOT_REEL_COUNTS.map(n => (
                            <button key={n} type="button" role="radio" aria-checked={reelCount === n} disabled={locked}
                                    className={`slots-choice ${reelCount === n ? "active" : ""}`} onClick={() => chooseReels(n)}>{n}</button>
                        ))}
                    </div>

                    <span className="slots-label">Lignes de gain</span>
                    <div className="slots-choices" role="radiogroup" aria-label="Nombre de lignes de gain">
                        {SLOT_LINE_COUNTS.map(n => (
                            <button key={n} type="button" role="radio" aria-checked={lineCount === n} disabled={locked}
                                    className={`slots-choice ${lineCount === n ? "active" : ""}`} onClick={() => chooseLines(n)}>{n}</button>
                        ))}
                    </div>

                    <span className="slots-label">Lancers</span>
                    <div className="slots-choices slots-counts" role="radiogroup" aria-label="Nombre de lancers">
                        {SPIN_COUNTS.map(n => LOCKED_COUNTS.has(n) ? (
                            <button key={n} type="button" className="slots-choice locked" disabled aria-label={`${n} lancers, bientôt dans la boutique`}
                                    title="Bientôt dans la boutique"><FaLock aria-hidden/> {n}</button>
                        ) : (
                            <button key={n} type="button" role="radio" aria-checked={spinCount === n} disabled={locked}
                                    className={`slots-choice ${spinCount === n ? "active" : ""}`} onClick={() => chooseCount(n)}>{n}</button>
                        ))}
                    </div>

                    {spinButton()}
                    {error && <p className="slots-error" role="alert">{error}</p>}
                </section>

                <section className={`slots-machine ${machine.id}`}>
                    <SlotReels key={reelCount} ref={reels} machine={machine} initialStops={initialStops} lines={lineCount}
                               showLines={showLines} linesVisible={!hideLines} spinning={spinning} wins={shown?.wins ?? []} onStopped={onStopped}/>
                    <p className={`slots-result ${shown && shown.payout > 0 ? "win" : ""}`} role="status">
                        {spinning ? "Les rouleaux tournent…"
                            : !shown ? "Choisis ta mise et lance les rouleaux"
                                : shown.payout > 0
                                    ? <>+{shown.payout} crédits{shown.wins.length > 1 ? ` · ${shown.wins.length} lignes` : ""}{net > 0 ? "" : net === 0 ? " (ta mise revient)" : " (moins que ta mise)"}</>
                                    : "Pas de ligne cette fois"}
                    </p>
                    {series && (
                        <p className={`slots-series ${series.won > series.bet ? "win" : ""}`}>
                            Série : {series.spins} / {series.total} lancers · misé {series.bet} · gagné {series.won}
                            {series.spins > 0 && <b> ({series.won - series.bet >= 0 ? "+" : ""}{series.won - series.bet})</b>}
                        </p>
                    )}
                    <label className="slots-lines-toggle">
                        <input type="checkbox" checked={!hideLines} onChange={e => setHideLines(!e.target.checked)}/>
                        Afficher les lignes de gain
                    </label>
                    {/* téléphone : les rouleaux passent avant les réglages, le bouton reste à portée de main */}
                    {spinButton("slots-spin-phone")}
                </section>

                {/* derniers lancers : à droite de la machine (dessous sur les écrans plus étroits) */}
                <section className="slots-side" aria-label="Derniers lancers">
                    <span className="slots-label">Derniers lancers</span>
                    {history.length === 0 ? <p className="slots-history-empty">Tes lancers s'afficheront ici.</p> : (
                        <ul className="slots-history">
                            {history.map(h => (
                                <li key={h.id} className={h.payout > h.bet ? "win" : h.payout > 0 ? "even" : "loss"}>
                                    <span>{h.payout > 0 ? `+${h.payout}` : "–"}</span>
                                    <small>mise {h.bet}</small>
                                </li>
                            ))}
                        </ul>
                    )}
                </section>
            </div>
        </main>
    );
}
