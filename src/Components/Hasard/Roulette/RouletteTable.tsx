/**
 * Tapis de la roulette : zéro, numéros, colonnes « 2:1 », douzaines et chances simples. Un clic pose le jeton
 * choisi ; les jetons posés s'affichent sur leur case, les mises gagnantes s'allument après le lancer.
 *
 * Mises à cheval et en carré : près du bord d'un numéro, le jeton se pose à cheval sur lui et son voisin ;
 * près d'un coin, en carré sur les quatre numéros. Au survol, un rond gris montre où le jeton sera posé et
 * les numéros couverts ressortent (les autres s'effacent) ; c'est aussi le cas pour couleur, pair, douzaine…
 *
 * Deux dispositions, choisies en CSS (Roulette.scss) :
 * - à l'horizontale (ordinateur) : 3 lignes × 12 colonnes de numéros, le zéro à gauche
 * - à la verticale (téléphone) : le zéro en haut, 12 lignes × 3 colonnes, douzaines et chances simples à gauche
 * Chaque case porte sa place dans les deux (variables --hr/--hc et --vr/--vc).
 */

import {type CSSProperties, type MouseEvent, useState, useSyncExternalStore} from "react";
import {rouletteRule} from "../../../../backend/src/utils/roulette.ts";
import {anchorOf, CELLS, type Dir, markerStyle, numberOf, targetAt} from "./rouletteLayout.ts";
import ChipStack from "./ChipStack.tsx";

type RouletteTableProps = {
    // mes jetons posés sur chaque mise, dans l'ordre
    bets: Map<string, number[]>;
    // mises gagnantes du dernier lancer, et numéro sorti
    winning: Set<string>;
    result: number | null;
    disabled: boolean;
    onBet: (key: string) => void;
};

// ---------- Disposition : à la verticale sur téléphone (même seuil que Roulette.scss)
const VERTICAL_QUERY = "(max-width: 600px)";
const subscribe = (onChange: () => void) => {
    const query = window.matchMedia(VERTICAL_QUERY);
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
};
const useVertical = () => useSyncExternalStore(subscribe, () => window.matchMedia(VERTICAL_QUERY).matches, () => false);

export default function RouletteTable({bets, winning, result, disabled, onBet}: RouletteTableProps) {
    const vertical = useVertical();
    // mise visée par la souris (case entière, à cheval ou en carré)
    const [hovered, setHovered] = useState<string | null>(null);
    // numéros couverts par la mise visée, y compris un numéro seul : en glissant d'un numéro au bord de son voisin,
    // les autres cases restent effacées au lieu de clignoter
    const covering = hovered !== null ? rouletteRule(hovered) : undefined;

    const aimAt = (n: number, e: MouseEvent<HTMLButtonElement>) => {
        const box = e.currentTarget.getBoundingClientRect();
        return targetAt(n, (e.clientX - box.left) / box.width, (e.clientY - box.top) / box.height, vertical);
    };

    // jetons à dessiner dans chaque case : ceux de ses propres mises et ceux des mises à cheval ou en carré qu'elle porte
    const markers = new Map<string, { key: string; dir: Dir; chips?: number[] }[]>();
    const addMarker = (key: string, chips?: number[]) => {
        const {cell, dir} = anchorOf(key, vertical);
        markers.set(cell, [...markers.get(cell) ?? [], {key, dir, chips}]);
    };
    for (const [key, chips] of bets) addMarker(key, chips);
    if (hovered && !disabled) addMarker(hovered);

    return (
        <div className="roulette-table" onMouseLeave={() => setHovered(null)}>
            {CELLS.map(({key, label, className, place}) => {
                const n = numberOf(key);
                const drawn = result !== null && n === result;
                const highlight = !covering ? "" : key === hovered ? "covered" : n === null ? ""
                    : covering.wins(n) ? "covered" : "dimmed";
                const amount = bets.get(key)?.reduce((sum, c) => sum + c, 0);
                return (
                    <button key={key} type="button"
                            className={`rt-cell ${className} ${winning.has(key) ? "win" : ""} ${drawn ? "drawn" : ""} ${highlight}`}
                            style={{"--hr": place.hr, "--hc": place.hc, "--vr": place.vr, "--vc": place.vc} as CSSProperties}
                            onMouseMove={e => {
                                const target = n === null || n === 0 ? key : aimAt(n, e);
                                if (target !== hovered) setHovered(target);
                            }}
                            onFocus={() => setHovered(key)} onBlur={() => setHovered(null)}
                            disabled={disabled}
                            // clavier (detail = 0) : la case elle-même ; souris ou doigt : là où on a cliqué
                            onClick={e => onBet(n === null || n === 0 || e.detail === 0 ? key : aimAt(n, e))}
                            aria-label={amount ? `${label}, ${amount} crédits misés` : label}>
                        <span>{label}</span>
                        {markers.get(key)?.map(m => m.chips === undefined
                            ? <span key={`ghost-${m.key}`} className="rt-ghost" style={markerStyle(m.dir)} aria-hidden/>
                            : <ChipStack key={m.key} chips={m.chips!} className={`rt-stack ${winning.has(m.key) ? "win" : ""}`}
                                         style={markerStyle(m.dir)}/>)}
                    </button>
                );
            })}
        </div>
    );
}
