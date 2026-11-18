/**
 * Aperçus d'un fond de la boutique : maquettes du site (accueil, une grille, le profil) à faire défiler,
 * peintes avec le fond regardé. `background` est un fond CSS (dégradé, ou image sous son voile).
 */

import {type ReactNode, useRef, useState} from "react";
import {FaChevronLeft, FaChevronRight} from "react-icons/fa";
import {useAuth} from "../../Context/authContext.ts";
import {formatCredits} from "../../Services/credits.ts";
import Avatar from "../Avatar/Avatar.tsx";

const SLIDES = ["Accueil", "Une grille", "Ton profil"];

// Aperçus du fond, à faire défiler du doigt (ou avec les flèches)
// `background` : un fond CSS (dégradés, images, motifs) ; `backdrop` : un calque dessiné sous la maquette (fonds animés)
export function Previews({background = "none", backdrop}: { background?: string; backdrop?: ReactNode }) {
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
                {[<HomeMock key="accueil"/>, <GridMock key="grille"/>, <ProfileMock key="profil"/>].map(mock => (
                    <div key={mock.key} className="shop-preview" style={{background}}>
                        {backdrop && <div className="shop-preview-backdrop">{backdrop}</div>}
                        {mock}
                    </div>
                ))}
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
