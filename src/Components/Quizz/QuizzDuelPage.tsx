import "./Quizz.scss";
import {type CSSProperties, type ReactNode, useCallback, useEffect, useMemo, useState} from "react";
import {Link, useNavigate, useParams} from "react-router-dom";
import {FaArrowLeft, FaBolt, FaHourglassHalf} from "react-icons/fa";
import {useAuth} from "../../Context/authContext.ts";
import {ApiError} from "../../api/api.ts";
import {type DuelSide, type QuizzDuel, quizzService} from "../../Services/quizz.service.ts";
import Avatar from "../Avatar/Avatar.tsx";
import Loader from "../Loader/Loader.tsx";
import NotFound from "../NotFound/NotFound.tsx";
import type {PlayableTopic} from "./topics/index.ts";
import {quizzPath, usePlayableTopic} from "./quizzMixes.ts";
import {knownQuestions, MAX_SCORE, pointsFor, ROUNDS} from "./quizzMatch.ts";
import QuizzGame, {type Rival} from "./QuizzGame.tsx";
import QuizzContest from "./QuizzContest.tsx";

/**
 * Un duel du Quizz (/quizz/duel/<id>, lien des notifications), selon où il en est :
 * - en direct, pas commencé : salon. Celui qui a lancé le duel y attend son ami·e (il peut jouer sans attendre :
 *   le duel devient chacun son tour, ou renoncer) ; l'ami·e le rejoint et la partie démarre pour les deux ;
 * - en direct, commencé : la partie, les réponses de l'autre arrivant au fil de l'eau ;
 * - chacun son tour, à nous de jouer : la partie (face aux réponses rejouées du premier joueur s'il a joué) ;
 * - en attente de l'adversaire, ou terminé : le score et le détail des réponses.
 * Questions d'un duel reçu : vérifiées contre celles du thème (knownQuestions) avant d'être affichées.
 */

const LOBBY_POLL_MS = 1000;

const otherSide = (d: QuizzDuel): DuelSide | null => (d.role === "challenger" ? d.opponent : d.challenger);
const mySide = (d: QuizzDuel): DuelSide => (d.role === "challenger" ? d.challenger : d.opponent!);

function Screen({topic, children}: { topic: PlayableTopic; children: ReactNode }) {
    return (
        <main className="quizz-match scrolls" style={{"--topic": topic.color} as CSSProperties}>
            <div className="quizz-end">{children}</div>
        </main>
    );
}

function Face({side, fallback, score}: { side: { username: string; avatar: string } | null; fallback: string; score?: number | string }) {
    return (
        <div className="quizz-player">
            <Avatar seed={side?.avatar} fallback={side?.username ?? fallback} size={3.2}/>
            <span className="quizz-player-name">{side?.username ?? fallback}</span>
            {score !== undefined && <span className="quizz-player-score">{score}</span>}
        </div>
    );
}

function DuelView({duel, topic, reload}: { duel: QuizzDuel; topic: PlayableTopic; reload: () => void }) {
    const navigate = useNavigate();
    const auth = useAuth();
    const [error, setError] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);
    const me = mySide(duel);
    const other = otherSide(duel);
    const meFace = {username: me.username, avatar: auth.avatar ?? me.avatar};
    // décalage d'horloge : début de la partie en direct dans N ms, à partir de maintenant
    const [rival] = useState<Rival | null>(() => {
        if (!other) return null;
        if (duel.live && duel.startedAt) {
            return {kind: "live", name: other.username, avatar: other.avatar, duelId: duel.id, side: duel.role,
                startInMs: Date.parse(duel.startedAt) - Date.parse(duel.serverNow)};
        }
        if (!duel.live && other.answers?.length === ROUNDS) return {kind: "replay", name: other.username, avatar: other.avatar, answers: other.answers};
        return {kind: "first", name: other.username, avatar: other.avatar};
    });

    // Salon : relu chaque seconde (et la présence de celui qui attend signalée au serveur)
    const inLobby = duel.live && !duel.startedAt && !duel.finished;
    useEffect(() => {
        if (!inLobby) return;
        const timer = window.setInterval(reload, LOBBY_POLL_MS);
        return () => window.clearInterval(timer);
    }, [inLobby, reload]);

    // Partie en direct quittée en cours : relue jusqu'à sa fin (le serveur la termine passé sa durée maximale)
    const livePending = duel.live && !!duel.startedAt && !duel.finished && (me.answers?.length ?? 0) > 0;
    useEffect(() => {
        if (!livePending) return;
        const timer = window.setInterval(reload, 3000);
        return () => window.clearInterval(timer);
    }, [livePending, reload]);

    const act = async (action: () => Promise<void>, then?: () => void) => {
        setBusy(true);
        setError(null);
        try {
            await action();
            then?.();
        } catch (err) {
            setError((err as Error).message);
        } finally {
            setBusy(false);
        }
    };

    if (!knownQuestions(duel.questions, topic.questions)) {
        return <Screen topic={topic}><h1>Duel indisponible</h1>
            <p className="quizz-end-status">Les questions de ce duel ont changé depuis son lancement.</p>
            <Link to={quizzPath(topic)} className="quizz-button"><FaArrowLeft aria-hidden/> {topic.name}</Link></Screen>;
    }

    if (inLobby) {
        const host = duel.role === "challenger";
        return (
            <Screen topic={topic}>
                <span className="quizz-intro-topic">{topic.name} · Duel en direct</span>
                <h1><FaBolt aria-hidden/> Salon</h1>
                <div className="quizz-intro-vs">
                    <Face side={meFace} fallback="Toi"/>
                    <span className="quizz-vs">VS</span>
                    <Face side={other} fallback="?"/>
                </div>
                {host ? <>
                    <p className="quizz-end-status quizz-waiting" role="status"><FaHourglassHalf aria-hidden/> En attente de {other?.username}… Reste sur
                        cette page : la partie démarre dès qu'il ou elle arrive.</p>
                    <div className="quizz-end-actions">
                        <button type="button" className="quizz-button primary" disabled={busy}
                                onClick={() => void act(() => quizzService.duelToTurns(duel.id), reload)}>Jouer sans attendre</button>
                        <button type="button" className="quizz-button" disabled={busy}
                                onClick={() => void act(() => quizzService.cancelDuel(duel.id), () => navigate(quizzPath(topic)))}>Annuler le duel</button>
                    </div>
                    <p className="quizz-lobby-hint">Jouer sans attendre : {other?.username} jouera les mêmes questions plus tard, face à tes réponses.</p>
                </> : duel.lobbyOpen ? <>
                    <p className="quizz-end-status" role="status">{other?.username} t'attend dans le salon.</p>
                    <div className="quizz-end-actions">
                        <button type="button" className="quizz-button primary" disabled={busy}
                                onClick={() => void act(() => quizzService.joinDuel(duel.id), reload)}>Rejoindre le duel</button>
                    </div>
                </> : (
                    <p className="quizz-end-status" role="status">{other?.username} n'est plus dans le salon. Le duel démarrera s'il ou elle revient,
                        ou tu pourras le jouer quand il ou elle aura joué sa partie.</p>
                )}
                {error && <p className="defy-error" role="alert">{error}</p>}
            </Screen>
        );
    }

    // À nous de jouer (en direct commencé, ou chacun son tour)
    const myTurn = !duel.finished && (me.answers?.length ?? 0) === 0 && (duel.live
        || duel.role === "challenger" || other?.answers?.length === ROUNDS);
    if (myTurn && rival) {
        return (
            <QuizzGame topic={topic} match={duel.questions} rival={rival}
                       stats={{mode: duel.live ? "live" : duel.random ? "random" : "friend", duelId: duel.id}}
                       onDone={rival.kind === "live" ? undefined : async answers => {
                           await quizzService.submitDuel(duel.id, answers);
                           return rival.kind === "first" ? `${rival.name} est prévenu·e : tu sauras qui a gagné dès qu'il ou elle aura joué.`
                               : "Résultat enregistré.";
                       }}/>
        );
    }

    // En attente de l'adversaire, partie en direct déjà commencée (page rechargée), ou terminé
    const playingLive = duel.live && !duel.finished;
    const myScore = me.score ?? 0;
    const theirScore = other?.score ?? 0;
    const title = playingLive ? "Partie en cours" : !duel.finished ? (duel.role === "opponent" ? `${other?.username} n'a pas encore joué` : "En attente de ton adversaire")
        : myScore > theirScore ? "Victoire !" : myScore < theirScore ? "Défaite" : "Égalité";
    const tone = duel.finished ? (myScore > theirScore ? "win" : myScore < theirScore ? "lose" : "") : "";
    return (
        <Screen topic={topic}>
            <span className="quizz-intro-topic">{topic.name} · {duel.live ? "Duel en direct" : "Duel"}</span>
            <h1 className={tone}>{title}</h1>
            <div className="quizz-intro-vs">
                <Face side={meFace} fallback="Toi" score={me.score ?? "–"}/>
                <span className="quizz-vs">{duel.finished ? `${myScore} – ${theirScore}` : "VS"}</span>
                <Face side={other} fallback="Adversaire mystère" score={duel.finished ? theirScore : "?"}/>
            </div>
            {!duel.finished && !playingLive && <p className="quizz-end-status">
                {duel.role === "challenger"
                    ? `Ta partie est enregistrée (${myScore} / ${MAX_SCORE}). Tu seras prévenu·e dès que ${other?.username ?? "ton adversaire"} aura joué.`
                    : `Tu pourras jouer dès que ${other?.username} aura fait sa partie.`}</p>}
            {me.answers && me.answers.length === ROUNDS && <ol className="quizz-recap">
                {duel.questions.map((q, i) => {
                    const mine = me.answers![i]!;
                    const theirs = other?.answers?.[i];
                    return (
                        <li key={i} className={mine.index === q.correct ? "ok" : "ko"}>
                            <span>{q.question}<b>{q.answers[q.correct]}</b></span>
                            <span className="quizz-recap-points">{pointsFor(mine, q, i)}{theirs ? ` – ${pointsFor(theirs, q, i)}` : ""} pts</span>
                            <QuizzContest topicId={q.topic ?? topic.id} question={q} picked={mine.index}/>
                        </li>
                    );
                })}
            </ol>}
            <div className="quizz-end-actions">
                <Link to={quizzPath(topic, "duel")} className="quizz-button primary">Nouveau duel</Link>
                <Link to={quizzPath(topic)} className="quizz-button"><FaArrowLeft aria-hidden/> {topic.name}</Link>
            </div>
        </Screen>
    );
}

export default function QuizzDuelPage() {
    const {duelId} = useParams();
    const {userId} = useAuth();
    const [duel, setDuel] = useState<QuizzDuel | null | "missing">(null);
    const loaded = duel && duel !== "missing" ? duel : null;
    // partie custom : ses thèmes sont ceux des questions du duel
    const themes = useMemo(() => [...new Set(loaded?.questions.map(q => q.topic ?? "") ?? [])].filter(Boolean),
        [loaded?.id]); // eslint-disable-line react-hooks/exhaustive-deps
    const topic = usePlayableTopic(loaded?.topicId, themes);

    const reload = useCallback(() => {
        if (!duelId) return;
        quizzService.duel(duelId).then(setDuel).catch(err => {
            if (err instanceof ApiError && (err.status === 404 || err.status === 400)) setDuel("missing");
        });
    }, [duelId]);
    useEffect(reload, [reload]);

    if (!userId) {
        return <main className="quizz-match scrolls"><div className="quizz-end"><h1>Duel</h1>
            <p className="quizz-end-status"><Link to="/login">Connecte-toi</Link> pour jouer ce duel.</p></div></main>;
    }
    if (duel === "missing") return <NotFound/>;
    if (!duel || topic === null) return <Loader/>;
    if (!topic) return <NotFound/>;
    // la vue est remontée quand le duel change d'étape (salon → partie, partie → résultat)
    const stage = `${duel.live}-${duel.startedAt}-${duel.finished}-${mySide(duel).answers?.length ?? 0}`;
    return <DuelView key={stage} duel={duel} topic={topic} reload={reload}/>;
}
