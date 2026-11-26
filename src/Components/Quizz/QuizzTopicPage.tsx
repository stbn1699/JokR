import "./Quizz.scss";
import {type CSSProperties, useState} from "react";
import {Link, useParams} from "react-router-dom";
import {FaArrowLeft, FaExternalLinkAlt, FaUser, FaUserFriends} from "react-icons/fa";
import NotFound from "../NotFound/NotFound.tsx";
import {findTopic, QUIZZ_CATEGORIES} from "./topics/index.ts";
import {MAX_SCORE, ROUNDS} from "./quizzMatch.ts";
import {readRecord} from "./quizzRecords.ts";
import {useTopicQuestions} from "./useTopicQuestions.ts";
import QuizzSubmitForm from "./QuizzSubmitForm.tsx";

/**
 * Page d'un thème du Quizz (/quizz/<thème>), façon fiche d'encyclopédie : présentation en quelques paragraphes,
 * infobox (dates, auteurs…) et lien vers l'article Wikipédia. Sur le côté, les deux façons de jouer
 * (solo contre le chrono, duel contre un adversaire) avec les records du joueur sur ce thème.
 * Sous la fiche : le formulaire pour proposer des questions (QuizzSubmitForm).
 */
export default function QuizzTopicPage() {
    const topic = findTopic(useParams().topicId);
    const [record] = useState(() => topic && readRecord(topic.id));
    const questions = useTopicQuestions(topic);
    if (!topic || !record) return <NotFound/>;

    const Icon = topic.icon;
    const category = QUIZZ_CATEGORIES.find(c => c.id === topic.category)!.label;
    const duels = record.wins + record.draws + record.losses;

    return (
        <main className="quizz-topic-page" style={{"--topic": topic.color} as CSSProperties}>
            <Link to="/quizz" className="quizz-back"><FaArrowLeft aria-hidden/> Tous les thèmes</Link>

            <div className="quizz-topic-layout">
                <article className="quizz-article">
                    <span className="quizz-article-category">{category}</span>
                    <h1>{topic.name}</h1>
                    {topic.wiki.summary.map((p, i) => <p key={i}>{p}</p>)}
                    <a href={topic.wiki.url} target="_blank" rel="noreferrer" className="quizz-wiki-link">
                        Lire l'article complet sur Wikipédia <FaExternalLinkAlt aria-hidden/>
                    </a>
                    <QuizzSubmitForm topic={topic}/>
                </article>

                <aside className="quizz-side">
                    <div className="quizz-infobox">
                        <div className="quizz-infobox-art"><Icon aria-hidden/></div>
                        <strong>{topic.name}</strong>
                        <dl>
                            {topic.wiki.facts.map(([label, value]) => (
                                <div key={label}><dt>{label}</dt><dd>{value}</dd></div>
                            ))}
                        </dl>
                    </div>

                    <div className="quizz-play">
                        <h2>Jouer</h2>
                        <p>{(questions ?? topic.questions).length} questions · {ROUNDS} par partie</p>
                        <Link to={`/quizz/${topic.id}/solo`} className="quizz-mode">
                            <FaUser aria-hidden/>
                            <span><strong>Solo</strong><small>Toi contre le chrono · record {record.soloBest} / {MAX_SCORE}</small></span>
                        </Link>
                        <Link to={`/quizz/${topic.id}/duel`} className="quizz-mode">
                            <FaUserFriends aria-hidden/>
                            <span><strong>Duel</strong>
                                <small>{duels === 0 ? "Affronte un adversaire"
                                    : `${record.wins} victoire${record.wins > 1 ? "s" : ""} · ${record.draws} nul${record.draws > 1 ? "s" : ""} · ${record.losses} défaite${record.losses > 1 ? "s" : ""}`}</small>
                            </span>
                        </Link>
                    </div>
                </aside>
            </div>
        </main>
    );
}
