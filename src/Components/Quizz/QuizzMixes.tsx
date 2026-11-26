import {type CSSProperties} from "react";
import {Link} from "react-router-dom";
import {FaCrown, FaLayerGroup, FaSlidersH} from "react-icons/fa";
import {QUIZZ_CATEGORIES, type QuizzTopic} from "./topics/index.ts";
import {ALL_TOPICS_ID} from "./quizzMixes.ts";
import QuizzIcon from "./QuizzIcon.tsx";

/**
 * Premier groupe de la page Quizz : les mélanges de thèmes (quizzMixes.ts), avant les catégories.
 * - « Catégorie » : page /quizz/categorie, où l'on choisit la catégorie (QuizzMixSetup) ;
 * - « Toutes les catégories » : toutes les questions de tous les thèmes (/quizz/tout) ;
 * - « Partie custom » : page /quizz/custom, où l'on coche les thèmes à mélanger (QuizzMixSetup).
 */
export default function QuizzMixes({topics, count}: { topics: QuizzTopic[]; count: (topic: QuizzTopic) => number }) {
    const total = topics.reduce((n, t) => n + count(t), 0);
    const categories = QUIZZ_CATEGORIES.filter(c => topics.some(t => t.category === c.id)).length;

    return (
        <section className="quizz-category quizz-mixes">
            <h2>Mélanges</h2>
            <div className="quizz-topics">
                <Link to="/quizz/categorie" className="quizz-topic" style={{"--topic": "#2563eb"} as CSSProperties}>
                    <span className="quizz-topic-icon"><QuizzIcon icon={FaLayerGroup}/></span>
                    <span className="quizz-topic-body">
                        <strong>Catégorie</strong>
                        <span className="quizz-topic-text">Tous les thèmes d'une catégorie : cinéma, livres…</span>
                        <span className="quizz-topic-tag">{categories} catégories</span>
                    </span>
                </Link>
                <Link to={`/quizz/${ALL_TOPICS_ID}`} className="quizz-topic" style={{"--topic": "#facc15"} as CSSProperties}>
                    <span className="quizz-topic-icon"><QuizzIcon icon={FaCrown}/></span>
                    <span className="quizz-topic-body">
                        <strong>Toutes les catégories</strong>
                        <span className="quizz-topic-text">Le thème des thèmes : n'importe quelle question, de n'importe où</span>
                        <span className="quizz-topic-tag">{total} questions</span>
                    </span>
                </Link>
                <Link to="/quizz/custom" className="quizz-topic" style={{"--topic": "#db2777"} as CSSProperties}>
                    <span className="quizz-topic-icon"><QuizzIcon icon={FaSlidersH}/></span>
                    <span className="quizz-topic-body">
                        <strong>Partie custom</strong>
                        <span className="quizz-topic-text">Choisis les thèmes à mélanger</span>
                        <span className="quizz-topic-tag">{topics.length} thèmes</span>
                    </span>
                </Link>
            </div>
        </section>
    );
}
