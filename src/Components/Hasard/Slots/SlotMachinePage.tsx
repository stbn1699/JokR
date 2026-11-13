/**
 * Une machine à sous (/hasard/machines/:id) : choix de la mise (jetons), du nombre de colonnes (3 à 5) et de lignes
 * de gain (1, 3, 5 ou 10 : moins de lignes, chaque ligne vaut plus), lancer (bouton ou barre d'espace), les rouleaux
 * qui s'arrêtent l'un après l'autre, les lignes gagnantes et le gain, les derniers lancers.
 * Colonnes et lignes sont retenues dans le navigateur ; les lignes jouées sont tracées sur les rouleaux.
 *
 * Le serveur tire les arrêts, encaisse la mise et paie tout de suite ; le site anime les rouleaux jusqu'à ces
 * arrêts. Les crédits du header baissent de la mise au lancer et montent du gain à l'arrêt des rouleaux.
 * Pendant une mise à jour : plus de lancer, l'écran de mise à jour arrive une fois les rouleaux arrêtés.
 */

import "./Slots.scss";
import {useCallback, useEffect, useRef, useState} from "react";
import {Link, Navigate, useParams} from "react-router-dom";
import {FaChevronLeft, FaCoins} from "react-icons/fa";
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

// 2 crédits, 3,3 crédits…
const fmtCredits = (n: number) => n.toLocaleString("fr-FR", {maximumFractionDigits: 1});
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

    useActivity({page: "slots", busy: spinning});

    const onStopped = useCallback(() => {
        const result = current.current;
        current.current = null;
        setSpinning(false);
        if (!result) return;
        setCredits(result.credits);
        setShown({wins: result.wins, payout: result.payout, bet: lastBet.current});
        setHistory(h => [{id: nextId.current++, bet: lastBet.current, payout: result.payout}, ...h].slice(0, HISTORY_SIZE));
    }, [setCredits]);

    const canSpin = !spinning && !updating && auth.credits >= bet;

    const spin = useCallback(async () => {
        if (!machine || !canSpin) return;
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
        } catch (err) {
            setError(err instanceof ApiError ? err.message : "Les rouleaux n'ont pas pu partir, réessaie.");
            setSpinning(false);
        }
    }, [machine, canSpin, bet, reelCount, lineCount, setCredits]);

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

    // barre d'espace : lancer
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.code !== "Space" || (e.target as HTMLElement).closest("input, textarea, button, a")) return;
            e.preventDefault();
            void spin();
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [spin]);

    if (!auth.isLoggedIn) return <Navigate to="/login" replace/>;
    if (!machine) return <Navigate to="/hasard/machines" replace/>;

    const net = shown ? shown.payout - shown.bet : 0;
    const spinLabel = updating ? "Mise à jour imminente"
        : auth.credits < bet ? "Pas assez de crédits"
            : <>Lancer · <FaCoins aria-hidden/> {bet}</>;

    return (
        <main className="slots">
            <div className="slots-layout">
                <section className="slots-controls">
                    <Link to="/hasard/machines" className="slots-back"><FaChevronLeft aria-hidden/> Machines à sous</Link>
                    <div className="casino-title">
                        <h1>{machine.name}</h1>
                        <RulesButton title={`Règles · ${machine.name}`}><SlotRules machine={machine} reels={reelCount} lines={lineCount}/></RulesButton>
                    </div>
                    <p className="slots-sub">{machine.tagline}</p>

                    <span className="slots-label">Mise</span>
                    <div className="slots-bets" role="radiogroup" aria-label="Mise">
                        {SLOT_BETS.map(b => (
                            <button key={b} type="button" role="radio" aria-checked={bet === b} aria-label={`Miser ${b}`}
                                    className={`slots-bet ${bet === b ? "active" : ""}`} disabled={auth.credits < b || spinning}
                                    onClick={() => setBet(b)}>
                                <img src={chipImage(b)} alt="" draggable={false}/>
                            </button>
                        ))}
                    </div>

                    <span className="slots-label">Colonnes</span>
                    <div className="slots-choices" role="radiogroup" aria-label="Nombre de colonnes">
                        {SLOT_REEL_COUNTS.map(n => (
                            <button key={n} type="button" role="radio" aria-checked={reelCount === n} disabled={spinning}
                                    className={`slots-choice ${reelCount === n ? "active" : ""}`} onClick={() => chooseReels(n)}>{n}</button>
                        ))}
                    </div>

                    <span className="slots-label">Lignes de gain</span>
                    <div className="slots-choices" role="radiogroup" aria-label="Nombre de lignes de gain">
                        {SLOT_LINE_COUNTS.map(n => (
                            <button key={n} type="button" role="radio" aria-checked={lineCount === n} disabled={spinning}
                                    className={`slots-choice ${lineCount === n ? "active" : ""}`} onClick={() => chooseLines(n)}>{n}</button>
                        ))}
                    </div>
                    <p className="slots-hint">
                        {fmtCredits(bet / lineCount)} crédit{bet / lineCount >= 2 ? "s" : ""} par ligne ·{" "}
                        {lineCount === 1 ? "une seule ligne : gains rares mais gros" : lineCount === 10 ? "10 lignes : souvent un petit gain" : "moins de lignes, plus gros gains"}
                    </p>

                    <button type="button" className="slots-spin" disabled={!canSpin} onClick={() => void spin()}>{spinLabel}</button>
                    {error && <p className="slots-error" role="alert">{error}</p>}

                    {history.length > 0 && (
                        <ul className="slots-history" aria-label="Derniers lancers">
                            {history.map(h => (
                                <li key={h.id} className={h.payout > h.bet ? "win" : h.payout > 0 ? "even" : "loss"}>
                                    <span>{h.payout > 0 ? `+${h.payout}` : "–"}</span>
                                    <small>mise {h.bet}</small>
                                </li>
                            ))}
                        </ul>
                    )}
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
                    <label className="slots-lines-toggle">
                        <input type="checkbox" checked={!hideLines} onChange={e => setHideLines(!e.target.checked)}/>
                        Afficher les lignes de gain
                    </label>
                    {/* téléphone : les rouleaux passent avant les réglages, le bouton reste à portée de main */}
                    <button type="button" className="slots-spin slots-spin-phone" disabled={!canSpin} onClick={() => void spin()}>{spinLabel}</button>
                </section>
            </div>
        </main>
    );
}
