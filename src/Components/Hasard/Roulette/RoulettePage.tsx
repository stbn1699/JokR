/**
 * Roulette en direct (/hasard/roulette) : une seule table pour tout le monde, un tour toutes les 30 secondes.
 * - 20 s pour poser ses jetons (chaque jeton est misé tout de suite et apparaît dans « Mises du tour »),
 * - puis le serveur tire le numéro : la roue tourne au même moment chez tout le monde (horloge du serveur),
 * - la bille se pose, les gains s'affichent et les crédits du header montent, jusqu'au tour suivant.
 * La page interroge le serveur chaque seconde (GET /casino/roulette/live). La roue tourne même sans joueurs.
 */

import "./Roulette.scss";
import {useEffect, useRef, useState} from "react";
import {Link, Navigate} from "react-router-dom";
import {FaChevronLeft, FaCoins, FaRedo, FaTrash} from "react-icons/fa";
import {useAuth} from "../../../Context/authContext.ts";
import {ApiError} from "../../../api/api.ts";
import {casinoService, type RouletteLive} from "../../../Services/casino.service.ts";
import {useChipImage} from "../../../Services/chipSets.ts";
import {
    ROULETTE_BETTING_MS,
    ROULETTE_CHIPS,
    ROULETTE_MAX_PER_BET,
    ROULETTE_MAX_TOTAL,
    type RouletteBet,
    rouletteColor,
    rouletteWinningKeys,
} from "../../../../backend/src/utils/roulette.ts";
import RouletteWheel, {type RouletteWheelHandle} from "./RouletteWheel.tsx";
import RouletteTable from "./RouletteTable.tsx";
import RouletteRules from "./RouletteRules.tsx";
import RulesButton from "../RulesButton.tsx";
import LiveBets from "./LiveBets.tsx";

const POLL_MS = 1000;

// Dernière mise du joueur, gardée dans le navigateur (« Reproduire ma mise » marche aussi après un rechargement)
const lastBetsKey = (userId: string | null) => `jokr:roulette:last:${userId ?? "invite"}`;

function readLastBets(userId: string | null): RouletteBet[] {
    try {
        const raw = localStorage.getItem(lastBetsKey(userId));
        const bets: unknown = raw ? JSON.parse(raw) : [];
        return Array.isArray(bets) ? bets.filter(b => typeof b?.key === "string" && typeof b?.amount === "number") : [];
    } catch {
        return [];
    }
}

function saveLastBets(userId: string | null, bets: RouletteBet[]) {
    try {
        localStorage.setItem(lastBetsKey(userId), JSON.stringify(bets));
    } catch {
        // stockage indisponible : la mise sera seulement gardée pendant la visite
    }
}
const COLOR_NAMES = {red: "rouge", black: "noir", green: "vert"} as const;

export default function RoulettePage() {
    const auth = useAuth();
    const {setCredits} = auth;
    const chipImage = useChipImage();
    const wheel = useRef<RouletteWheelHandle>(null);
    const wheelBox = useRef<HTMLDivElement>(null);
    const [live, setLive] = useState<RouletteLive | null>(null);
    // écart entre l'horloge du serveur et celle du navigateur
    const [offset, setOffset] = useState(0);
    const [now, setNow] = useState(() => Date.now());
    const [chip, setChip] = useState<number>(ROULETTE_CHIPS[0]);
    const [sending, setSending] = useState(false);
    const [error, setError] = useState<string | null>(null);
    // tour dont la bille est posée (résultat visible, gains affichés)
    const [landed, setLanded] = useState<number | null>(null);
    // mes jetons du dernier tour joué (pour « Reproduire ma mise »)
    const [lastBets, setLastBets] = useState<RouletteBet[]>(() => readLastBets(auth.userId));
    const spunRound = useRef<number | null>(null);
    const myRoundBets = useRef<{ round: number; bets: RouletteBet[] } | null>(null);
    const refresh = useRef<() => Promise<void>>(async () => undefined);
    const queue = useRef<Promise<void>>(Promise.resolve());
    const pending = useRef(0);

    // ---------- état de la table, chaque seconde ; horloge locale pour le compte à rebours
    useEffect(() => {
        if (!auth.isLoggedIn) return;
        const controller = new AbortController();
        const load = async () => {
            const sent = Date.now();
            try {
                const data = await casinoService.rouletteLive(controller.signal);
                const received = Date.now();
                setOffset(data.now - (sent + received) / 2);
                setLive(data);
            } catch {
                // réseau coupé : on réessaie à la seconde suivante
            }
        };
        refresh.current = load;
        void load();
        const poll = window.setInterval(() => void load(), POLL_MS);
        const clock = window.setInterval(() => setNow(Date.now()), 250);
        return () => {
            controller.abort();
            window.clearInterval(poll);
            window.clearInterval(clock);
        };
    }, [auth.isLoggedIn]);

    const me = live?.players.find(p => p.mine);
    const myPayout = me?.payout ?? 0;

    // ---------- numéro tiré : la roue tourne (calée sur l'heure du serveur), une seule fois par tour
    useEffect(() => {
        if (!live || live.number === null || spunRound.current === live.round) return;
        spunRound.current = live.round;
        const round = live.round;
        const elapsed = Date.now() + offset - live.closesAt;
        wheel.current?.spin(live.number, () => setLanded(round), Math.max(0, elapsed));
        // téléphone : si j'ai misé et que la roue est hors de l'écran, on remonte la voir tourner
        const box = wheelBox.current?.getBoundingClientRect();
        if (live.players.some(p => p.mine) && box && (box.bottom < 80 || box.top > window.innerHeight)) {
            wheelBox.current?.scrollIntoView({behavior: "smooth", block: "center"});
        }
    }, [live, offset]);

    // ---------- crédits du header : le gain n'est ajouté qu'une fois la bille posée
    const revealed = live !== null && live.number !== null && landed === live.round;
    useEffect(() => {
        if (!live) return;
        setCredits(live.number !== null && !revealed ? live.credits - myPayout : live.credits);
    }, [live, revealed, myPayout, setCredits]);

    // ---------- mes jetons du tour qui se termine, gardés pour « Reproduire ma mise »
    useEffect(() => {
        if (!live) return;
        const previous = myRoundBets.current;
        if (previous && previous.round !== live.round && previous.bets.length > 0) {
            setLastBets(previous.bets);
            saveLastBets(auth.userId, previous.bets);
        }
        // un jeton par ligne : la mise reproduite repose exactement les mêmes jetons
        myRoundBets.current = {round: live.round, bets: (me?.bets ?? []).flatMap(b => (b.chips ?? [b.amount]).map(amount => ({key: b.key, amount})))};
    }, [live, me, auth.userId]);

    if (!auth.isLoggedIn) return <Navigate to="/login" replace/>;

    const serverNow = now + offset;
    const open = live !== null && live.number === null && serverNow < live.closesAt;
    const secondsLeft = live ? Math.max(0, Math.ceil((live.closesAt - serverNow) / 1000)) : 0;
    const bets = new Map((me?.bets ?? []).map(b => [b.key, b.chips ?? [b.amount]]));
    const betTotal = (key: string) => bets.get(key)?.reduce((sum, c) => sum + c, 0) ?? 0;
    const total = me?.total ?? 0;
    const drawn = revealed && live !== null ? live.number : null;
    const winning = drawn !== null ? new Set(rouletteWinningKeys(me?.bets ?? [], drawn)) : new Set<string>();
    // historique : le numéro du tour en cours n'y entre qu'une fois la bille posée
    const history = (live?.history ?? []).filter(h => h.round !== live?.round || revealed);
    const lastTotal = lastBets.reduce((sum, b) => sum + b.amount, 0);

    // Envois à la file : des clics rapides (dix jetons de 10 d'affilée) partent tous, dans l'ordre
    function send(action: () => Promise<number>) {
        setSending(true);
        setError(null);
        pending.current += 1;
        queue.current = queue.current.then(async () => {
            try {
                setCredits(await action());
                await refresh.current();
            } catch (err) {
                setError(err instanceof ApiError ? err.message : "Le jeton n'a pas pu être posé, réessaie.");
            } finally {
                pending.current -= 1;
                if (pending.current === 0) setSending(false);
            }
        });
    }

    function place(key: string) {
        if (!open) return;
        if (chip > auth.credits) return setError("Pas assez de crédits pour ce jeton");
        if (total + chip > ROULETTE_MAX_TOTAL) return setError(`${ROULETTE_MAX_TOTAL} crédits au plus par tour`);
        if (betTotal(key) + chip > ROULETTE_MAX_PER_BET) return setError(`${ROULETTE_MAX_PER_BET} crédits au plus par case`);
        send(() => casinoService.rouletteBet([{key, amount: chip}]));
    }

    return (
        <main className="roulette">
            <div className="roulette-page">
                <div className="roulette-top">
                    <Link to="/hasard" className="roulette-back"><FaChevronLeft aria-hidden/> Hasard</Link>
                    <ol className="roulette-history" aria-label="Derniers numéros">
                        {history.map((h, i) => (
                            <li key={h.round} className={`${rouletteColor(h.number)} ${i === 0 ? "latest" : ""}`}>{h.number}</li>
                        ))}
                    </ol>
                </div>

                <div className="roulette-layout">
                    <div className="roulette-side">
                        <section className="roulette-wheel-card">
                            <div className="roulette-wheel-wrap" ref={wheelBox}>
                                <RouletteWheel ref={wheel}/>
                                {drawn !== null && (
                                    <div className={`roulette-result ${rouletteColor(drawn)}`} role="status">
                                        <strong>{drawn}</strong>
                                        {me && <span className={myPayout > 0 ? "win" : ""}>{myPayout > 0 ? `+${myPayout}` : "Perdu"}</span>}
                                    </div>
                                )}
                            </div>
                        </section>
                        <LiveBets players={live?.players ?? []} revealed={revealed} drawn={drawn}/>
                    </div>

                    <section className="roulette-play">
                        <div className="casino-title">
                            <h1>Roulette</h1>
                            <RulesButton title="Règles de la roulette"><RouletteRules/></RulesButton>
                        </div>

                        {/* où en est le tour : mises ouvertes (compte à rebours), roue lancée, résultat */}
                        <div className={`roulette-phase ${open ? "open" : "closed"}`} role="status">
                            {!live ? <span>Connexion à la table…</span>
                                : open ? <>
                                    <span>Faites vos jeux · <b>{secondsLeft} s</b></span>
                                    <span className="roulette-phase-bar">
                                        <span style={{width: `${Math.min(100, (live.closesAt - serverNow) / ROULETTE_BETTING_MS * 100)}%`}}/>
                                    </span>
                                </>
                                : drawn !== null
                                    ? <span>Le <b>{drawn} {COLOR_NAMES[rouletteColor(drawn)]}</b> est sorti · prochain tour dans {Math.max(0, Math.ceil((live.endsAt - serverNow) / 1000))} s</span>
                                    : <span>Rien ne va plus, la bille tourne…</span>}
                        </div>

                        <div className="roulette-chips" role="radiogroup" aria-label="Jeton">
                            {/* jeton grisé : plus cher que ce qu'il reste */}
                            {ROULETTE_CHIPS.map(c => (
                                <button key={c} type="button" role="radio" aria-checked={chip === c} aria-label={`Jeton de ${c}`}
                                        className={`roulette-chip ${chip === c ? "active" : ""}`}
                                        disabled={c > auth.credits} onClick={() => setChip(c)}>
                                    <img src={chipImage(c)} alt="" draggable={false}/>
                                </button>
                            ))}
                        </div>

                        <RouletteTable bets={bets} winning={winning} result={drawn} disabled={!open} onBet={place}/>

                        <div className="roulette-actions">
                            <span className="roulette-mine">Ta mise : <b><FaCoins aria-hidden/> {total}</b></span>
                            <button type="button" className="roulette-secondary" disabled={!open || sending || total === 0}
                                    onClick={() => send(() => casinoService.rouletteCancel())} title="Rend tous tes jetons de ce tour">
                                <FaTrash aria-hidden/> Retirer mes jetons
                            </button>
                            {/* repose les jetons du dernier tour joué (en plus de ceux déjà posés sur ce tour) */}
                            <button type="button" className="roulette-secondary roulette-rebet"
                                    disabled={!open || sending || lastBets.length === 0 || lastTotal > auth.credits || total + lastTotal > ROULETTE_MAX_TOTAL}
                                    onClick={() => send(() => casinoService.rouletteBet(lastBets))}
                                    title={lastBets.length === 0 ? "Joue un tour pour pouvoir reproduire ta mise"
                                        : lastTotal > auth.credits ? "Pas assez de crédits pour reproduire ta mise"
                                            : "Repose les mêmes jetons qu'à ton dernier tour"}>
                                <FaRedo aria-hidden/> Reproduire ma mise{lastBets.length > 0 && <> · <FaCoins aria-hidden/> {lastTotal}</>}
                            </button>
                        </div>
                        {error && <p className="roulette-error" role="alert">{error}</p>}
                    </section>
                </div>
            </div>
        </main>
    );
}
