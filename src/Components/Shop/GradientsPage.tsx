/**
 * Boutique › Fonds › Dégradés (/boutique/fonds/degrades) :
 * choix d'une des 20 couleurs, aperçus à faire défiler (accueil, une grille, le profil), achat et mise en place.
 * En dessous, les couleurs des paliers de niveau : gratuites, débloquées en atteignant le niveau du palier.
 */

import {formatCredits} from "../../Services/credits.ts";
import "./Shop.scss";
import {useEffect, useRef, useState} from "react";
import {Link} from "react-router-dom";
import {FaCheck, FaChevronLeft, FaChevronRight, FaCoins, FaLock} from "react-icons/fa";
import {useAuth} from "../../Context/authContext.ts";
import {ApiError} from "../../api/api.ts";
import {shopService} from "../../Services/shop.service.ts";
import {
    DEFAULT_BACKGROUND,
    findGradient,
    GRADIENT_PRICE,
    GRADIENTS,
    gradientCss,
    TIER_GRADIENTS,
} from "../../Services/shopCatalog.ts";
import Avatar from "../Avatar/Avatar.tsx";

export default function GradientsPage() {
    const auth = useAuth();
    const [owned, setOwned] = useState<string[]>([]);
    // couleur regardée (null : fond par défaut) ; au départ, le fond porté
    const [selected, setSelected] = useState<string | null>(auth.background ?? GRADIENTS[0].id);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Session chargée après la page (rechargement) : on se place sur le fond porté
    const [worn, setWorn] = useState(auth.background);
    if (worn !== auth.background) {
        setWorn(auth.background);
        setSelected(auth.background);
    }

    useEffect(() => {
        if (!auth.isLoggedIn) return;
        const controller = new AbortController();
        shopService.state(controller.signal).then(s => setOwned(s.owned)).catch(() => undefined);
        return () => controller.abort();
    }, [auth.isLoggedIn]);

    const gradient = findGradient(selected) ?? DEFAULT_BACKGROUND;
    // couleur de palier : débloquée par le niveau, jamais achetée
    const tierLevel = TIER_GRADIENTS.find(t => t.id === selected)?.minLevel;
    const isOwned = selected === null || owned.includes(selected) || (tierLevel !== undefined && auth.level >= tierLevel);
    const isWorn = selected === auth.background;
    const canAfford = auth.credits >= GRADIENT_PRICE;

    async function run(action: () => Promise<void>) {
        setBusy(true);
        setError(null);
        try {
            await action();
        } catch (err) {
            setError(err instanceof ApiError ? err.message : "Une erreur est survenue, réessaie.");
        } finally {
            setBusy(false);
        }
    }

    const buy = () => run(async () => {
        if (!selected) return;
        const credits = await shopService.buy(selected);
        auth.setCredits(credits);
        setOwned(o => [...o, selected]);
    });

    const wear = () => run(async () => {
        await shopService.setBackground(selected);
        auth.setBackground(selected);
    });

    return (
        <main className="shop">
            <section className="shop-card">
                <Link to="/boutique" className="shop-back"><FaChevronLeft aria-hidden/> Boutique</Link>
                <div className="shop-head">
                    <h1>Dégradés</h1>
                    {auth.isLoggedIn && <span className="shop-credits"><FaCoins aria-hidden/> {formatCredits(auth.credits)}</span>}
                </div>

                <Previews background={gradientCss(gradient)}/>

                <div className="shop-choice">
                    <strong>{gradient.name}</strong>
                    {selected !== null && (isOwned
                        ? <span className="shop-tag owned">{isWorn ? "Utilisé" : tierLevel !== undefined ? "Débloqué" : "Possédé"}</span>
                        : tierLevel !== undefined ? <span className="shop-tag"><FaLock aria-hidden/> Niveau {tierLevel}</span>
                        : <span className="shop-tag"><FaCoins aria-hidden/> {GRADIENT_PRICE}</span>)}
                </div>

                <div className="shop-actions">
                    {!auth.isLoggedIn ? (
                        <Link to="/login" className="shop-button">Connecte-toi pour acheter</Link>
                    ) : !isOwned && tierLevel !== undefined ? (
                        <button type="button" className="shop-button" disabled><FaLock aria-hidden/> Se débloque au niveau {tierLevel}</button>
                    ) : !isOwned ? (
                        <button type="button" className="shop-button buy" disabled={busy || !canAfford} onClick={buy}>
                            {canAfford ? <>Acheter · <FaCoins aria-hidden/> {GRADIENT_PRICE}</> : `Il te manque ${GRADIENT_PRICE - auth.credits} crédit${GRADIENT_PRICE - auth.credits > 1 ? "s" : ""}`}
                        </button>
                    ) : isWorn ? (
                        <button type="button" className="shop-button" disabled><FaCheck aria-hidden/> Fond actuel</button>
                    ) : (
                        <button type="button" className="shop-button wear" disabled={busy} onClick={wear}>Utiliser ce fond</button>
                    )}
                </div>
                {error && <p className="shop-error" role="alert">{error}</p>}

                <div className="shop-swatches" role="listbox" aria-label="Couleurs">
                    {[DEFAULT_BACKGROUND, ...GRADIENTS].map(gr => {
                        const id = gr === DEFAULT_BACKGROUND ? null : gr.id;
                        return (
                            <button key={gr.id} type="button" role="option" aria-selected={selected === id} title={gr.name}
                                    className={`shop-swatch ${selected === id ? "selected" : ""}`} onClick={() => setSelected(id)}>
                                <span className="shop-swatch-color" style={{background: gradientCss(gr)}}>
                                    {id === auth.background && <FaCheck aria-label="Utilisé"/>}
                                </span>
                                <span className="shop-swatch-name">{gr.name}</span>
                                {id !== null && !owned.includes(id) && <span className="shop-swatch-price"><FaCoins aria-hidden/> {GRADIENT_PRICE}</span>}
                            </button>
                        );
                    })}
                </div>

                <h2 className="shop-tiers-title">Couleurs de niveau</h2>
                <p className="shop-sub">Gratuites : chaque palier de ton contour de profil débloque son dégradé.</p>
                <div className="shop-swatches tiers" role="listbox" aria-label="Couleurs de niveau">
                    {TIER_GRADIENTS.map(gr => {
                        const locked = auth.level < gr.minLevel;
                        return (
                            <button key={gr.id} type="button" role="option" aria-selected={selected === gr.id} title={gr.name}
                                    className={`shop-swatch ${selected === gr.id ? "selected" : ""} ${locked ? "locked" : ""}`}
                                    onClick={() => setSelected(gr.id)}>
                                <span className="shop-swatch-color" style={{background: gradientCss(gr)}}>
                                    {gr.id === auth.background ? <FaCheck aria-label="Utilisé"/> : locked && <FaLock aria-label="Verrouillé"/>}
                                </span>
                                <span className="shop-swatch-name">{gr.name}</span>
                                <span className={`shop-swatch-price ${locked ? "" : "free"}`}>{locked ? `Niveau ${gr.minLevel}` : "Débloqué"}</span>
                            </button>
                        );
                    })}
                </div>
            </section>
        </main>
    );
}

const SLIDES = ["Accueil", "Une grille", "Ton profil"];

// Aperçus du fond, à faire défiler du doigt (ou avec les flèches)
// (aussi utilisé par la page des fonds en images : `background` est un fond CSS)
export function Previews({background}: { background: string }) {
    const track = useRef<HTMLDivElement>(null);
    const [slide, setSlide] = useState(0);

    const goTo = (index: number) => {
        const el = track.current;
        if (el) el.scrollTo({left: index * el.clientWidth, behavior: "smooth"});
    };

    return (
        <div className="shop-previews">
            <div className="shop-previews-track" ref={track}
                 onScroll={e => setSlide(Math.round(e.currentTarget.scrollLeft / e.currentTarget.clientWidth))}>
                <div className="shop-preview" style={{background}}><HomeMock/></div>
                <div className="shop-preview" style={{background}}><GridMock/></div>
                <div className="shop-preview" style={{background}}><ProfileMock/></div>
            </div>
            <button type="button" className="shop-arrow left" aria-label="Aperçu précédent" disabled={slide === 0} onClick={() => goTo(slide - 1)}><FaChevronLeft/></button>
            <button type="button" className="shop-arrow right" aria-label="Aperçu suivant" disabled={slide === SLIDES.length - 1} onClick={() => goTo(slide + 1)}><FaChevronRight/></button>
            <div className="shop-dots">
                {SLIDES.map((label, i) => (
                    <button key={label} type="button" className={i === slide ? "active" : ""} onClick={() => goTo(i)} aria-label={label}/>
                ))}
                <span>{SLIDES[slide]}</span>
            </div>
        </div>
    );
}

const MOCK_GAMES = ["Sudoku", "Queens", "Binero", "Galaxies", "Rikudo", "Tectonic"];

function MockHeader() {
    return (
        <div className="mock-header">
            <b>JokR</b>
            <span>Daily</span><span>Puzzle</span><span>Classement</span>
            <i/>
        </div>
    );
}

function HomeMock() {
    return (
        <div className="mock">
            <MockHeader/>
            <div className="mock-games">
                {MOCK_GAMES.map(name => <div key={name} className="mock-game"><span/>{name}</div>)}
            </div>
        </div>
    );
}

// Une petite grille tirée au hasard à l'ouverture de la page : sudoku, queens ou binero
const GRID_KINDS = ["sudoku", "queens", "binero"] as const;
const QUEENS_COLORS = ["#f87171", "#fbbf24", "#34d399", "#60a5fa", "#a78bfa", "#f472b6"];

function GridMock() {
    const [kind] = useState(() => GRID_KINDS[Math.floor(Math.random() * GRID_KINDS.length)]);
    const [seed] = useState(() => Array.from({length: 81}, () => Math.random()));
    const size = kind === "sudoku" ? 9 : 6;

    return (
        <div className="mock">
            <MockHeader/>
            <div className={`mock-grid ${kind}`} style={{gridTemplateColumns: `repeat(${size}, 1fr)`}}>
                {Array.from({length: size * size}, (_, i) => {
                    const r = seed[i];
                    if (kind === "sudoku") return <span key={i}>{r < 0.45 ? 1 + Math.floor(r * 20) % 9 : ""}</span>;
                    if (kind === "binero") return <span key={i}>{r < 0.5 ? (r < 0.25 ? 0 : 1) : ""}</span>;
                    // queens : zones de couleur par bandes, quelques reines
                    const color = QUEENS_COLORS[(Math.floor(i / size / 2) * 2 + Math.floor((i % size) / 3)) % QUEENS_COLORS.length];
                    return <span key={i} style={{background: color}}>{r < 0.1 ? "♛" : ""}</span>;
                })}
            </div>
        </div>
    );
}

function ProfileMock() {
    const auth = useAuth();
    const name = auth.username ?? "Joueur·euse";
    return (
        <div className="mock">
            <MockHeader/>
            <div className="mock-profile">
                <Avatar seed={auth.avatar} fallback={name} size={3.2} level={auth.isLoggedIn ? auth.level : undefined}/>
                <strong>{name}</strong>
                <small>Niveau {auth.level}</small>
                <div className="mock-stats">
                    <span><b>{formatCredits(auth.credits)}</b>crédits</span>
                    <span><b>{auth.level}</b>niveau</span>
                    <span><b>{auth.xp}</b>XP</span>
                </div>
            </div>
        </div>
    );
}
