import "./Quizz.scss";
import {type CSSProperties} from "react";
import {Link, useParams, useSearchParams} from "react-router-dom";
import {FaArrowLeft, FaExternalLinkAlt, FaUser} from "react-icons/fa";
import NotFound from "../NotFound/NotFound.tsx";
import Loader from "../Loader/Loader.tsx";
import {QUIZZ_CATEGORIES} from "./topics/index.ts";
import {MAX_SCORE, ROUNDS} from "./quizzMatch.ts";
import {useSoloBest} from "./quizzRecords.ts";
import {useAuth} from "../../Context/authContext.ts";
import {quizzPath, usePlayableTopic} from "./quizzMixes.ts";
import QuizzSubmitForm from "./QuizzSubmitForm.tsx";
import QuizzDuelPanel from "./QuizzDuelPanel.tsx";
import QuizzIcon from "./QuizzIcon.tsx";

/**
 * Page d'un thème du Quizz (/quizz/<thème>), façon fiche d'encyclopédie : présentation en quelques paragraphes,
 * infobox (dates, auteurs…) et lien vers l'article Wikipédia. Sur le côté, les deux façons de jouer
 * (solo contre le chrono ; duel au hasard ou contre un·e ami·e, voir QuizzDuelPanel) avec les records du joueur.
 * Sous la fiche : le formulaire pour proposer des questions (QuizzSubmitForm).
 * Thème créé par un joueur : pas d'infobox (seulement l'icône de sa catégorie), son créateur, et le texte de
 * Wikipédia avec sa source et sa licence (CC BY-SA).
 * Mélange de thèmes (quizzMixes.ts : tous les thèmes, une catégorie, partie custom) : la liste de ses thèmes à la
 * place de l'article, et pas de formulaire (les questions se proposent sur chaque thème).
 */
export default function QuizzTopicPage() {
    const topicId = useParams().topicId;
    const themes = useSearchParams()[0].get("themes")?.split(",").filter(Boolean);
    const topic = usePlayableTopic(topicId, themes);
    const soloBest = useSoloBest(topicId ?? "", useAuth().isLoggedIn);
    if (topic === null) return <Loader/>;
    if (!topic) return <NotFound/>;

    const category = topic.mix ? "Mélange de thèmes" : QUIZZ_CATEGORIES.find(c => c.id === topic.category)!.label;

    return (
        <main className="quizz-topic-page" style={{"--topic": topic.color} as CSSProperties}>
            <Link to="/quizz" className="quizz-back"><FaArrowLeft aria-hidden/> Tous les thèmes</Link>

            <div className="quizz-topic-layout">
                <article className="quizz-article">
                    <span className="quizz-article-category">{category}</span>
                    <h1>{topic.name}</h1>
                    {topic.creator && <p className="quizz-article-creator">Thème créé par <Link to={`/joueur/${encodeURIComponent(topic.creator)}`}>{topic.creator}</Link></p>}
                    {topic.wiki.summary.map((p, i) => <p key={i}>{p}</p>)}
                    {topic.mix ? (
                        <ul className="quizz-mix-topics">
                            {topic.mix.topics.map(t => (
                                <li key={t.id}><Link to={`/quizz/${t.id}`} style={{"--topic": t.color} as CSSProperties}>{t.name}</Link></li>
                            ))}
                        </ul>
                    ) : null}
                    {topic.mix?.kind === "custom" && <Link to={`/quizz/custom${topic.mix.query}`} className="quizz-wiki-link">Modifier le mélange</Link>}
                    {topic.mix?.kind === "category" && <Link to="/quizz/categorie" className="quizz-wiki-link">Changer de catégorie</Link>}
                    {!topic.mix && <a href={topic.wiki.url} target="_blank" rel="noreferrer" className="quizz-wiki-link">
                        Lire l'article complet sur Wikipédia <FaExternalLinkAlt aria-hidden/>
                    </a>}
                    {topic.userMade && <p className="quizz-wiki-license">Texte tiré de Wikipédia, sous licence{" "}
                        <a href="https://creativecommons.org/licenses/by-sa/4.0/deed.fr" target="_blank" rel="noreferrer">CC BY-SA 4.0</a>.</p>}
                    {!topic.mix && <QuizzSubmitForm topic={topic}/>}
                </article>

                <aside className="quizz-side">
                    <div className="quizz-infobox">
                        <div className="quizz-infobox-art"><QuizzIcon icon={topic.icon}/></div>
                        <strong>{topic.name}</strong>
                        {topic.wiki.facts.length > 0 && <dl>
                            {topic.wiki.facts.map(([label, value]) => (
                                <div key={label}><dt>{label}</dt><dd>{value}</dd></div>
                            ))}
                        </dl>}
                    </div>

                    <div className="quizz-play">
                        <h2>Jouer</h2>
                        <p>{topic.questions.length} questions · {ROUNDS} par partie, 10 secondes chacune.
                            Plus tu réponds vite, plus tu marques ; la dernière compte double !</p>
                        <Link to={quizzPath(topic, "solo")} className="quizz-mode">
                            <FaUser aria-hidden/>
                            <span><strong>Solo</strong><small>Toi contre le chrono · record {soloBest} / {MAX_SCORE}</small></span>
                        </Link>
                        <QuizzDuelPanel topic={topic}/>
                    </div>
                </aside>
            </div>
        </main>
    );
}
