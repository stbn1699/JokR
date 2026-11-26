import "./Quizz.scss";
import {type CSSProperties, useEffect, useState} from "react";
import {quizzService} from "../../Services/quizz.service.ts";
import {Link} from "react-router-dom";
import {FaPlus, FaSearch} from "react-icons/fa";
import {QUIZZ_CATEGORIES, type QuizzTopic} from "./topics/index.ts";
import {useQuizzTopics} from "./useQuizzTopics.ts";
import {useAuth} from "../../Context/authContext.ts";
import QuizzMixes from "./QuizzMixes.tsx";
import QuizzIcon from "./QuizzIcon.tsx";

/**
 * Onglet « Quizz » (/quizz) : les thèmes, rangés par catégorie (Cinéma, Jeux vidéo…), comme dans QuizUp.
 * Un clic sur un thème ouvre sa page (/quizz/<thème>) : règles, solo ou duel. En tête, les mélanges de thèmes
 * (QuizzMixes : une catégorie entière, toutes les catégories, partie custom), cachés pendant une recherche.
 * La recherche filtre sur le nom et la description du thème.
 * Nombre de questions : toutes celles validées en base (site et joueurs), lu sur le serveur.
 * Thèmes : ceux du site et ceux créés par les joueurs. « Créer un thème » mène à la liste de mes thèmes (/quizz/creer)
 * si j'en ai déjà enregistré un, sinon directement à l'éditeur d'un nouveau thème (/quizz/creer/nouveau).
 */

// minuscules sans accents : « Etoile » trouve « Étoile »
const normalize = (s: string) => s.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();

function TopicCard({topic, count}: { topic: QuizzTopic; count: number | undefined }) {
    return (
        <Link to={`/quizz/${topic.id}`} className="quizz-topic" style={{"--topic": topic.color} as CSSProperties}>
            <span className="quizz-topic-icon"><QuizzIcon icon={topic.icon}/></span>
            <span className="quizz-topic-body">
                <strong>{topic.name}</strong>
                <span className="quizz-topic-text">{topic.description}</span>
                {count !== undefined && <span className="quizz-topic-tag">{count} questions</span>}
            </span>
        </Link>
    );
}

export default function QuizzPage() {
    const [search, setSearch] = useState("");
    const allTopics = useQuizzTopics();
    const {isLoggedIn} = useAuth();
    // j'ai déjà au moins un thème (brouillon, soumis…) : le bouton mène à la liste pour le reprendre
    const [hasThemes, setHasThemes] = useState(false);

    useEffect(() => {
        if (!isLoggedIn) return;
        const controller = new AbortController();
        quizzService.myThemes(controller.signal).then(list => setHasThemes(list.length > 0)).catch(() => undefined);
        return () => controller.abort();
    }, [isLoggedIn]);
    // questions validées par thème (null : pas encore lu, ou serveur injoignable)
    const [counts, setCounts] = useState<Record<string, number> | null>(null);

    useEffect(() => {
        const controller = new AbortController();
        quizzService.approvedCounts(controller.signal).then(setCounts).catch(() => undefined);
        return () => controller.abort();
    }, []);
    const query = normalize(search.trim());
    const topics = allTopics.filter(t => !query || normalize(`${t.name} ${t.description}`).includes(query));

    return (
        <main className="quizz">
            {/* une seule ligne : titre, recherche, création (les règles sont sur la page de chaque thème) */}
            <header className="quizz-hero">
                <h1>Quizz</h1>
                <label className="quizz-search">
                    <FaSearch aria-hidden/>
                    <input type="search" value={search} onChange={e => setSearch(e.target.value)}
                           placeholder="Chercher un thème" aria-label="Chercher un thème"/>
                </label>
                <Link to={isLoggedIn && hasThemes ? "/quizz/creer" : "/quizz/creer/nouveau"} className="quizz-button quizz-create-link"><FaPlus aria-hidden/> Créer un thème</Link>
            </header>

            {!query && <QuizzMixes topics={allTopics} count={t => counts?.[t.id] ?? 0}/>}

            {QUIZZ_CATEGORIES.map(category => {
                const list = topics.filter(t => t.category === category.id);
                if (list.length === 0) return null;
                return (
                    <section key={category.id} className="quizz-category">
                        <h2>{category.label}</h2>
                        <div className="quizz-topics">
                            {list.map(t => <TopicCard key={t.id} topic={t} count={counts ? counts[t.id] ?? 0 : undefined}/>)}
                        </div>
                    </section>
                );
            })}
            {topics.length === 0 && <p className="quizz-empty">Aucun thème ne correspond à « {search.trim()} ».</p>}
        </main>
    );
}
