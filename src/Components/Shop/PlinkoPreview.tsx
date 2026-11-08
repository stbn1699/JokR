/**
 * Aperçu d'une série de billes de Plinko (boutique) : un petit plateau avec ses clous et entre 4 et 15 billes
 * placées au hasard entre les clous, immobiles (elles ne tournent qu'en jeu, en roulant).
 * Les places sont tirées une fois ; `balls` donne les images : une seule (la couleur choisie) ou toute une série
 * (chaque bille prend une couleur au hasard).
 */

import {useState} from "react";
import {
    PLINKO_BALL_RADIUS,
    PLINKO_BOTTOM,
    PLINKO_MULTIPLIERS,
    PLINKO_PEG_RADIUS,
    PLINKO_PEGS,
    PLINKO_ROW_HEIGHT,
    PLINKO_ROWS,
    PLINKO_SLOTS,
    PLINKO_SPACING,
    PLINKO_WALLS,
    PLINKO_WIDTH,
    slotCenterX,
} from "../../../backend/src/utils/plinko.ts";

type PlinkoPreviewProps = {
    // images des billes
    balls: string[];
    className?: string;
};

type Spot = { x: number; y: number; pick: number };

const HEIGHT = PLINKO_BOTTOM + 40;

// Billes tirées au hasard entre les clous, sans se chevaucher
function randomSpots(): Spot[] {
    const count = 4 + Math.floor(Math.random() * 12);
    const spots: Spot[] = [];
    for (let tries = 0; spots.length < count && tries < 500; tries++) {
        const row = Math.floor(Math.random() * (PLINKO_ROWS - 1));
        const first = row * (row + 5) / 2;
        const gap = Math.floor(Math.random() * (row + 2));
        const a = PLINKO_PEGS[first + gap]!;
        const b = PLINKO_PEGS[first + gap + 1]!;
        const x = (a.x + b.x) / 2 + (Math.random() - 0.5) * 8;
        const y = a.y + PLINKO_ROW_HEIGHT / 2 + (Math.random() - 0.5) * 8;
        if (spots.some(s => (s.x - x) ** 2 + (s.y - y) ** 2 < (PLINKO_BALL_RADIUS * 2.4) ** 2)) continue;
        spots.push({x, y, pick: Math.random()});
    }
    return spots;
}

export default function PlinkoPreview({balls, className = ""}: PlinkoPreviewProps) {
    const [spots] = useState(randomSpots);
    const R = PLINKO_BALL_RADIUS * 1.15;

    return (
        <svg className={`plinko-preview ${className}`} viewBox={`0 0 ${PLINKO_WIDTH} ${HEIGHT}`} role="img" aria-label="Aperçu des billes sur le plateau">
            {PLINKO_WALLS.map(({a, b}, i) => <line key={i} x1={a.x} y1={a.y} x2={b.x} y2={b.y} className="pp-wall"/>)}
            {PLINKO_PEGS.map((p, i) => <circle key={i} cx={p.x} cy={p.y} r={PLINKO_PEG_RADIUS} className="pp-peg"/>)}
            {Array.from({length: PLINKO_SLOTS}, (_, slot) => (
                <rect key={slot} x={slotCenterX(slot) - PLINKO_SPACING / 2 + 3} y={PLINKO_BOTTOM + 14} width={PLINKO_SPACING - 6} height={18} rx={4}
                      className={`pp-slot ${PLINKO_MULTIPLIERS[slot]! >= 2 ? "hot" : ""}`}/>
            ))}
            {balls.length > 0 && spots.map((s, i) => (
                <image key={i} href={balls[Math.floor(s.pick * balls.length)]} x={s.x - R} y={s.y - R} width={R * 2} height={R * 2}/>
            ))}
        </svg>
    );
}
