/**
 * Effets de victoire dans la boutique : une petite image fixe de chaque effet (vignettes de la boutique et de la page Personnaliser),
 * et l'aperçu de la fiche (une maquette « Grille terminée ! » et un bouton pour voir l'effet en vrai).
 */

import {FaPlay} from "react-icons/fa";
import {playVictoryEffect} from "../Confetti/VictoryEffects.ts";

const COLORS = ["#f43f5e", "#f59e0b", "#22c55e", "#3b82f6", "#a855f7", "#ec4899"];

// Étoile à cinq branches centrée en (x, y)
function star(x: number, y: number, r: number) {
    return Array.from({length: 10}, (_, i) => {
        const radius = i % 2 === 0 ? r : r * 0.42;
        const angle = -Math.PI / 2 + (i * Math.PI) / 5;
        return `${(x + radius * Math.cos(angle)).toFixed(1)},${(y + radius * Math.sin(angle)).toFixed(1)}`;
    }).join(" ");
}

function art(slug: string) {
    switch (slug) {
        case "confettis":
            return Array.from({length: 16}, (_, i) => (
                <rect key={i} x={8 + ((i * 37) % 80)} y={8 + ((i * 53) % 80)} width="6" height="9" rx="1"
                      fill={COLORS[i % COLORS.length]} transform={`rotate(${(i * 47) % 180} ${11 + ((i * 37) % 80)} ${12 + ((i * 53) % 80)})`}/>
            ));
        case "artifice":
            return [[34, 36, "#f59e0b"], [68, 52, "#ec4899"], [42, 70, "#3b82f6"]].map(([x, y, c], k) => (
                <g key={k} stroke={c as string} strokeWidth="2.4" strokeLinecap="round">
                    {Array.from({length: 12}, (_, i) => {
                        const a = (i / 12) * Math.PI * 2;
                        return <line key={i} x1={(x as number) + Math.cos(a) * 5} y1={(y as number) + Math.sin(a) * 5}
                                     x2={(x as number) + Math.cos(a) * 15} y2={(y as number) + Math.sin(a) * 15}/>;
                    })}
                </g>
            ));
        case "jetons":
            return [[30, 34, "#e11d48", -20], [64, 46, "#2563eb", 15], [40, 70, "#16a34a", 5]].map(([x, y, c, r], i) => (
                <g key={i} transform={`rotate(${r} ${x} ${y})`}>
                    <ellipse cx={x} cy={y} rx="17" ry="13" fill={c as string}/>
                    <ellipse cx={x} cy={y} rx="11" ry="8" fill="none" stroke="white" strokeWidth="2.5" strokeDasharray="4 3"/>
                </g>
            ));
        case "etoiles":
            return [[50, 50, 17], [24, 28, 9], [78, 26, 10], [22, 74, 8], [80, 76, 11]].map(([x, y, r], i) => (
                <polygon key={i} points={star(x!, y!, r!)} fill="#ffd54a"/>
            ));
        case "cartes":
            return [[30, 36, -18, "♠", "#1a1a1a"], [56, 48, 12, "♥", "#d62839"], [38, 68, -4, "♦", "#d62839"]].map(([x, y, r, s, c], i) => (
                <g key={i} transform={`rotate(${r} ${x} ${y})`}>
                    <rect x={(x as number) - 11} y={(y as number) - 15} width="22" height="30" rx="3" fill="#fdfcf7"/>
                    <text x={x as number} y={(y as number) + 6} fontSize="17" textAnchor="middle" fill={c as string}>{s}</text>
                </g>
            ));
        case "bulles":
            return [[34, 62, 15], [64, 40, 11], [58, 74, 8], [26, 30, 7], [80, 64, 6]].map(([x, y, r], i) => (
                <g key={i}>
                    <circle cx={x} cy={y} r={r} fill="rgba(173,216,255,0.25)" stroke="rgba(255,255,255,0.8)" strokeWidth="1.5"/>
                    <circle cx={x! - r! * 0.35} cy={y! - r! * 0.35} r={r! * 0.22} fill="white" fillOpacity="0.85"/>
                </g>
            ));
        default:
            return null;
    }
}

// Petite image fixe d'un effet (sur un fond nuit)
export function VictoryThumb({slug, className = ""}: { slug: string; className?: string }) {
    return (
        <svg className={`victory-thumb ${className}`} viewBox="0 0 100 100" preserveAspectRatio="xMidYMid slice" aria-hidden>
            <rect width="100" height="100" fill="#0b1224"/>
            {art(slug)}
        </svg>
    );
}

// Aperçu de la fiche : la fin d'une grille, et le bouton qui joue l'effet sur tout l'écran
export function VictoryPreview({id, slug}: { id: string; slug: string }) {
    return (
        <div className="victory-preview">
            <VictoryThumb slug={slug} className="victory-preview-art"/>
            <div className="victory-preview-card">
                <strong>Grille terminée !</strong>
                <button type="button" className="shop-button use" onClick={() => playVictoryEffect(id)}>
                    <FaPlay aria-hidden/> Voir l'effet
                </button>
            </div>
        </div>
    );
}
