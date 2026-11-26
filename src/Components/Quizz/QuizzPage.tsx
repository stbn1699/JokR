import "./Quizz.scss";
import {type CSSProperties, useState} from "react";
import {Link} from "react-router-dom";
import {FaSearch} from "react-icons/fa";
import {QUIZZ_CATEGORIES, QUIZZ_TOPICS, type QuizzTopic} from "./topics/index.ts";
import {ROUNDS} from "./quizzMatch.ts";

/**
 * Onglet « Quizz » (/quizz) : les thèmes, rangés par catégorie (Cinéma, Jeux vidéo…), comme dans QuizUp.
 * Un clic sur un thème lance une partie de 7 questions contre un adversaire (/quizz/<thème>, voir QuizzMatch).
 * La recherche filtre sur le nom et la description du thème.
 */

// minuscules sans accents : « Etoile » trouve « Étoile »
const normalize = (s: string) => s.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();

function TopicCard({topic}: { topic: QuizzTopic }) {
    const Icon = topic.icon;
    return (
        <Link to={`/quizz/${topic.id}`} className="quizz-topic" style={{"--topic": topic.color} as CSSProperties}>
            <span className="quizz-topic-icon"><Icon aria-hidden/></span>
            <span className="quizz-topic-body">
                <strong>{topic.name}</strong>
                <span className="quizz-topic-text">{topic.description}</span>
                <span className="quizz-topic-tag">{topic.questions.length} questions</span>
            </span>
        </Link>
    );
}

export default function QuizzPage() {
    const [search, setSearch] = useState("");
    const query = normalize(search.trim());
    const topics = QUIZZ_TOPICS.filter(t => !query || normalize(`${t.name} ${t.description}`).includes(query));

    return (
        <main className="quizz">
            <header className="quizz-hero">
                <h1>Quizz</h1>
                <p>Choisis un thème et affronte un adversaire : {ROUNDS} questions, 10 secondes chacune.
                    Plus tu réponds vite, plus tu marques. La dernière question compte double !</p>
                <label className="quizz-search">
                    <FaSearch aria-hidden/>
                    <input type="search" value={search} onChange={e => setSearch(e.target.value)}
                           placeholder="Chercher un thème" aria-label="Chercher un thème"/>
                </label>
            </header>

            {QUIZZ_CATEGORIES.map(category => {
                const list = topics.filter(t => t.category === category.id);
                if (list.length === 0) return null;
                return (
                    <section key={category.id} className="quizz-category">
                        <h2>{category.label}</h2>
                        <div className="quizz-topics">
                            {list.map(t => <TopicCard key={t.id} topic={t}/>)}
                        </div>
                    </section>
                );
            })}
            {topics.length === 0 && <p className="quizz-empty">Aucun thème ne correspond à « {search.trim()} ».</p>}
        </main>
    );
}
