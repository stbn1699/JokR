/**
 * Page des succès (/succes) : tous les succès du site, rangés par catégorie puis par jeu ou famille.
 * En haut : combien sont débloqués, les jetons qu'ils ont rapportés et le compte par palier.
 * Chaque carte montre son palier, sa récompense, et selon le cas la date du déblocage, une barre d'avancement
 * (compteurs) ou le meilleur résultat (places, temps). Un succès secret reste caché tant qu'il n'est pas débloqué.
 */

import "./Achievements.scss";
import {useEffect, useMemo, useState} from "react";
import {Link} from "react-router-dom";
import {FaLock, FaSearch, FaTrophy} from "react-icons/fa";
import {useAuth} from "../../Context/authContext.ts";
import {type AchievementsOverview, achievementsService} from "../../Services/achievements.service.ts";
import {
    type Achievement,
    ACHIEVEMENT_CATEGORIES,
    ACHIEVEMENT_REWARDS,
    ACHIEVEMENT_TIER_NAMES,
    type AchievementCategory,
    achievementProgress,
    ACHIEVEMENTS,
    type AchievementTier,
} from "../../../backend/src/utils/achievements.ts";
import {formatCredits, fullCredits} from "../../Services/credits.ts";
import {formatDuration} from "../../Services/format.ts";
import Loader from "../Loader/Loader.tsx";

type Status = "all" | "unlocked" | "locked";
const TIERS: AchievementTier[] = [1, 2, 3, 4, 5];

const fmt = (n: number) => n.toLocaleString("fr-FR");
// récompense : en entier jusqu'à 9 999 (« 2 500 »), puis court (« 10k »)
const rewardText = (n: number) => (n >= 10_000 ? formatCredits(n) : fmt(n));
const dateFormat = new Intl.DateTimeFormat("fr-FR", {day: "numeric", month: "long", year: "numeric"});

// Meilleur résultat d'un succès sans barre (place, temps), quand le joueur en a un
function bestResult(a: Achievement, value: number | undefined): string | null {
    if (value === undefined || a.secret) return null;
    if (a.stat.startsWith("daily.best.")) return `Meilleure place : ${value === 1 ? "1re" : `${fmt(value)}e`}`;
    if (a.stat.startsWith("daily.fastest.")) return `Meilleur temps : ${formatDuration(value)}`;
    return null;
}

export default function AchievementsPage() {
    const {isLoggedIn} = useAuth();
    const [data, setData] = useState<AchievementsOverview | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [category, setCategory] = useState<AchievementCategory | "all">("all");
    const [status, setStatus] = useState<Status>("all");
    const [query, setQuery] = useState("");

    useEffect(() => {
        if (!isLoggedIn) return;
        let cancelled = false;
        achievementsService.overview()
            .then(d => !cancelled && setData(d))
            .catch(e => !cancelled && setError(e instanceof Error ? e.message : "Impossible de charger les succès"));
        return () => {
            cancelled = true;
        };
    }, [isLoggedIn]);

    const unlocked = useMemo(() => new Map((data?.unlocked ?? []).map(u => [u.id, u])), [data]);

    const summary = useMemo(() => {
        const byTier = Object.fromEntries(TIERS.map(t => [t, {done: 0, total: 0}])) as Record<AchievementTier, { done: number; total: number }>;
        for (const a of ACHIEVEMENTS) {
            byTier[a.tier].total++;
            if (unlocked.has(a.id)) byTier[a.tier].done++;
        }
        const earned = [...unlocked.values()].reduce((n, u) => n + u.reward, 0);
        return {byTier, earned, done: unlocked.size};
    }, [unlocked]);

    const counts = useMemo(() => {
        const map = new Map<string, { done: number; total: number }>();
        for (const a of ACHIEVEMENTS) {
            const c = map.get(a.category) ?? {done: 0, total: 0};
            c.total++;
            if (unlocked.has(a.id)) c.done++;
            map.set(a.category, c);
        }
        return map;
    }, [unlocked]);

    // catégories → groupes → succès, avec les filtres
    const sections = useMemo(() => {
        const q = query.trim().toLocaleLowerCase("fr-FR");
        return ACHIEVEMENT_CATEGORIES
            .filter(c => category === "all" || c.id === category)
            .map(c => {
                const groups = new Map<string, Achievement[]>();
                for (const a of ACHIEVEMENTS) {
                    if (a.category !== c.id) continue;
                    const done = unlocked.has(a.id);
                    if (status === "unlocked" && !done) continue;
                    if (status === "locked" && done) continue;
                    // un secret pas débloqué ne se trouve pas en cherchant son nom
                    if (q && (a.secret && !done || !`${a.name} ${a.description}`.toLocaleLowerCase("fr-FR").includes(q))) continue;
                    const g = a.group ?? "";
                    groups.set(g, [...groups.get(g) ?? [], a]);
                }
                return {category: c, groups: [...groups]};
            })
            .filter(s => s.groups.length > 0);
    }, [category, status, query, unlocked]);

    if (!isLoggedIn) {
        return (
            <main className="achievements-page">
                <section className="ach-empty">
                    <FaTrophy aria-hidden/>
                    <h1>Succès</h1>
                    <p>Connecte-toi pour débloquer des succès et gagner des jetons.</p>
                    <Link to="/login" className="ach-button">Se connecter</Link>
                </section>
            </main>
        );
    }
    if (error) return <main className="achievements-page"><p className="ach-error">{error}</p></main>;
    if (!data) return <main className="achievements-page"><Loader/></main>;

    const percent = Math.round(summary.done / ACHIEVEMENTS.length * 100);

    return (
        <main className="achievements-page">
            <header className="ach-hero">
                <div className="ach-hero-title">
                    <h1>Succès</h1>
                    <p>{fmt(ACHIEVEMENTS.length)} succès à débloquer, chacun rapporte des jetons selon sa difficulté.</p>
                </div>
                <div className="ach-hero-stats">
                    <div className="ach-total">
                        <span className="ach-total-count"><strong>{fmt(summary.done)}</strong> / {fmt(ACHIEVEMENTS.length)}</span>
                        <span className="ach-bar" aria-hidden><span style={{width: `${percent}%`}}/></span>
                        <span className="ach-total-sub">{percent} % · {fullCredits(summary.earned)} jetons gagnés</span>
                    </div>
                    <ul className="ach-tiers">
                        {TIERS.map(t => (
                            <li key={t} className={`tier-${t}`} title={`${ACHIEVEMENT_TIER_NAMES[t]} : ${fmt(ACHIEVEMENT_REWARDS[t])} jetons chacun`}>
                                <span className="ach-tier-dot" aria-hidden/>
                                <span className="ach-tier-name">{ACHIEVEMENT_TIER_NAMES[t]}</span>
                                <span className="ach-tier-count">{summary.byTier[t].done}/{summary.byTier[t].total}</span>
                                <span className="ach-tier-reward">+{rewardText(ACHIEVEMENT_REWARDS[t])}</span>
                            </li>
                        ))}
                    </ul>
                </div>
            </header>

            <div className="ach-layout">
                <nav className="ach-nav" aria-label="Catégories">
                    <button type="button" className={category === "all" ? "active" : ""} onClick={() => setCategory("all")}>
                        <span>Tous</span><span className="ach-nav-count">{summary.done}/{ACHIEVEMENTS.length}</span>
                    </button>
                    {ACHIEVEMENT_CATEGORIES.map(c => {
                        const n = counts.get(c.id)!;
                        return (
                            <button key={c.id} type="button" className={category === c.id ? "active" : ""} onClick={() => setCategory(c.id)}>
                                <span>{c.name}</span><span className="ach-nav-count">{n.done}/{n.total}</span>
                                <span className="ach-nav-bar" aria-hidden><span style={{width: `${n.done / n.total * 100}%`}}/></span>
                            </button>
                        );
                    })}
                </nav>

                <div className="ach-content">
                    <div className="ach-toolbar">
                        <div className="ach-status" role="radiogroup" aria-label="Afficher">
                            {([["all", "Tous"], ["unlocked", "Débloqués"], ["locked", "À débloquer"]] as const).map(([id, label]) => (
                                <button key={id} type="button" role="radio" aria-checked={status === id}
                                        className={status === id ? "active" : ""} onClick={() => setStatus(id)}>{label}</button>
                            ))}
                        </div>
                        <label className="ach-search">
                            <FaSearch aria-hidden/>
                            <input type="search" placeholder="Chercher un succès" value={query} onChange={e => setQuery(e.target.value)}/>
                        </label>
                    </div>

                    {sections.length === 0 && <p className="ach-none">Aucun succès ne correspond.</p>}

                    {sections.map(({category: c, groups}) => (
                        <section key={c.id} className="ach-section">
                            {category === "all" && <h2>{c.name}</h2>}
                            {groups.map(([group, list]) => (
                                <div key={group} className="ach-group">
                                    {group && <h3>{group}</h3>}
                                    <div className="ach-grid">
                                        {list.map(a => <AchievementCard key={a.id} a={a} unlockedAt={unlocked.get(a.id)?.unlockedAt} value={data.stats[a.stat]}/>)}
                                    </div>
                                </div>
                            ))}
                        </section>
                    ))}
                </div>
            </div>
        </main>
    );
}

function AchievementCard({a, unlockedAt, value}: { a: Achievement; unlockedAt: string | undefined; value: number | undefined }) {
    const done = unlockedAt !== undefined;
    const hidden = a.secret && !done;
    const progress = done ? null : achievementProgress(a, value);
    const best = done ? null : bestResult(a, value);

    return (
        <article className={`ach-card tier-${a.tier} ${done ? "done" : "locked"} ${hidden ? "secret" : ""}`}>
            <div className="ach-card-badge" aria-hidden>{hidden ? <FaLock/> : <FaTrophy/>}</div>
            <div className="ach-card-body">
                <div className="ach-card-head">
                    <h4>{hidden ? "Succès secret" : a.name}</h4>
                    <span className="ach-card-reward" title={`${ACHIEVEMENT_TIER_NAMES[a.tier]} : ${fmt(ACHIEVEMENT_REWARDS[a.tier])} jetons`}>
                        +{rewardText(ACHIEVEMENT_REWARDS[a.tier])}
                    </span>
                </div>
                <p>{hidden ? "Continue de jouer pour le découvrir." : a.description}</p>
                {done && <span className="ach-card-date">Débloqué le {dateFormat.format(new Date(unlockedAt))}</span>}
                {progress !== null && (
                    <span className="ach-card-progress">
                        <span className="ach-bar" aria-hidden><span style={{width: `${progress * 100}%`}}/></span>
                        <span>{fmt(Math.min(value ?? 0, a.target))} / {fmt(a.target)}</span>
                    </span>
                )}
                {best && <span className="ach-card-best">{best}</span>}
            </div>
        </article>
    );
}
