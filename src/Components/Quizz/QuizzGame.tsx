import "./Quizz.scss";
import {type CSSProperties, type ReactNode, useEffect, useRef, useState} from "react";
import {Link} from "react-router-dom";
import {FaArrowLeft, FaCheck, FaRedo, FaTimes} from "react-icons/fa";
import {useAuth} from "../../Context/authContext.ts";
import Avatar from "../Avatar/Avatar.tsx";
import type {QuizzTopic} from "./topics/index.ts";
import {
    type Answer, INTRO_MS, isLastRound, LIVE_GRACE_MS, type MatchQuestion, MAX_SCORE, pointsFor, QUESTION_MS, READ_MS,
    REVEAL_MS, ROUNDS, scoreOf,
} from "./quizzMatch.ts";
import {saveResult, useSoloBest} from "./quizzRecords.ts";
import type {GameMode, QuizzReward} from "../../../backend/src/utils/quizzGames.ts";
import {rewardFx} from "../../Services/rewardFx.ts";
import {quizzService} from "../../Services/quizz.service.ts";
import {quizzPath} from "./quizzMixes.ts";
import QuizzContest from "./QuizzContest.tsx";
import QuizzIcon from "./QuizzIcon.tsx";
import {useQuizzTopics} from "./useQuizzTopics.ts";

/**
 * Une partie de Quizz, à la manière de QuizUp : présentation des deux joueurs (VS) en duel, puis 7 questions.
 * Chaque question s'affiche d'abord seule (READ_MS), puis les réponses arrivent et le chrono démarre.
 * À la révélation : la bonne réponse, ce qu'ont choisi les joueurs et les points gagnés.
 * La question et les réponses occupent toute la hauteur de l'écran sous le header (texte plus grand sur grand écran).
 *
 * L'adversaire (`rival`) :
 * - solo : personne, la question se termine dès qu'on a répondu ;
 * - first : on joue le premier (duel chacun son tour, ou au hasard sans adversaire en attente) : ses réponses
 *   viendront plus tard, la question se termine dès qu'on a répondu ;
 * - replay : on joue le second : les réponses du premier sont rejouées à leur moment, comme s'il jouait avec nous ;
 * - live : en direct : chaque réponse part au serveur dès qu'elle est donnée, celles de l'autre sont relues toutes
 *   les POLL_MS ; la question attend sa réponse (au plus LIVE_GRACE_MS après la fin du chrono).
 * Chaque question se termine quand les deux ont répondu, ou au bout du temps.
 *
 * Chaque question porte l'étiquette de son thème (icône et nom). Dans un mélange (catégorie, tous les thèmes,
 * partie custom), quand le thème change d'une question à l'autre, son icône traverse l'écran en couleur
 * pendant la lecture de la question, qui dure alors plus longtemps (SWOOSH_MS).
 *
 * Pendant la partie (jusqu'au dernier résultat), le header du site est caché (classe quizz-playing sur le body) :
 * une croix en haut à gauche permet de quitter ; il revient sur l'écran de fin.
 *
 * Récompense (joueur connecté) : à la dernière réponse, le serveur verse de l'XP et quelques crédits selon le
 * score (quizzReward) ; l'écran de fin les affiche, puis des particules filent vers le header (rewardFx).
 *
 * Statistiques (joueur connecté, `stats`) : la partie est enregistrée sur le serveur dès son début, puis chaque
 * réponse au moment où elle est donnée (une partie abandonnée garde ses premières réponses).
 */

export type Rival =
    | { kind: "solo" }
    | { kind: "first"; name: string; avatar: string | null }
    | { kind: "replay"; name: string; avatar: string; answers: Answer[] }
    | { kind: "live"; name: string; avatar: string; duelId: string; side: "challenger" | "opponent"; startInMs: number };

type Phase = "intro" | "read" | "question" | "reveal" | "end";

const POLL_MS = 600;
// mélange, changement de thème : durée du passage de l'icône (la même que l'animation quizz-swoosh, Quizz.scss),
// puis temps laissé pour lire la question avant l'arrivée des réponses
const SWOOSH_MS = 3_100;
const READ_AFTER_SWOOSH_MS = 1_800;

// Mélange : le thème de la question change par rapport à la précédente (ou première question). Comparé sur les
// identifiants des questions, pas sur les thèmes chargés : les deux joueurs d'un duel ont le même rythme
const swooshAt = (topic: QuizzTopic, match: MatchQuestion[], r: number) =>
    !!topic.mix && (r === 0 || match[r]?.topic !== match[r - 1]?.topic);
const TIMEOUT: Answer = {index: null, ms: QUESTION_MS};

type QuizzGameProps = {
    topic: QuizzTopic;
    match: MatchQuestion[];
    rival: Rival;
    // fin de partie (duel) : envoie la partie ; le message affiché ensuite (ex. « Léa jouera après toi »).
    // gameId : la partie enregistrée pour les statistiques (null si elle ne l'est pas)
    onDone?: (mine: Answer[], gameId: string | null) => Promise<ReactNode>;
    // enregistrement pour les statistiques : le mode, et le duel s'il existe déjà
    stats: { mode: GameMode; duelId?: string };
    onReplay?: () => void;
    replayLabel?: string;
};

// Envoi d'une réponse en direct (une seconde tentative si le réseau flanche ; refusée si déjà reçue)
async function sendLive(duelId: string, round: number, answer: Answer, touchStreak: () => Promise<void>) {
    try {
        await quizzService.answerDuel(duelId, round, answer);
        // dernière réponse : la flamme du jour est allumée
        if (round === ROUNDS - 1) void touchStreak();
    } catch {
        window.setTimeout(() => void quizzService.answerDuel(duelId, round, answer).catch(() => undefined), 1000);
    }
}

export default function QuizzGame({topic, match, rival, onDone, onReplay, replayLabel = "Rejouer", stats}: QuizzGameProps) {
    const auth = useAuth();
    const me = auth.username ?? "Toi";
    const duel = rival.kind !== "solo";
    const knowsRival = rival.kind === "replay" || rival.kind === "live";
    const best = useSoloBest(topic.id, auth.isLoggedIn);
    const allTopics = useQuizzTopics();
    // thème d'une question : le sien dans un mélange, sinon celui de la partie
    const themeOf = (q: MatchQuestion | undefined): QuizzTopic =>
        (q?.topic && allTopics.find(t => t.id === q.topic)) || topic;

    // Statistiques : la partie enregistrée (son id, ou null si elle ne l'est pas), et les réponses envoyées dans
    // l'ordre, l'une après l'autre
    const gameRef = useRef<Promise<string | null>>(Promise.resolve(null));
    const chainRef = useRef<Promise<void>>(Promise.resolve());
    useEffect(() => {
        if (!auth.isLoggedIn) return;
        gameRef.current = quizzService.startGame({topicId: topic.id, ...stats, questions: match}).catch(() => null);
    }, []); // eslint-disable-line react-hooks/exhaustive-deps
    const [reward, setReward] = useState<QuizzReward | null>(null);
    const record = (round: number, answer: Answer) => {
        chainRef.current = chainRef.current.then(async () => {
            const id = await gameRef.current;
            if (!id) return;
            const result = await quizzService.answerGame(id, round, answer).catch(() => null);
            if (!result?.reward) return;
            // le header garde l'ancienne progression jusqu'à l'arrivée des particules (écran de fin)
            rewardFx.hold({...auth.account});
            setReward(result.reward);
            void auth.refresh();
        });
        // partie finie, récompense ou non : la flamme du jour est allumée
        if (round === ROUNDS - 1) chainRef.current = chainRef.current.then(() => auth.touchStreak());
    };

    const [phase, setPhase] = useState<Phase>(duel ? "intro" : "read");
    const [round, setRound] = useState(0);
    const [elapsed, setElapsed] = useState(0);
    const [pick, setPick] = useState<number | null>(null);
    const [mine, setMine] = useState<Answer[]>([]);
    const [theirs, setTheirs] = useState<Answer[]>([]);
    const [doneText, setDoneText] = useState<ReactNode>(null);
    const [sendError, setSendError] = useState<string | null>(null);
    // réponse du joueur, début du chrono et réponses de l'adversaire en direct, lus par la boucle du chrono
    const pickRef = useRef<Answer | null>(null);
    const startRef = useRef(0);
    const liveRef = useRef<Answer[]>([]);
    const [liveCount, setLiveCount] = useState(0);
    const sentRef = useRef(false);

    // En direct : réponses de l'autre, relues pendant toute la partie
    useEffect(() => {
        if (rival.kind !== "live" || phase === "end") return;
        const other = rival.side === "challenger" ? "opponent" : "challenger";
        let alive = true;
        const poll = () => quizzService.duel(rival.duelId).then(d => {
            const answers = d[other]?.answers ?? [];
            if (alive && answers.length > liveRef.current.length) {
                liveRef.current = answers;
                setLiveCount(answers.length);
            }
        }).catch(() => undefined);
        void poll();
        const timer = window.setInterval(() => void poll(), POLL_MS);
        return () => {
            alive = false;
            window.clearInterval(timer);
        };
    }, [rival, phase === "end"]); // eslint-disable-line react-hooks/exhaustive-deps

    // Présentation → lecture de la question → réponses ; après chaque révélation, question suivante (ou fin)
    useEffect(() => {
        if (phase !== "intro" && phase !== "read" && phase !== "reveal") return;
        const delay = phase === "read" ? (swooshAt(topic, match, round) ? SWOOSH_MS + READ_AFTER_SWOOSH_MS : READ_MS)
            : phase === "reveal" ? REVEAL_MS
            : rival.kind === "live" ? Math.max(300, rival.startInMs) : INTRO_MS;
        const timer = window.setTimeout(() => {
            if (phase === "read") return setPhase("question");
            if (phase === "reveal" && isLastRound(round)) {
                if (!duel) saveResult(topic.id, "solo", scoreOf(mine, match));
                return setPhase("end");
            }
            pickRef.current = null;
            setPick(null);
            setElapsed(0);
            if (phase === "reveal") setRound(r => r + 1);
            setPhase("read");
        }, delay);
        return () => window.clearTimeout(timer);
    }, [phase, round, topic, mine, match, duel, rival]);

    // Chrono : fin quand les deux ont répondu (le joueur seul s'il n'a pas d'adversaire en face) ou au bout du temps
    useEffect(() => {
        if (phase !== "question") return;
        const start = performance.now();
        startRef.current = start;
        const timer = window.setInterval(() => {
            const e = performance.now() - start;
            setElapsed(Math.min(QUESTION_MS, e));
            if (e >= QUESTION_MS && !pickRef.current) {
                pickRef.current = TIMEOUT;
                if (rival.kind === "live") void sendLive(rival.duelId, round, TIMEOUT, auth.touchStreak);
            }
            const answer = pickRef.current;
            const theirAnswer = rival.kind === "replay" ? (e >= rival.answers[round]!.ms ? rival.answers[round]! : null)
                : rival.kind === "live" ? liveRef.current[round] ?? null : TIMEOUT;
            const givenUp = rival.kind !== "live" || e >= QUESTION_MS + LIVE_GRACE_MS;
            if (answer && (theirAnswer || givenUp)) {
                window.clearInterval(timer);
                record(round, answer);
                setMine(list => [...list, answer]);
                setTheirs(list => [...list, theirAnswer ?? TIMEOUT]);
                setPhase("reveal");
            }
        }, 50);
        return () => window.clearInterval(timer);
    }, [phase, round, rival]); // eslint-disable-line react-hooks/exhaustive-deps

    // Header du site caché pendant la partie, de retour sur l'écran de fin (ou en quittant la page)
    const ended = phase === "end";
    useEffect(() => {
        if (ended) return;
        document.body.classList.add("quizz-playing");
        return () => document.body.classList.remove("quizz-playing");
    }, [ended]);

    // Écran de fin : les gains s'affichent, puis leurs particules filent vers le header (de retour à l'écran)
    const xpRef = useRef<HTMLSpanElement>(null);
    const creditsRef = useRef<HTMLSpanElement>(null);
    useEffect(() => {
        if (!ended || !reward) return;
        const timer = window.setTimeout(() => rewardFx.fly(reward.xp > 0 ? xpRef.current : null,
            reward.credits > 0 ? creditsRef.current : null), 900);
        return () => window.clearTimeout(timer);
    }, [ended, reward]);
    // page quittée avant le vol : le header n'est pas laissé figé
    useEffect(() => () => rewardFx.release(), []);

    // Fin d'un duel : la partie est envoyée une fois
    const send = () => {
        if (!onDone) return;
        setSendError(null);
        void gameRef.current.then(gameId => onDone(mine, gameId)).then(text => {
            setDoneText(text);
            void auth.touchStreak();
        }).catch((err: Error) => {
            sentRef.current = false;
            setSendError(err.message);
        });
    };
    useEffect(() => {
        if (phase !== "end" || sentRef.current) return;
        sentRef.current = true;
        send();
    }, [phase]); // eslint-disable-line react-hooks/exhaustive-deps

    // l'heure du clic (event.timeStamp) a la même origine que performance.now()
    const choose = (index: number, at: number) => {
        if (phase !== "question" || pickRef.current) return;
        const answer = {index, ms: Math.max(0, Math.min(QUESTION_MS - 1, at - startRef.current))};
        pickRef.current = answer;
        setPick(index);
        if (rival.kind === "live") void sendLive(rival.duelId, round, answer, auth.touchStreak);
    };

    const question = match[round]!;
    const revealed = phase === "reveal";
    const doneRounds = revealed || phase === "end" ? round + 1 : round;
    const myScore = scoreOf(mine.slice(0, doneRounds), match);
    const rivalScore = scoreOf(theirs.slice(0, doneRounds), match);
    const myGain = revealed ? pointsFor(mine[round]!, question, round) : 0;
    const rivalGain = revealed && knowsRival ? pointsFor(theirs[round]!, question, round) : 0;
    const secondsLeft = Math.ceil((QUESTION_MS - elapsed) / 1000);
    const style = {"--topic": topic.color} as CSSProperties;
    const rivalName = rival.kind === "solo" ? "" : rival.name;
    const rivalAvatar = rival.kind === "solo" ? null : rival.avatar;
    // en direct : l'adversaire a déjà répondu à cette question
    const rivalAnswered = rival.kind === "live" && phase === "question" && liveCount > round;

    const player = (side: "me" | "rival") => {
        const isMe = side === "me";
        const gain = isMe ? myGain : rivalGain;
        return (
            <div className={`quizz-player ${isMe ? "me" : "bot"} ${!isMe && rivalAnswered ? "answered" : ""}`}>
                <Avatar seed={isMe ? auth.avatar : rivalAvatar} fallback={isMe ? me : rivalName || "?"} size={3.2}/>
                <span className="quizz-player-name">{isMe ? me : rivalName}</span>
                <span className="quizz-player-score">{isMe ? myScore : knowsRival ? rivalScore : "?"}</span>
                {revealed && gain > 0 && <span className="quizz-gain" key={round}>+{gain}</span>}
            </div>
        );
    };

    const quit = (
        <Link to={quizzPath(topic)} className="quizz-quit" title="Quitter la partie" aria-label="Quitter la partie">
            <FaTimes aria-hidden/>
        </Link>
    );

    if (phase === "intro") {
        return (
            <main className="quizz-match" style={style}>
                {quit}
                <div className="quizz-intro">
                    <span className="quizz-intro-topic">{topic.name}</span>
                    <div className="quizz-intro-vs">
                        {player("me")}
                        <span className="quizz-vs">VS</span>
                        {player("rival")}
                    </div>
                    {rival.kind === "first" && <p className="quizz-intro-note">Tu joues en premier : {rivalName === "Adversaire mystère"
                        ? "ton adversaire jouera les mêmes questions" : `${rivalName} jouera les mêmes questions`} face à tes réponses.</p>}
                </div>
            </main>
        );
    }

    if (phase === "end") {
        const result = !duel ? (myScore > best ? "Nouveau record !" : "Partie terminée")
            : !knowsRival ? "Partie envoyée"
                : myScore > rivalScore ? "Victoire !" : myScore < rivalScore ? "Défaite" : "Égalité";
        const tone = knowsRival ? (myScore > rivalScore ? "win" : myScore < rivalScore ? "lose" : "")
            : !duel && myScore > best ? "win" : "";
        return (
            <main className="quizz-match scrolls" style={style}>
                <div className="quizz-end">
                    <span className="quizz-intro-topic">{topic.name} · {duel ? (rival.kind === "live" ? "Duel en direct" : "Duel") : "Solo"}</span>
                    <h1 className={tone}>{result}</h1>
                    {knowsRival ? (
                        <div className="quizz-intro-vs">
                            {player("me")}
                            <span className="quizz-vs">{myScore} – {rivalScore}</span>
                            {player("rival")}
                        </div>
                    ) : (
                        <p className="quizz-solo-score"><b>{myScore}</b> / {MAX_SCORE} points
                            {!duel && best > 0 && <small>Record précédent : {best}</small>}</p>
                    )}
                    {reward ? (
                        <div className="quizz-reward" role="status">
                            {reward.xp > 0 && <span ref={xpRef} className="quizz-reward-chip xp">+{reward.xp} XP</span>}
                            {reward.credits > 0 && <span ref={creditsRef} className="quizz-reward-chip credits">+{reward.credits} crédits</span>}
                        </div>
                    ) : !auth.isLoggedIn && myScore > 0 && (
                        <p className="quizz-reward-guest">Connecte-toi pour gagner de l'XP et des crédits à chaque partie.</p>
                    )}
                    {duel && onDone && <p className="quizz-end-status" role="status">
                        {sendError ? <>{sendError} <button type="button" className="quizz-link" onClick={send}>Réessayer</button></>
                            : doneText ?? "Envoi de ta partie…"}
                    </p>}
                    <ol className="quizz-recap">
                        {match.map((q, i) => {
                            const ok = mine[i]?.index === q.correct;
                            const qTheme = themeOf(q);
                            return (
                                <li key={i} className={ok ? "ok" : "ko"}>
                                    {ok ? <FaCheck aria-label="Bonne réponse"/> : <FaTimes aria-label="Mauvaise réponse"/>}
                                    <span>{topic.mix && <span className="quizz-theme-tag small"
                                                              style={{"--theme": qTheme.color} as CSSProperties}>
                                        <span className="quizz-theme-tag-icon"><QuizzIcon icon={qTheme.icon}/></span>{qTheme.name}</span>}
                                        {q.question}<b>{q.answers[q.correct]}</b></span>
                                    <span className="quizz-recap-points">{pointsFor(mine[i]!, q, i)} pts</span>
                                    <QuizzContest topicId={q.topic ?? topic.id} question={q} picked={mine[i]?.index ?? null}/>
                                </li>
                            );
                        })}
                    </ol>
                    <div className="quizz-end-actions">
                        {onReplay && <button type="button" className="quizz-button primary" onClick={onReplay}><FaRedo aria-hidden/> {replayLabel}</button>}
                        <Link to={quizzPath(topic)} className="quizz-button"><FaArrowLeft aria-hidden/> {topic.name}</Link>
                    </div>
                </div>
            </main>
        );
    }

    const reading = phase === "read";
    const theme = themeOf(question);
    // mélange : le thème change par rapport à la question précédente (ou première question)
    const themeChanged = swooshAt(topic, match, round);
    const waitingRival = rival.kind === "live" && phase === "question" && elapsed >= QUESTION_MS && liveCount <= round;
    return (
        <main className="quizz-match" style={style}>
            {quit}
            <div className="quizz-top">
                {player("me")}
                <div className="quizz-round">
                    <span>Question {round + 1} / {ROUNDS}</span>
                    <span className={`quizz-timer ${secondsLeft <= 3 && phase === "question" ? "hurry" : ""}`}
                          style={{"--left": `${((QUESTION_MS - elapsed) / QUESTION_MS) * 100}%`} as CSSProperties}>
                        <span>{phase === "question" ? secondsLeft : ""}</span>
                    </span>
                </div>
                {duel ? player("rival") : (
                    <div className="quizz-player record">
                        <span className="quizz-player-name">Record</span>
                        <span className="quizz-player-score">{best}</span>
                    </div>
                )}
            </div>

            <div className="quizz-board">
                <span className="quizz-bar me" aria-hidden><span style={{height: `${(myScore / MAX_SCORE) * 100}%`}}/></span>
                <div className={`quizz-question ${reading ? "reading" : ""}`} key={round}
                     style={{"--theme": theme.color} as CSSProperties}>
                    {themeChanged && reading && (
                        <div className="quizz-swoosh" aria-hidden>
                            <span className="quizz-swoosh-trail"/>
                            <span className="quizz-swoosh-badge"><QuizzIcon icon={theme.icon}/></span>
                            <span className="quizz-swoosh-name">{theme.name}</span>
                        </div>
                    )}
                    <div className={`quizz-prompt ${themeChanged ? "after-swoosh" : ""}`}>
                        <span className="quizz-theme-tag"><span className="quizz-theme-tag-icon"><QuizzIcon icon={theme.icon}/></span>{theme.name}</span>
                        {isLastRound(round) && <span className="quizz-double">Dernière question : points doublés !</span>}
                        <h2>{question.question}</h2>
                    </div>
                    {/* pendant la lecture, les réponses gardent leur place (invisibles) : rien ne bouge à leur arrivée */}
                    <div className="quizz-answers" aria-hidden={reading}>
                        {question.answers.map((text, i) => {
                            const state = !revealed ? (pick === i ? "picked" : "")
                                : i === question.correct ? "correct" : pick === i ? "wrong" : "";
                            return (
                                <button key={text} type="button" className={`quizz-answer ${state}`}
                                        disabled={phase !== "question" || pick !== null} onClick={e => choose(i, e.timeStamp)}>
                                    {revealed && pick === i && <span className="quizz-who me">
                                        <Avatar seed={auth.avatar} fallback={me} size={2}/></span>}
                                    {text}
                                    {revealed && knowsRival && theirs[round]!.index === i && <span className="quizz-who bot">
                                        <Avatar seed={rivalAvatar} fallback={rivalName} size={2}/></span>}
                                </button>
                            );
                        })}
                    </div>
                    <p className="quizz-timeout">{revealed && pick === null ? "Temps écoulé !"
                        : waitingRival ? `En attente de ${rivalName}…` : ""}</p>
                </div>
                {knowsRival
                    ? <span className="quizz-bar bot" aria-hidden><span style={{height: `${(rivalScore / MAX_SCORE) * 100}%`}}/></span>
                    : <span className="quizz-bar ghost" aria-hidden/>}
            </div>
        </main>
    );
}
