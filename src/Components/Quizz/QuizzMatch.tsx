import "./Quizz.scss";
import {type CSSProperties, useEffect, useRef, useState} from "react";
import {Link, useParams} from "react-router-dom";
import {FaArrowLeft, FaCheck, FaRedo, FaTimes} from "react-icons/fa";
import {useAuth} from "../../Context/authContext.ts";
import Avatar from "../Avatar/Avatar.tsx";
import NotFound from "../NotFound/NotFound.tsx";
import {findTopic, type QuizzTopic} from "./topics/index.ts";
import {
    type Answer, botAnswer, botName, buildMatch, isLastRound, isQuizzMode, MAX_SCORE, pointsFor, QUESTION_MS,
    type QuizzMode, READ_MS, ROUNDS,
} from "./quizzMatch.ts";
import {readRecord, saveResult} from "./quizzRecords.ts";

/**
 * Partie de Quizz (/quizz/<thème>/solo ou /duel), à la manière de QuizUp.
 * Duel : présentation des deux joueurs (VS), puis 7 questions ; chacune se termine quand les deux ont répondu
 * (ou au bout du temps). Solo : pas d'adversaire, la question se termine dès qu'on a répondu.
 * Chaque question s'affiche d'abord seule (READ_MS), puis les réponses arrivent et le chrono démarre.
 * À la révélation : la bonne réponse, ce qu'ont choisi les joueurs et les points gagnés.
 * La question et les réponses occupent toute la hauteur de l'écran sous le header (texte plus grand sur grand écran).
 * L'adversaire est simulé (quizzMatch.ts) en attendant les parties contre de vrais joueurs.
 */

type Phase = "intro" | "read" | "question" | "reveal" | "end";

const INTRO_MS = 2200;
const REVEAL_MS = 2000;

function sum(answers: Answer[], match: ReturnType<typeof buildMatch>): number {
    return answers.reduce((total, a, round) => total + pointsFor(a, match[round]!, round), 0);
}

function QuizzGame({topic, mode, onReplay}: { topic: QuizzTopic; mode: QuizzMode; onReplay: () => void }) {
    const auth = useAuth();
    const me = auth.username ?? "Toi";
    const duel = mode === "duel";
    // tirage fait une fois par partie (le composant est remonté à chaque « Rejouer ») ; record d'avant la partie
    const [setup] = useState(() => {
        const match = buildMatch(topic);
        return {match, bot: match.map(q => botAnswer(q)), opponent: botName(), best: readRecord(topic.id).soloBest};
    });
    const {match, bot, opponent, best} = setup;

    const [phase, setPhase] = useState<Phase>(duel ? "intro" : "read");
    const [round, setRound] = useState(0);
    const [elapsed, setElapsed] = useState(0);
    const [pick, setPick] = useState<number | null>(null);
    const [mine, setMine] = useState<Answer[]>([]);
    // réponse du joueur et début du chrono, lus par la boucle du chrono
    const pickRef = useRef<Answer | null>(null);
    const startRef = useRef(0);

    // Présentation → lecture de la question → réponses ; après chaque révélation, question suivante (ou fin)
    useEffect(() => {
        if (phase !== "intro" && phase !== "read" && phase !== "reveal") return;
        const delay = phase === "intro" ? INTRO_MS : phase === "read" ? READ_MS : REVEAL_MS;
        const timer = window.setTimeout(() => {
            if (phase === "read") return setPhase("question");
            if (phase === "reveal" && isLastRound(round)) {
                saveResult(topic.id, mode, sum(mine, match), sum(bot, match));
                return setPhase("end");
            }
            pickRef.current = null;
            setPick(null);
            setElapsed(0);
            if (phase === "reveal") setRound(r => r + 1);
            setPhase("read");
        }, delay);
        return () => window.clearTimeout(timer);
    }, [phase, round, topic.id, mode, mine, match, bot]);

    // Chrono : fin quand tout le monde a répondu (le joueur seul en solo) ou au bout de 10 secondes
    useEffect(() => {
        if (phase !== "question") return;
        const start = performance.now();
        startRef.current = start;
        const botMs = duel ? bot[round]!.ms : 0;
        const timer = window.setInterval(() => {
            const e = Math.min(QUESTION_MS, performance.now() - start);
            setElapsed(e);
            const answer = pickRef.current;
            if (e >= QUESTION_MS || (answer && e >= botMs)) {
                window.clearInterval(timer);
                setMine(list => [...list, answer ?? {index: null, ms: QUESTION_MS}]);
                setPhase("reveal");
            }
        }, 50);
        return () => window.clearInterval(timer);
    }, [phase, round, bot, duel]);

    // l'heure du clic (event.timeStamp) a la même origine que performance.now()
    const choose = (index: number, at: number) => {
        if (phase !== "question" || pickRef.current) return;
        pickRef.current = {index, ms: at - startRef.current};
        setPick(index);
    };

    const question = match[round]!;
    const revealed = phase === "reveal";
    const doneRounds = revealed || phase === "end" ? round + 1 : round;
    const myScore = sum(mine.slice(0, doneRounds), match);
    const botScore = sum(bot.slice(0, doneRounds), match);
    const myGain = revealed ? pointsFor(mine[round]!, question, round) : 0;
    const botGain = revealed ? pointsFor(bot[round]!, question, round) : 0;
    const secondsLeft = Math.ceil((QUESTION_MS - elapsed) / 1000);
    const style = {"--topic": topic.color} as CSSProperties;

    const player = (side: "me" | "bot") => {
        const isMe = side === "me";
        const gain = isMe ? myGain : botGain;
        return (
            <div className={`quizz-player ${side}`}>
                <Avatar seed={isMe ? auth.avatar : opponent} fallback={isMe ? me : opponent} size={3.2}/>
                <span className="quizz-player-name">{isMe ? me : opponent}</span>
                <span className="quizz-player-score">{isMe ? myScore : botScore}</span>
                {revealed && gain > 0 && <span className="quizz-gain" key={round}>+{gain}</span>}
            </div>
        );
    };

    if (phase === "intro") {
        return (
            <main className="quizz-match" style={style}>
                <div className="quizz-intro">
                    <span className="quizz-intro-topic">{topic.name}</span>
                    <div className="quizz-intro-vs">
                        {player("me")}
                        <span className="quizz-vs">VS</span>
                        {player("bot")}
                    </div>
                </div>
            </main>
        );
    }

    if (phase === "end") {
        const result = !duel ? (myScore > best ? "Nouveau record !" : "Partie terminée")
            : myScore > botScore ? "Victoire !" : myScore < botScore ? "Défaite" : "Égalité";
        const tone = duel ? (myScore > botScore ? "win" : myScore < botScore ? "lose" : "") : myScore > best ? "win" : "";
        return (
            <main className="quizz-match scrolls" style={style}>
                <div className="quizz-end">
                    <span className="quizz-intro-topic">{topic.name} · {duel ? "Duel" : "Solo"}</span>
                    <h1 className={tone}>{result}</h1>
                    {duel ? (
                        <div className="quizz-intro-vs">
                            {player("me")}
                            <span className="quizz-vs">{myScore} – {botScore}</span>
                            {player("bot")}
                        </div>
                    ) : (
                        <p className="quizz-solo-score"><b>{myScore}</b> / {MAX_SCORE} points
                            {best > 0 && <small>Record précédent : {best}</small>}</p>
                    )}
                    <ol className="quizz-recap">
                        {match.map((q, i) => {
                            const ok = mine[i]?.index === q.correct;
                            return (
                                <li key={i} className={ok ? "ok" : "ko"}>
                                    {ok ? <FaCheck aria-label="Bonne réponse"/> : <FaTimes aria-label="Mauvaise réponse"/>}
                                    {q.image && <img src={q.image} alt="" className="quizz-recap-image"/>}
                                    <span>{q.question}<b>{q.answers[q.correct]}</b></span>
                                    <span className="quizz-recap-points">{pointsFor(mine[i]!, q, i)} pts</span>
                                </li>
                            );
                        })}
                    </ol>
                    <div className="quizz-end-actions">
                        <button type="button" className="quizz-button primary" onClick={onReplay}><FaRedo aria-hidden/> Rejouer</button>
                        <Link to={`/quizz/${topic.id}`} className="quizz-button"><FaArrowLeft aria-hidden/> {topic.name}</Link>
                    </div>
                </div>
            </main>
        );
    }

    const reading = phase === "read";
    return (
        <main className="quizz-match" style={style}>
            <div className="quizz-top">
                {player("me")}
                <div className="quizz-round">
                    <span>Question {round + 1} / {ROUNDS}</span>
                    <span className={`quizz-timer ${secondsLeft <= 3 && phase === "question" ? "hurry" : ""}`}
                          style={{"--left": `${((QUESTION_MS - elapsed) / QUESTION_MS) * 100}%`} as CSSProperties}>
                        <span>{phase === "question" ? secondsLeft : ""}</span>
                    </span>
                </div>
                {duel ? player("bot") : (
                    <div className="quizz-player record">
                        <span className="quizz-player-name">Record</span>
                        <span className="quizz-player-score">{best}</span>
                    </div>
                )}
            </div>

            <div className="quizz-board">
                <span className="quizz-bar me" aria-hidden><span style={{height: `${(myScore / MAX_SCORE) * 100}%`}}/></span>
                <div className={`quizz-question ${reading ? "reading" : ""}`} key={round}>
                    <div className="quizz-prompt">
                        {isLastRound(round) && <span className="quizz-double">Dernière question : points doublés !</span>}
                        <h2>{question.question}</h2>
                        {question.image && <img className="quizz-image" src={question.image} alt="" draggable={false}/>}
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
                                    {revealed && duel && bot[round]!.index === i && <span className="quizz-who bot">
                                        <Avatar seed={opponent} fallback={opponent} size={2}/></span>}
                                </button>
                            );
                        })}
                    </div>
                    <p className="quizz-timeout">{revealed && pick === null ? "Temps écoulé !" : ""}</p>
                </div>
                {duel
                    ? <span className="quizz-bar bot" aria-hidden><span style={{height: `${(botScore / MAX_SCORE) * 100}%`}}/></span>
                    : <span className="quizz-bar ghost" aria-hidden/>}
            </div>
        </main>
    );
}

export default function QuizzMatch() {
    const {topicId, mode} = useParams();
    const topic = findTopic(topicId);
    const [game, setGame] = useState(0);
    if (!topic || !isQuizzMode(mode)) return <NotFound/>;
    return <QuizzGame key={`${topic.id}-${mode}-${game}`} topic={topic} mode={mode} onReplay={() => setGame(n => n + 1)}/>;
}
