import "./Quizz.scss";
import {useEffect, useState} from "react";
import {Link, useNavigate, useParams, useSearchParams} from "react-router-dom";
import {useAuth} from "../../Context/authContext.ts";
import {useFriends} from "../../Services/friends.service.ts";
import {quizzService} from "../../Services/quizz.service.ts";
import NotFound from "../NotFound/NotFound.tsx";
import Loader from "../Loader/Loader.tsx";
import type {PlayableTopic} from "./topics/index.ts";
import {buildMatch, isQuizzMode, type QuizzMode} from "./quizzMatch.ts";
import {usePlayableTopic} from "./quizzMixes.ts";
import QuizzGame, {type Rival} from "./QuizzGame.tsx";

/**
 * Nouvelle partie de Quizz (/quizz/<thème>/solo ou /duel) :
 * - solo : seul contre le chrono ;
 * - duel au hasard (/duel) : on prend un duel qu'un autre joueur a déjà joué sur ce thème (on le joue face à ses
 *   réponses, sur /quizz/duel/<id>) ; s'il n'y en a pas, on joue en premier et le duel attend un adversaire ;
 * - duel contre un·e ami·e chacun son tour (/duel?ami=<pseudo>) : on joue en premier, il ou elle est prévenu·e.
 * Le duel en direct se lance depuis la page du thème (salon d'attente, /quizz/duel/<id>).
 * Questions : celles du site plus celles proposées par les joueurs et validées ; un mélange de thèmes (tous les
 * thèmes, une catégorie, partie custom ?themes=…) prend celles de tous ses thèmes (usePlayableTopic).
 */

function DuelStart({topic, friend, onReplay}: { topic: PlayableTopic; friend: string | null; onReplay: () => void }) {
    const navigate = useNavigate();
    const {userId} = useAuth();
    const {friends} = useFriends(userId);
    // duel au hasard : undefined pendant la recherche d'un adversaire en attente, null s'il n'y en a pas
    const [claimed, setClaimed] = useState<string | null | undefined>(friend ? null : undefined);
    const [setup] = useState(() => ({match: buildMatch(topic)}));

    useEffect(() => {
        if (friend) return;
        let alive = true;
        quizzService.claimRandom(topic.id)
            .then(id => {
                if (!alive) return;
                if (id) navigate(`/quizz/duel/${id}`, {replace: true});
                else setClaimed(null);
            })
            .catch(() => alive && setClaimed(null));
        return () => {
            alive = false;
        };
    }, [friend, topic.id, navigate]);

    const avatar = friends.find(f => f.username === friend)?.avatar ?? null;
    const [rival] = useState<Rival>(() => ({kind: "first", name: friend ?? "Adversaire mystère", avatar: friend ? avatar : null}));
    if (claimed !== null) return <Loader/>;

    return (
        <QuizzGame topic={topic} match={setup.match} rival={rival} onReplay={onReplay} replayLabel="Nouveau duel"
                   stats={{mode: friend ? "friend" : "random"}}
                   onDone={async (answers, gameId) => {
                       await quizzService.createDuel({topicId: topic.id, questions: setup.match, answers, gameId, ...friend ? {friend} : {}});
                       return friend ? `${friend} est prévenu·e : tu sauras qui a gagné dès qu'il ou elle aura joué.`
                           : "Ton duel attend un adversaire : tu seras prévenu·e du résultat dès qu'il aura joué.";
                   }}/>
    );
}

function Game({topic, mode, onReplay}: { topic: PlayableTopic; mode: QuizzMode; onReplay: () => void }) {
    const {userId} = useAuth();
    const friend = useSearchParams()[0].get("ami");
    const [solo] = useState(() => ({match: buildMatch(topic), rival: {kind: "solo"} as Rival}));
    if (mode === "solo") return <QuizzGame topic={topic} match={solo.match} rival={solo.rival} onReplay={onReplay} stats={{mode: "solo"}}/>;
    if (!userId) {
        return (
            <main className="quizz-match scrolls">
                <div className="quizz-end">
                    <h1>Duel</h1>
                    <p className="quizz-end-status"><Link to="/login">Connecte-toi</Link> pour affronter tes ami·e·s ou d'autres joueurs.</p>
                </div>
            </main>
        );
    }
    return <DuelStart topic={topic} friend={friend} onReplay={onReplay}/>;
}

export default function QuizzMatch() {
    const {topicId, mode} = useParams();
    const themes = useSearchParams()[0].get("themes")?.split(",").filter(Boolean);
    const topic = usePlayableTopic(topicId, themes);
    const [game, setGame] = useState(0);
    if (topic === null) return <Loader/>;
    if (!topic || !isQuizzMode(mode)) return <NotFound/>;
    return <Game key={`${topic.id}-${mode}-${game}`} topic={topic} mode={mode} onReplay={() => setGame(n => n + 1)}/>;
}
