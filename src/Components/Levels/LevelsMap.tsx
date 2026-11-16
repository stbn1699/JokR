/**
 * Carte des niveaux d'un puzzle (/niveaux/:gameCode), façon jeu d'aventure : un chemin sinueux qui descend, avec un
 * rond par niveau, découpé en mondes de WORLD niveaux (flèches pour passer de l'un à l'autre ; on arrive sur le monde
 * du niveau à jouer). Niveaux réussis en or (avec le meilleur temps), le prochain à jouer qui pulse, les suivants
 * verrouillés. Les premiers forment le tutoriel (chapeau de diplômé). En haut : progression et accès à la partie
 * libre (grille aléatoire). Joueur connecté : progression du serveur ; invité : celle de ce navigateur.
 */

import "./LevelsMap.scss";
import {type CSSProperties, useEffect, useMemo, useRef, useState} from "react";
import {Link, Navigate, useNavigate, useParams} from "react-router-dom";
import {FaArrowDown, FaCheck, FaChevronLeft, FaChevronRight, FaDice, FaGraduationCap, FaLock, FaStar} from "react-icons/fa";
import {useAuth} from "../../Context/authContext.ts";
import {formatDuration} from "../../Services/format.ts";
import {guestDone, LEVEL_GAMES, type LevelsOverview, levelsService} from "../../Services/levels.service.ts";
import {DAILY_GAME_NAMES} from "../../Services/dailyGames.ts";
import Loader from "../Loader/Loader.tsx";

// Géométrie du chemin (unités du SVG : 400 de large, STEP entre deux niveaux)
const WIDTH = 400;
const STEP = 150;
const TOP = 140;
const AMPLITUDE = 120;
// niveaux par monde
const WORLD = 50;
const xOf = (i: number) => WIDTH / 2 + AMPLITUDE * Math.sin(i * 1.15);
const yOf = (i: number) => TOP + i * STEP;

// Courbe douce qui passe par les points (Catmull-Rom → Bézier)
function smoothPath(points: [number, number][]): string {
    if (points.length === 0) return "";
    let d = `M${points[0]![0]} ${points[0]![1]}`;
    for (let i = 0; i < points.length - 1; i++) {
        const p0 = points[i - 1] ?? points[i]!, p1 = points[i]!, p2 = points[i + 1]!, p3 = points[i + 2] ?? p2;
        const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
        const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
        d += ` C${c1[0]!.toFixed(1)} ${c1[1]!.toFixed(1)} ${c2[0]!.toFixed(1)} ${c2[1]!.toFixed(1)} ${p2[0].toFixed(1)} ${p2[1].toFixed(1)}`;
    }
    return d;
}

export default function LevelsMap() {
    const {gameCode = ""} = useParams<{ gameCode: string }>();
    const code = gameCode.toUpperCase();
    const {isLoggedIn} = useAuth();
    const navigate = useNavigate();
    const [overview, setOverview] = useState<LevelsOverview | null>(null);
    const [error, setError] = useState<string | null>(null);
    const currentRef = useRef<HTMLButtonElement>(null);
    // monde affiché (null : celui du niveau à jouer)
    const [chosenWorld, setChosenWorld] = useState<number | null>(null);

    useEffect(() => {
        if (!LEVEL_GAMES.has(code)) return;
        const controller = new AbortController();
        levelsService.overview(code, controller.signal).then(setOverview)
            .catch((err: Error) => {
                if (err.name !== "AbortError") setError("Impossible de charger les niveaux.");
            });
        return () => controller.abort();
    }, [code, isLoggedIn]);

    // Invité : progression gardée dans ce navigateur
    const levels = useMemo(() => {
        if (!overview) return [];
        const local = isLoggedIn ? new Set<number>() : new Set(guestDone(code));
        return overview.levels.map(l => ({...l, done: l.done || local.has(l.level)}));
    }, [overview, isLoggedIn, code]);

    const doneCount = levels.filter(l => l.done).length;
    const current = levels.find((l, i) => !l.done && (i === 0 || levels[i - 1]!.done))?.level ?? null;

    const worlds = Math.max(1, Math.ceil(levels.length / WORLD));
    const world = chosenWorld ?? Math.floor(((current ?? levels.length) - 1) / WORLD);

    // On arrive sur la carte au niveau à jouer ; en changeant de monde, en haut du chemin
    useEffect(() => {
        if (chosenWorld === null && current !== null) currentRef.current?.scrollIntoView({block: "center", behavior: "smooth"});
    }, [current, chosenWorld]);

    if (!LEVEL_GAMES.has(code)) return <Navigate to={`/playgame/${code}`} replace/>;

    const name = DAILY_GAME_NAMES[code] ?? code;
    const tutorial = overview?.tutorial ?? 0;
    const count = levels.length;
    // niveaux de ce monde, et un rond de plus à la fin (monde suivant, ou « bientôt d'autres niveaux »)
    const first = world * WORLD;
    const shown = levels.slice(first, first + WORLD);
    const lastWorld = world >= worlds - 1;
    const points = Array.from({length: shown.length + 1}, (_, i) => [xOf(i), yOf(i)] as [number, number]);
    const height = yOf(shown.length) + TOP;
    const reachedHere = shown.filter(l => l.done).length;
    const reached = Math.min(shown.length - (lastWorld ? 1 : 0), reachedHere);
    const nextWorldOpen = !lastWorld && (levels[first + WORLD - 1]?.done ?? false);
    const goWorld = (w: number) => {
        setChosenWorld(w);
        window.scrollTo({top: 0, behavior: "smooth"});
    };

    return (
        <main className="levels-map">
            <header className="levels-head">
                <Link to="/" className="levels-back"><FaChevronLeft aria-hidden/> Puzzles</Link>
                <div className="levels-title">
                    <img src={`/gameIcons/${code}.svg`} alt="" aria-hidden/>
                    <div>
                        <h1>{name}</h1>
                        <p>Niveaux · {doneCount} / {count || "…"} réussis</p>
                    </div>
                </div>
                <div className="levels-progress" aria-hidden>
                    <span style={{width: count ? `${(doneCount / count) * 100}%` : 0}}/>
                </div>
                <button type="button" className="levels-free" onClick={() => navigate(`/playgame/${code}`)}>
                    <FaDice aria-hidden/> Grille aléatoire
                </button>
                {worlds > 1 && (
                    <nav className="levels-worlds" aria-label="Mondes">
                        <button type="button" disabled={world === 0} aria-label="Monde précédent" onClick={() => goWorld(world - 1)}>
                            <FaChevronLeft aria-hidden/>
                        </button>
                        <span>
                            <strong>Monde {world + 1}</strong> / {worlds}
                            <small>niveaux {first + 1} à {Math.min(count, first + WORLD)}</small>
                        </span>
                        <button type="button" disabled={lastWorld} aria-label="Monde suivant" onClick={() => goWorld(world + 1)}>
                            <FaChevronRight aria-hidden/>
                        </button>
                    </nav>
                )}
                {!isLoggedIn && (
                    <p className="levels-guest">
                        <Link to="/login">Connecte-toi</Link> pour garder ta progression partout et gagner de l'XP à chaque niveau.
                    </p>
                )}
            </header>

            {error ? <p className="levels-error" role="alert">{error}</p>
                : !overview ? <Loader label="Chargement des niveaux…"/>
                    : (
                        <div className="levels-trail" style={{"--h": `${height}px`} as CSSProperties}>
                            <svg viewBox={`0 0 ${WIDTH} ${height}`} preserveAspectRatio="none" aria-hidden>
                                <path className="levels-road" d={smoothPath(points)}/>
                                <path className="levels-road-dash" d={smoothPath(points)}/>
                                {reached > 0 && <path className="levels-road-done" d={smoothPath(points.slice(0, reached + 1))}/>}
                            </svg>

                            {world === 0 && tutorial > 0 && (
                                <span className="levels-chapter" style={{top: `${yOf(0) - 118}px`}}>
                                    <FaGraduationCap aria-hidden/> Tutoriel
                                </span>
                            )}
                            {world === 0 && tutorial > 0 && tutorial < count && (
                                <span className="levels-chapter" style={{top: `${yOf(tutorial - 1) + 72}px`}}>
                                    <FaStar aria-hidden/> Niveaux
                                </span>
                            )}

                            {shown.map((l, i) => {
                                const unlocked = l.done || l.level === current;
                                const state = l.done ? "done" : l.level === current ? "current" : "locked";
                                return (
                                    <div key={l.level} className={`levels-node ${state}`}
                                         style={{left: `${(xOf(i) / WIDTH) * 100}%`, top: `${yOf(i)}px`}}>
                                        <button type="button" ref={l.level === current ? currentRef : undefined}
                                                disabled={!unlocked}
                                                aria-label={`Niveau ${l.level}${l.done ? ", réussi" : unlocked ? ", à jouer" : ", verrouillé"}`}
                                                onClick={() => navigate(`/niveaux/${code}/${l.level}`)}>
                                            {state === "locked" ? <FaLock aria-hidden/> : <span className="levels-num">{l.level}</span>}
                                            {l.done && <span className="levels-check"><FaCheck aria-hidden/></span>}
                                            {l.level <= tutorial && <span className="levels-cap"><FaGraduationCap aria-hidden/></span>}
                                        </button>
                                        <span className="levels-label">
                                            {state === "current" ? "Jouer" : `${l.size}×${l.size}`}
                                            {l.bestMs !== null && <small>{formatDuration(l.bestMs)}</small>}
                                        </span>
                                    </div>
                                );
                            })}

                            {lastWorld ? (
                                <div className="levels-node soon" style={{left: `${(xOf(shown.length) / WIDTH) * 100}%`, top: `${yOf(shown.length)}px`}}>
                                    <span className="levels-soon">…</span>
                                    <span className="levels-label">Bientôt d'autres niveaux</span>
                                </div>
                            ) : (
                                <div className={`levels-node next-world ${nextWorldOpen ? "open" : ""}`}
                                     style={{left: `${(xOf(shown.length) / WIDTH) * 100}%`, top: `${yOf(shown.length)}px`}}>
                                    <button type="button" aria-label={`Monde ${world + 2}`} onClick={() => goWorld(world + 1)}>
                                        <FaArrowDown aria-hidden/>
                                    </button>
                                    <span className="levels-label">Monde {world + 2}</span>
                                </div>
                            )}
                        </div>
                    )}
        </main>
    );
}
