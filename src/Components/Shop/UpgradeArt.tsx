/**
 * Dessins des améliorations de la boutique : l'icône de chacune (vignettes, rubriques), et les aperçus qui montrent
 * un niveau (les rouleaux pour les colonnes, les lignes de gain tracées sur une machine 5 × 3 pour les lignes).
 */

import type {ReactNode} from "react";
import {FaBullseye, FaCoins, FaFire, FaLayerGroup, FaPercent, FaRedoAlt, FaSyncAlt, FaThLarge, FaTicketAlt} from "react-icons/fa";
import type {UpgradeGame} from "../../../backend/src/utils/upgrades.ts";
import {SLOT_PATTERNS, SLOT_ROWS} from "../../../backend/src/utils/slots.ts";
import {LINE_COLORS} from "../Hasard/Slots/slotColors.ts";
import {Reels} from "./ShopArt.tsx";

const ICONS: Record<string, ReactNode> = {
    "slots-auto": <FaRedoAlt/>,
    "plinko-risk": <FaFire/>,
    "plinko-balls": <FaBullseye/>,
    "keno-picks": <FaThLarge/>,
    "roulette-case": <FaCoins/>,
    "roulette-total": <FaLayerGroup/>,
    "lottery-ticket": <FaTicketAlt/>,
    "wheel-spins": <FaSyncAlt/>,
    "shop-discount": <FaPercent/>,
};

// Lignes de gain : les `lines` premiers tracés (comme dans le jeu), sur 5 rouleaux de 3 cases
const CELL = 20;
function Paylines({lines, big}: { lines: number; big: boolean }) {
    const reels = 5;
    const center = (i: number) => i * CELL + CELL / 2;
    return (
        <svg className={`upgrade-paylines ${big ? "big" : ""}`} viewBox={`-3 -3 ${reels * CELL + 6} ${SLOT_ROWS * CELL + 6}`} aria-hidden>
            <rect x="-3" y="-3" width={reels * CELL + 6} height={SLOT_ROWS * CELL + 6} rx="5" className="frame"/>
            {Array.from({length: reels}, (_, r) => (
                <rect key={r} x={r * CELL + 1.5} y="0" width={CELL - 3} height={SLOT_ROWS * CELL} rx="2.5" className="reel"/>
            ))}
            {SLOT_PATTERNS.slice(0, lines).map((rows, i) => (
                <polyline key={i} points={rows.map((row, r) => `${center(r)},${center(row)}`).join(" ")}
                          stroke={LINE_COLORS[i % LINE_COLORS.length]} strokeWidth={big ? 2.2 : 3} fill="none"
                          strokeLinecap="round" strokeLinejoin="round"/>
            ))}
        </svg>
    );
}

/*
 * Icône d'une amélioration. value : la valeur à montrer (nombre de colonnes, de lignes) pour celles qui se dessinent ;
 * big : grand aperçu de la fiche (les rouleaux avec leurs symboles).
 */
export function UpgradeIcon({id, value, big = false}: { id: string; value?: number; big?: boolean }) {
    if (id === "slots-reels") return <span className="shop-art-icon upgrade-icon"><Reels columns={value ?? 4} mini={!big}/></span>;
    if (id === "slots-lines") return <span className="shop-art-icon upgrade-icon"><Paylines lines={value ?? 3} big={big}/></span>;
    return <span className="shop-art-icon upgrade-icon">{ICONS[id]}</span>;
}

// Icône d'une rubrique (son jeu)
export function GameIcon({game}: { game: UpgradeGame }) {
    const first: Record<UpgradeGame, string> = {
        slots: "slots-reels", plinko: "plinko-balls", keno: "keno-picks", roulette: "roulette-case",
        lottery: "lottery-ticket", wheel: "wheel-spins", shop: "shop-discount",
    };
    return <UpgradeIcon id={first[game]} value={3}/>;
}
