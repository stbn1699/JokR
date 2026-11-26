import "./Quizz.scss";
import {type CSSProperties, type ReactNode, useEffect, useState} from "react";
import {Link, useNavigate, useSearchParams} from "react-router-dom";
import {FaArrowLeft, FaCheck} from "react-icons/fa";
import {quizzService} from "../../Services/quizz.service.ts";
import Loader from "../Loader/Loader.tsx";
import {QUIZZ_CATEGORIES, type QuizzTopic} from "./topics/index.ts";
import {useLoadedQuizzTopics} from "./useQuizzTopics.ts";
import {categoryMixId, customMixId} from "./quizzMixes.ts";
import QuizzIcon from "./QuizzIcon.tsx";

/**
 * Pages de réglage des mélanges de thèmes (cartes « Catégorie » et « Partie custom » de la page Quizz) :
 * - /quizz/categorie : choisir une catégorie → /quizz/categorie-<catégorie> (toutes les questions de ses thèmes) ;
 * - /quizz/custom : cocher les thèmes à mélanger (deux au moins) → /quizz/mix-…?themes=a,b,c. Arrivé avec
 *   ?themes= (lien « Modifier le mélange » d'une partie custom), les thèmes sont déjà cochés.
 * Nombre de questions : celles du site plus celles validées sur le serveur.
 */

const CUSTOM_MIN = 2;

// Thèmes par catégorie (catégories sans thème retirées) et nombre de questions de chaque thème
function useTopicsByCategory() {
    const topics = useLoadedQuizzTopics();
    const [counts, setCounts] = useState<Record<string, number>>({});
    useEffect(() => {
        const controller = new AbortController();
        quizzService.approvedCounts(controller.signal).then(setCounts).catch(() => undefined);
        return () => controller.abort();
    }, []);
    const count = (t: QuizzTopic) => counts[t.id] ?? 0;
    const categories = topics && QUIZZ_CATEGORIES
        .map(c => ({...c, topics: topics.filter(t => t.category === c.id)}))
        .filter(c => c.topics.length > 0);
    return {topics, categories, count};
}

function Page({title, intro, color, children}: { title: string; intro: string; color: string; children: ReactNode }) {
    return (
        <main className="quizz quizz-setup" style={{"--topic": color} as CSSProperties}>
            <div className="quizz-category">
                <Link to="/quizz" className="quizz-back"><FaArrowLeft aria-hidden/> Tous les thèmes</Link>
                <h1>{title}</h1>
                <p className="quizz-setup-intro">{intro}</p>
            </div>
            {children}
        </main>
    );
}

export function QuizzCategoryPick() {
    const {categories, count} = useTopicsByCategory();
    if (!categories) return <Loader/>;
    return (
        <Page title="Catégorie" color="#2563eb" intro="Choisis une catégorie : la partie pioche dans toutes les questions de ses thèmes.">
            <section className="quizz-category">
                <div className="quizz-topics">
                    {categories.map(c => {
                        return (
                            <Link key={c.id} to={`/quizz/${categoryMixId(c.id)}`} className="quizz-topic"
                                  style={{"--topic": c.topics[0]!.color} as CSSProperties}>
                                <span className="quizz-topic-icon"><QuizzIcon icon={c.icon}/></span>
                                <span className="quizz-topic-body">
                                    <strong>{c.label}</strong>
                                    <span className="quizz-topic-text">{c.topics.map(t => t.name).join(", ")}</span>
                                    <span className="quizz-topic-tag">
                                        {c.topics.length} thème{c.topics.length > 1 ? "s" : ""} · {c.topics.reduce((n, t) => n + count(t), 0)} questions
                                    </span>
                                </span>
                            </Link>
                        );
                    })}
                </div>
            </section>
        </Page>
    );
}

export function QuizzCustomPick() {
    const navigate = useNavigate();
    const {topics, categories, count} = useTopicsByCategory();
    const initial = useSearchParams()[0].get("themes");
    const [chosen, setChosen] = useState<string[]>(() => initial?.split(",").filter(Boolean) ?? []);
    if (!topics || !categories) return <Loader/>;

    const picked = topics.filter(t => chosen.includes(t.id));
    const toggle = (id: string) => setChosen(list => (list.includes(id) ? list.filter(x => x !== id) : [...list, id]));
    const play = () => {
        const ids = picked.map(t => t.id);
        navigate(`/quizz/${customMixId(ids)}?themes=${ids.join(",")}`);
    };

    return (
        <Page title="Partie custom" color="#db2777" intro="Coche les thèmes à mélanger : la partie pioche dans toutes leurs questions.">
            <section className="quizz-category quizz-mix-panel custom">
                {categories.map(c => (
                    <fieldset key={c.id}>
                        <legend>{c.label}</legend>
                        {c.topics.map(t => (
                            <label key={t.id} className={`quizz-chip ${chosen.includes(t.id) ? "chosen" : ""}`}
                                   style={{"--topic": t.color} as CSSProperties}>
                                <input type="checkbox" checked={chosen.includes(t.id)} onChange={() => toggle(t.id)}/>
                                {chosen.includes(t.id) && <FaCheck aria-hidden/>} {t.name}
                                <small>{count(t)}</small>
                            </label>
                        ))}
                    </fieldset>
                ))}
                <div className="quizz-mix-actions">
                    <button type="button" className="quizz-button primary" disabled={picked.length < CUSTOM_MIN} onClick={play}>
                        {picked.length < CUSTOM_MIN ? `Choisis au moins ${CUSTOM_MIN} thèmes`
                            : `Mélanger ${picked.length} thèmes · ${picked.reduce((n, t) => n + count(t), 0)} questions`}
                    </button>
                    {chosen.length > 0 && <button type="button" className="quizz-button" onClick={() => setChosen([])}>Tout décocher</button>}
                    <button type="button" className="quizz-button" onClick={() => setChosen(topics.map(t => t.id))}>Tout cocher</button>
                </div>
            </section>
        </Page>
    );
}
