/**
 * Keno (/hasard/keno) : le joueur choisit de 1 à 10 numéros sur la grille de 40, mise, puis 10 numéros sortent un à
 * un. Gains : backend/src/utils/keno.ts. Le serveur fait le tirage ; le site le montre numéro par numéro, puis le
 * gain et le nouveau solde. Les numéros choisis restent pour rejouer.
 * Réglages à gauche, grille au milieu, gains et derniers tirages à droite (dessous sur les écrans plus étroits).
 */

import "./Keno.scss";
import {useEffect, useState} from "react";
import {Link, Navigate} from "react-router-dom";
import {FaChevronLeft, FaCoins, FaDice, FaEraser} from "react-icons/fa";
import {KENO_BETS, KENO_MAX_PICKS, KENO_NUMBERS, KENO_PAYTABLE} from "../../../../backend/src/utils/keno.ts";
import {useAuth} from "../../../Context/authContext.ts";
import {ApiError} from "../../../api/api.ts";
import {casinoService, type KenoResult} from "../../../Services/casino.service.ts";
import {useChipImage} from "../../../Services/chipSets.ts";
import {useMaintenance} from "../../../Services/maintenance.ts";
import {useActivity} from "../../../Services/useActivity.ts";
import RulesButton from "../RulesButton.tsx";
import {TOURS} from "../tours.ts";
import KenoRules from "./KenoRules.tsx";

// délai entre deux numéros tirés
const BALL_MS = 220;
const RECENT_SIZE = 8;
const QUICK_PICKS = 5;

const fr = (n: number) => n.toLocaleString("fr-FR");
const pays = (m: number) => `×${fr(m)}`;

type Recent = { id: number; picks: number; hits: number; bet: number; payout: number };

export default function KenoPage() {
    const auth = useAuth();
    const chipImage = useChipImage();
    const updating = useMaintenance().on;
    const [bet, setBet] = useState<number>(KENO_BETS[0]);
    const [picks, setPicks] = useState<number[]>([]);
    const [result, setResult] = useState<KenoResult | null>(null);
    // numéros déjà sortis du tirage en cours (le tirage s'affiche un numéro à la fois)
    const [shown, setShown] = useState(0);
    const [sending, setSending] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [recent, setRecent] = useState<Recent[]>([]);
    const [nextId, setNextId] = useState(1);
    const {setCredits} = auth;

    const drawing = !!result && shown < result.drawn.length;
    const done = !!result && !drawing;

    // Tirage : un numéro de plus à chaque fois, puis le gain et le solde
    useEffect(() => {
        if (!result || shown > result.drawn.length) return;
        const timer = window.setTimeout(() => {
            if (shown < result.drawn.length) return setShown(s => s + 1);
            setShown(s => s + 1);
            setCredits(result.credits);
            setRecent(r => [{id: nextId, picks: picks.length, hits: result.hits, bet, payout: result.payout}, ...r].slice(0, RECENT_SIZE));
            setNextId(n => n + 1);
        }, BALL_MS);
        return () => window.clearTimeout(timer);
        // seuls le tirage et l'avancée comptent
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [result, shown]);

    useActivity({page: "keno", busy: sending || drawing});

    const busy = sending || drawing;
    const canPlay = !busy && !updating && picks.length > 0 && auth.credits >= bet;

    // Choisir un numéro efface l'affichage du tirage précédent (les numéros choisis restent)
    const clearDraw = () => {
        if (done) {
            setResult(null);
            setShown(0);
        }
    };

    const toggle = (n: number) => {
        if (busy) return;
        clearDraw();
        setPicks(p => p.includes(n) ? p.filter(x => x !== n) : p.length >= KENO_MAX_PICKS ? p : [...p, n]);
    };

    const quickPick = () => {
        if (busy) return;
        clearDraw();
        const count = picks.length || QUICK_PICKS;
        const pool = Array.from({length: KENO_NUMBERS}, (_, i) => i + 1);
        for (let i = pool.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [pool[i], pool[j]] = [pool[j]!, pool[i]!];
        }
        setPicks(pool.slice(0, count).sort((a, b) => a - b));
    };

    async function play() {
        if (!canPlay) return;
        setSending(true);
        setError(null);
        setResult(null);
        setShown(0);
        try {
            const r = await casinoService.keno(bet, picks);
            // la mise part tout de suite ; le gain arrive à la fin du tirage
            setCredits(r.credits - r.payout);
            setResult(r);
        } catch (err) {
            setError(err instanceof ApiError ? err.message : "Le tirage n'a pas pu avoir lieu, réessaie.");
        } finally {
            setSending(false);
        }
    }

    if (!auth.isLoggedIn) return <Navigate to="/login" replace/>;

    const out = result ? result.drawn.slice(0, shown) : [];
    const hitsSoFar = out.filter(n => picks.includes(n)).length;
    const table = Object.entries(KENO_PAYTABLE[picks.length] ?? {}).map(([h, m]) => ({hits: Number(h), m})).reverse();
    const net = done && result ? result.payout - bet : 0;

    return (
        <main className="keno">
            <div className="keno-layout">
                <section className="keno-controls">
                    <Link to="/hasard" className="keno-back"><FaChevronLeft aria-hidden/> Hasard</Link>
                    <div className="casino-title">
                        <h1>Keno</h1>
                        <RulesButton tour={TOURS.KENO} title="Règles du Keno"><KenoRules/></RulesButton>
                    </div>

                    <span className="keno-label">Mise</span>
                    <div className="keno-bets" role="radiogroup" aria-label="Mise">
                        {KENO_BETS.map(b => (
                            <button key={b} type="button" role="radio" aria-checked={bet === b} aria-label={`Miser ${b}`}
                                    className={`keno-bet ${bet === b ? "active" : ""}`} disabled={auth.credits < b || busy}
                                    onClick={() => setBet(b)}>
                                <img src={chipImage(b)} alt="" draggable={false}/>
                            </button>
                        ))}
                    </div>

                    <span className="keno-label">Numéros : <strong>{picks.length}</strong> / {KENO_MAX_PICKS}</span>
                    <div className="keno-tools">
                        <button type="button" disabled={busy} onClick={quickPick}><FaDice aria-hidden/> Au hasard</button>
                        <button type="button" disabled={busy || picks.length === 0} onClick={() => {
                            clearDraw();
                            setPicks([]);
                        }}><FaEraser aria-hidden/> Effacer</button>
                    </div>

                    <button type="button" className="keno-play" disabled={!canPlay} onClick={() => void play()}>
                        {updating ? "Mise à jour imminente"
                            : busy ? "Tirage…"
                                : picks.length === 0 ? "Choisis tes numéros"
                                    : auth.credits < bet ? "Pas assez de crédits"
                                        : <>{done ? "Rejouer" : "Jouer"} · <FaCoins aria-hidden/> {bet}</>}
                    </button>
                    {error && <p className="keno-error" role="alert">{error}</p>}
                </section>

                <section className="keno-board" aria-label="Grille du Keno">
                    <p className={`keno-status ${done ? (net > 0 ? "win" : net === 0 ? "push" : "lose") : ""}`} aria-live="polite">
                        {!result ? (picks.length === 0 ? "Choisis de 1 à 10 numéros" : `${picks.length} numéro${picks.length > 1 ? "s" : ""} choisi${picks.length > 1 ? "s" : ""}`)
                            : drawing ? `${hitsSoFar} trouvé${hitsSoFar > 1 ? "s" : ""}…`
                                : result.payout > 0 ? `${result.hits} trouvé${result.hits > 1 ? "s" : ""} : ${pays(result.multiplier)}, +${fr(result.payout)}`
                                    : `${result.hits} trouvé${result.hits > 1 ? "s" : ""} : perdu`}
                    </p>
                    <div className="keno-grid" role="group" aria-label="Numéros de 1 à 40">
                        {Array.from({length: KENO_NUMBERS}, (_, i) => i + 1).map(n => {
                            const picked = picks.includes(n);
                            const isOut = out.includes(n);
                            const state = picked && isOut ? "hit" : isOut ? "out" : picked ? "picked" : "";
                            return (
                                <button key={n} type="button" className={`keno-cell ${state}`} aria-pressed={picked}
                                        disabled={busy || (!picked && picks.length >= KENO_MAX_PICKS)} onClick={() => toggle(n)}>
                                    {n}
                                </button>
                            );
                        })}
                    </div>
                    <div className="keno-drawn" aria-label="Numéros tirés">
                        {Array.from({length: 10}, (_, i) => {
                            const n = out[i];
                            return <span key={i} className={`keno-ball ${n === undefined ? "empty" : picks.includes(n) ? "hit" : ""}`}>{n ?? ""}</span>;
                        })}
                    </div>
                </section>

                <section className="keno-side">
                    <span className="keno-label">Gains {picks.length > 0 && <small>({picks.length} numéro{picks.length > 1 ? "s" : ""})</small>}</span>
                    {table.length === 0 ? <p className="keno-empty">Choisis des numéros pour voir les gains.</p> : (
                        <table className="keno-pays">
                            <tbody>
                                {table.map(row => (
                                    <tr key={row.hits} className={done && result?.hits === row.hits ? "won" : ""}>
                                        <td>{row.hits} trouvé{row.hits > 1 ? "s" : ""}</td>
                                        <td>{pays(row.m)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}

                    <span className="keno-label keno-recent-title">Derniers tirages</span>
                    {recent.length === 0 ? <p className="keno-empty">Tes tirages s'afficheront ici.</p> : (
                        <ul className="keno-recent">
                            {recent.map(r => {
                                const gain = r.payout - r.bet;
                                return (
                                    <li key={r.id} className={gain > 0 ? "win" : gain === 0 ? "even" : "loss"}>
                                        <span>{gain > 0 ? "+" : ""}{fr(gain)}</span>
                                        <small>{r.hits}/{r.picks} · mise {r.bet}</small>
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
