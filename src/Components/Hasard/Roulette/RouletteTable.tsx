/**
 * Tapis de la roulette : zéro, numéros, colonnes « 2:1 », douzaines et chances simples. Un clic pose le jeton
 * choisi ; les jetons posés s'affichent sur leur case, les mises gagnantes s'allument après le lancer.
 *
 * Mises à cheval et en carré : près du bord d'un numéro, le jeton se pose à cheval sur lui et son voisin ;
 * près d'un coin, en carré sur les quatre numéros. Viser l'espace vert entre deux cases (ou entre quatre) marche
 * aussi : la case la plus proche est retrouvée, et la position donne le cheval ou le carré. Au survol, un rond gris montre où le jeton sera posé et
 * les numéros couverts ressortent (les autres s'effacent) ; c'est aussi le cas pour couleur, pair, douzaine…
 *
 * Pose au pinceau (souris) : clic maintenu, chaque mise survolée reçoit un jeton ; en tournant sur une zone, un jeton
 * de plus tous les PAINT_STEP pixels parcourus (de petits ronds empilent vite). Au doigt, on garde le simple appui
 * (glisser fait défiler la page).
 *
 * Deux dispositions, choisies en CSS (Roulette.scss) :
 * - à l'horizontale (ordinateur) : 3 lignes × 12 colonnes de numéros, le zéro à gauche
 * - à la verticale (téléphone) : le zéro en haut, 12 lignes × 3 colonnes, douzaines et chances simples à gauche
 * Chaque case porte sa place dans les deux (variables --hr/--hc et --vr/--vc).
 */

import {type CSSProperties, type MouseEvent, type PointerEvent, useEffect, useRef, useState, useSyncExternalStore} from "react";
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
    // gesture : début d'un nouveau geste (appui, clic) ; false : jeton de plus du même glisser
    onBet: (key: string, gesture: boolean) => void;
};

// ---------- Disposition : à la verticale sur téléphone (même seuil que Roulette.scss)
const VERTICAL_QUERY = "(max-width: 600px)";
const subscribe = (onChange: () => void) => {
    const query = window.matchMedia(VERTICAL_QUERY);
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
};
const useVertical = () => useSyncExternalStore(subscribe, () => window.matchMedia(VERTICAL_QUERY).matches, () => false);

// Pose au pinceau : un jeton de plus sur la même mise tous les PAINT_STEP pixels parcourus clic maintenu
const PAINT_STEP = 60;

// Clic dans l'espace entre les cases : on cherche la case la plus proche dans ce rayon (px, plus large que l'espace)
const GAP_REACH = 6;
const GAP_PROBES = [[0, 0], [-1, 0], [1, 0], [0, -1], [0, 1], [-1, -1], [1, -1], [-1, 1], [1, 1]].map(([x, y]) => [x! * GAP_REACH, y! * GAP_REACH]);

export default function RouletteTable({bets, winning, result, disabled, onBet}: RouletteTableProps) {
    const vertical = useVertical();
    // mise visée par la souris (case entière, à cheval ou en carré)
    const [hovered, setHovered] = useState<string | null>(null);
    // numéros couverts par la mise visée, y compris un numéro seul : en glissant d'un numéro au bord de son voisin,
    // les autres cases restent effacées au lieu de clignoter
    const covering = hovered !== null ? rouletteRule(hovered) : undefined;

    // Mise visée dans une case, d'après la position de la souris (hors de la case : le bord le plus proche compte)
    const targetFor = (key: string, cell: Element, x: number, y: number) => {
        const n = numberOf(key);
        if (n === null || n === 0) return key;
        const box = cell.getBoundingClientRect();
        return targetAt(n, (x - box.left) / box.width, (y - box.top) / box.height, vertical);
    };
    const targetOf = (key: string, e: MouseEvent<HTMLButtonElement>) => targetFor(key, e.currentTarget, e.clientX, e.clientY);

    // Point dans l'espace vert entre les cases : la mise de la case la plus proche (cheval ou carré selon la position)
    const table = useRef<HTMLDivElement>(null);
    const targetInGap = (x: number, y: number) => {
        for (const [dx, dy] of GAP_PROBES) {
            const cell = document.elementFromPoint(x + dx!, y + dy!)?.closest<HTMLElement>(".rt-cell");
            if (cell && table.current?.contains(cell) && cell.dataset.key) return targetFor(cell.dataset.key, cell, x, y);
        }
        return null;
    };

    // Appui et passage de la souris (sur une case ou entre deux) : pose au pinceau
    const press = (target: string, e: PointerEvent) => {
        if (e.pointerType !== "mouse" || e.button !== 0 || disabled) return;
        e.preventDefault(); // pas de sélection de texte en glissant
        paint.current = {last: target, travelled: 0, x: e.clientX, y: e.clientY};
        skipClick.current = true;
        onBet(target, true);
    };
    const pass = (target: string, e: PointerEvent) => {
        if (target !== hovered) setHovered(target);
        const p = paint.current;
        if (!p || disabled) return;
        p.travelled += Math.hypot(e.clientX - p.x, e.clientY - p.y);
        p.x = e.clientX;
        p.y = e.clientY;
        // nouvelle mise survolée, ou assez de chemin parcouru sur la même : un jeton de plus
        if (target !== p.last || p.travelled >= PAINT_STEP) {
            p.last = target;
            p.travelled = 0;
            onBet(target, false);
        }
    };

    // Pose au pinceau : dernière mise posée, chemin parcouru depuis, et dernière position de la souris
    const paint = useRef<{ last: string; travelled: number; x: number; y: number } | null>(null);
    // le clic qui suit l'appui ne repose pas de jeton (déjà posé à l'appui)
    const skipClick = useRef(false);
    useEffect(() => {
        const stop = () => {
            paint.current = null;
        };
        window.addEventListener("pointerup", stop);
        window.addEventListener("pointercancel", stop);
        return () => {
            window.removeEventListener("pointerup", stop);
            window.removeEventListener("pointercancel", stop);
        };
    }, []);

    // jetons à dessiner dans chaque case : ceux de ses propres mises et ceux des mises à cheval ou en carré qu'elle porte
    const markers = new Map<string, { key: string; dir: Dir; chips?: number[] }[]>();
    const addMarker = (key: string, chips?: number[]) => {
        const {cell, dir} = anchorOf(key, vertical);
        markers.set(cell, [...markers.get(cell) ?? [], {key, dir, chips}]);
    };
    for (const [key, chips] of bets) addMarker(key, chips);
    if (hovered && !disabled) addMarker(hovered);

    return (
        <div className="roulette-table" ref={table} onMouseLeave={() => setHovered(null)}
            // espace vert entre les cases : même effet que le bord de la case la plus proche
             onPointerDown={e => {
                 if (e.target !== e.currentTarget) return;
                 const target = targetInGap(e.clientX, e.clientY);
                 if (target) press(target, e);
             }}
             onPointerMove={e => {
                 if (e.target !== e.currentTarget) return;
                 const target = targetInGap(e.clientX, e.clientY);
                 if (target) pass(target, e);
             }}
             onClick={e => {
                 if (e.target !== e.currentTarget || disabled) return;
                 if (skipClick.current) {
                     skipClick.current = false;
                     return;
                 }
                 const target = targetInGap(e.clientX, e.clientY);
                 if (target) onBet(target, true);
             }}>
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
                            data-key={key}
                            onPointerDown={e => press(targetOf(key, e), e)}
                            onPointerMove={e => pass(targetOf(key, e), e)}
                            onFocus={() => setHovered(key)} onBlur={() => setHovered(null)}
                            disabled={disabled}
                            // clavier (detail = 0) : la case elle-même ; souris ou doigt : là où on a cliqué
                            onClick={e => {
                                if (skipClick.current && e.detail !== 0) {
                                    skipClick.current = false;
                                    return;
                                }
                                onBet(e.detail === 0 ? key : targetOf(key, e), true);
                            }}
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
