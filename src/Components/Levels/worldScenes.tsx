/**
 * Décors détaillés des 20 mondes de la carte des niveaux, dessinés en SVG (voir WorldBackdrop) :
 * - le ciel (haut de l'écran) : soleil ou lune, nuages, oiseaux, aurores, planètes…
 * - le sol (bas de l'écran) : trois plans de relief en dégradé, et devant eux les éléments du monde (arbres, vaches,
 *   moulin, palmiers, pingouins, cristaux, colonnes…), placés sur les côtés pour laisser le chemin des niveaux dégagé.
 * Tout est fait de formes simples et nettes, à partir de petits éléments réutilisables (At, Tree, Pine, Cow…).
 * Les rares mouvements (ailes du moulin, algues, poissons, éclairs) s'arrêtent si l'utilisateur réduit les animations.
 */

import type {ReactNode} from "react";
import type {World} from "./worlds.ts";

// boîtes de dessin : le sol est calé en bas de l'écran, le ciel en haut
const GROUND = {w: 1600, h: 500};
const SKY = {w: 1600, h: 600};
const W = GROUND.w;
const H = GROUND.h;

const MOTION = typeof window === "undefined" || !window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

// ---------- Couleurs

function mix(a: string, b: string, t: number): string {
    const pa = parseInt(a.slice(1), 16), pb = parseInt(b.slice(1), 16);
    const c = [16, 8, 0].map(s => Math.round(((pa >> s) & 255) * (1 - t) + ((pb >> s) & 255) * t));
    return `#${c.map(v => v.toString(16).padStart(2, "0")).join("")}`;
}

// ---------- Relief

type Line = { base: number; amp: number; period: number; phase: number };
const yAt = (l: Line, x: number) => l.base + l.amp * Math.sin(x / l.period + l.phase);

function wavePath(l: Line): string {
    let d = `M0 ${H} L0 ${yAt(l, 0).toFixed(1)}`;
    for (let x = 10; x <= W; x += 10) d += ` L${x} ${yAt(l, x).toFixed(1)}`;
    return `${d} L${W} ${H} Z`;
}

// plan de relief en dégradé (plus clair en haut), avec un fin liseré de lumière sur la crête
function Hill({id, line, top, bottom, rim = true}: { id: string; line: Line; top: string; bottom: string; rim?: boolean }) {
    let crest = `M0 ${yAt(line, 0).toFixed(1)}`;
    for (let x = 10; x <= W; x += 10) crest += ` L${x} ${yAt(line, x).toFixed(1)}`;
    return (
        <>
            <defs>
                <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0" stopColor={top}/>
                    <stop offset="1" stopColor={bottom}/>
                </linearGradient>
            </defs>
            <path d={wavePath(line)} fill={`url(#${id})`}/>
            {rim && <path d={crest} fill="none" stroke={mix(top, "#ffffff", 0.35)} strokeWidth={2.5} opacity={0.6}/>}
        </>
    );
}

// ---------- Placement

type Pos = { x: number; y: number; s?: number; flip?: boolean };
const At = ({x, y, s = 1, flip, children}: Pos & { children: ReactNode }) =>
    <g transform={`translate(${x} ${y}) scale(${flip ? -s : s} ${s})`}>{children}</g>;
const Shadow = ({rx, ry = rx / 6}: { rx: number; ry?: number }) => <ellipse cx={0} cy={1} rx={rx} ry={ry} fill="#000" opacity={0.16}/>;

// ---------- Végétation

function Tree({leaf = "#4a9a3e", dark = "#2f7330", light = "#7cc35f", trunk = "#6b4a2b", ...p}: Pos & { leaf?: string; dark?: string; light?: string; trunk?: string }) {
    return (
        <At {...p}>
            <Shadow rx={36}/>
            <path d="M-7 0 L-4 -52 L4 -52 L7 0 Z" fill={trunk}/>
            <path d="M0 -38 L-15 -56 M1 -46 L14 -62" stroke={trunk} strokeWidth={4} strokeLinecap="round"/>
            <circle cx={-26} cy={-62} r={25} fill={dark}/>
            <circle cx={27} cy={-64} r={27} fill={dark}/>
            <circle cx={0} cy={-84} r={36} fill={dark}/>
            <circle cx={-6} cy={-90} r={30} fill={leaf}/>
            <circle cx={-26} cy={-68} r={18} fill={leaf}/>
            <circle cx={22} cy={-72} r={20} fill={leaf}/>
            <circle cx={-14} cy={-100} r={14} fill={light} opacity={0.85}/>
            <circle cx={14} cy={-82} r={8} fill={light} opacity={0.6}/>
        </At>
    );
}

function Pine({c = "#2c6e49", dark = "#1d5236", snow, ...p}: Pos & { c?: string; dark?: string; snow?: boolean }) {
    return (
        <At {...p}>
            <Shadow rx={30}/>
            <rect x={-4} y={-18} width={8} height={18} fill="#5a3d24"/>
            <path d="M0 -124 L-27 -74 L27 -74 Z M0 -100 L-37 -42 L37 -42 Z M0 -70 L-47 -12 L47 -12 Z" fill={c}/>
            <path d="M0 -124 L0 -74 L27 -74 Z M0 -100 L0 -42 L37 -42 Z M0 -70 L0 -12 L47 -12 Z" fill={dark}/>
            {snow && <path d="M0 -124 L-11 -104 L-4 -107 L2 -101 L11 -104 Z M0 -100 L-14 -78 L-5 -82 L3 -76 L14 -78 Z M0 -70 L-17 -48 L-6 -52 L4 -46 L17 -48 Z" fill="#f8fafc"/>}
        </At>
    );
}

function Bush({c = "#3f8a35", light = "#68b04f", ...p}: Pos & { c?: string; light?: string }) {
    return (
        <At {...p}>
            <Shadow rx={30}/>
            <circle cx={-16} cy={-12} r={14} fill={c}/>
            <circle cx={14} cy={-12} r={15} fill={c}/>
            <circle cx={0} cy={-22} r={17} fill={c}/>
            <circle cx={-5} cy={-27} r={8} fill={light} opacity={0.8}/>
        </At>
    );
}

function Flowers({colors = ["#f472b6", "#fde047", "#f8fafc"], ...p}: Pos & { colors?: string[] }) {
    const spots: [number, number][] = [[-22, -14], [-9, -22], [4, -12], [16, -20], [27, -10]];
    return (
        <At {...p}>
            {spots.map(([x, y], i) => (
                <g key={i}>
                    <path d={`M${x} 0 Q${x - 2} ${y / 2} ${x} ${y}`} stroke="#3f7f32" strokeWidth={2} fill="none"/>
                    <circle cx={x} cy={y} r={4.5} fill={colors[i % colors.length]}/>
                    <circle cx={x} cy={y} r={1.6} fill="#a16207"/>
                </g>
            ))}
        </At>
    );
}

// touffes d'herbe le long d'une crête
function Grass({line, from, to, step = 26, color, dy = 4}: { line: Line; from: number; to: number; step?: number; color: string; dy?: number }) {
    let d = "";
    for (let x = from; x <= to; x += step) {
        const y = yAt(line, x) + dy, k = 0.7 + 0.3 * Math.sin(x * 0.37);
        d += `M${x - 6} ${y} Q${x - 5} ${y - 10 * k} ${x - 9} ${y - 16 * k} M${x} ${y} Q${x} ${y - 13 * k} ${x + 2} ${y - 20 * k} M${x + 6} ${y} Q${x + 6} ${y - 9 * k} ${x + 10} ${y - 14 * k} `;
    }
    return <path d={d} stroke={color} strokeWidth={2.2} fill="none" strokeLinecap="round"/>;
}

function Reeds({c = "#5f6b3a", head = "#6b4426", ...p}: Pos & { c?: string; head?: string }) {
    const stems = [[-14, -58, -18], [-5, -72, -2], [6, -64, 8], [15, -50, 20]];
    return (
        <At {...p}>
            {stems.map(([x, h, tip], i) => (
                <g key={i}>
                    <path d={`M${x} 0 Q${x} ${h / 2} ${tip} ${h}`} stroke={c} strokeWidth={2.5} fill="none"/>
                    {i % 2 === 0 && <rect x={tip! - 3} y={h! + 4} width={6} height={16} rx={3} fill={head}/>}
                </g>
            ))}
            <path d="M-20 0 Q-26 -26 -34 -34 M20 0 Q28 -22 36 -28" stroke={c} strokeWidth={2} fill="none"/>
        </At>
    );
}

function Palm({trunk = "#9a6b3f", leaf = "#2f9e5b", dark = "#1f7a44", ...p}: Pos & { trunk?: string; leaf?: string; dark?: string }) {
    const fronds = [-150, -115, -80, -40, -5, 30];
    return (
        <At {...p}>
            <Shadow rx={30}/>
            <path d="M-6 0 Q-2 -70 18 -138 L26 -136 Q8 -70 6 0 Z" fill={trunk}/>
            {[20, 40, 60, 80, 100, 120].map(y => <path key={y} d={`M${-4 + y * 0.12} ${-y} l12 -2`} stroke={mix(trunk, "#000000", 0.25)} strokeWidth={2}/>)}
            {fronds.map((a, i) => (
                <path key={a} transform={`translate(22 -138) rotate(${a})`}
                      d="M0 0 Q30 -14 64 4 Q30 -2 0 6 Z" fill={i % 2 ? dark : leaf}/>
            ))}
            <circle cx={18} cy={-132} r={5} fill="#7a4a22"/>
            <circle cx={27} cy={-131} r={5} fill="#7a4a22"/>
        </At>
    );
}

function Acacia({c = "#5f6e2a", trunk = "#4a3320", ...p}: Pos & { c?: string; trunk?: string }) {
    return (
        <At {...p}>
            <Shadow rx={50}/>
            <path d="M-4 0 L-2 -50 L-22 -82 M-2 -50 L4 -60 L26 -86 M4 -60 L2 -88" stroke={trunk} strokeWidth={6} fill="none" strokeLinecap="round"/>
            <ellipse cx={0} cy={-92} rx={70} ry={16} fill={c}/>
            <ellipse cx={-30} cy={-86} rx={34} ry={11} fill={mix(c, "#000000", 0.2)}/>
            <ellipse cx={20} cy={-98} rx={40} ry={10} fill={mix(c, "#ffffff", 0.15)}/>
        </At>
    );
}

function Cactus({c = "#3f8a4a", ...p}: Pos & { c?: string }) {
    const dark = mix(c, "#000000", 0.25);
    return (
        <At {...p}>
            <Shadow rx={22}/>
            <rect x={-9} y={-92} width={18} height={92} rx={9} fill={c}/>
            <path d="M-9 -44 L-22 -44 Q-28 -44 -28 -52 L-28 -70" stroke={c} strokeWidth={13} fill="none" strokeLinecap="round"/>
            <path d="M9 -58 L20 -58 Q26 -58 26 -66 L26 -80" stroke={c} strokeWidth={12} fill="none" strokeLinecap="round"/>
            <path d="M-2 -86 L-2 -4 M4 -84 L4 -6" stroke={dark} strokeWidth={1.5}/>
            <circle cx={0} cy={-94} r={4} fill="#f472b6"/>
        </At>
    );
}

function Mushroom({cap = "#dc2626", ...p}: Pos & { cap?: string }) {
    return (
        <At {...p}>
            <rect x={-5} y={-16} width={10} height={16} rx={4} fill="#f5ecd8"/>
            <path d="M-17 -14 Q0 -36 17 -14 Z" fill={cap}/>
            <circle cx={-6} cy={-21} r={2.6} fill="#fff"/>
            <circle cx={6} cy={-24} r={2} fill="#fff"/>
            <circle cx={9} cy={-17} r={1.6} fill="#fff"/>
        </At>
    );
}

function DeadTree({c = "#3b2f25", ...p}: Pos & { c?: string }) {
    return (
        <At {...p}>
            <path d="M-6 0 L-3 -70 L-24 -100 M-3 -70 L2 -90 L-6 -120 M2 -90 L20 -110 L32 -112 M-3 -50 L18 -66"
                  stroke={c} strokeWidth={6} fill="none" strokeLinecap="round" strokeLinejoin="round"/>
        </At>
    );
}

// ---------- Animaux et objets

function Cow({spot = "#2b2b2b", ...p}: Pos & { spot?: string }) {
    return (
        <At {...p}>
            <Shadow rx={34}/>
            {[-20, -11, 10, 18].map(x => <rect key={x} x={x} y={-20} width={6} height={20} rx={2} fill="#3a3a3a"/>)}
            <path d="M-30 -36 Q-40 -30 -36 -16" stroke={spot} strokeWidth={2.5} fill="none" strokeLinecap="round"/>
            <rect x={-30} y={-46} width={58} height={30} rx={14} fill="#faf7f0"/>
            <ellipse cx={-12} cy={-36} rx={10} ry={8} fill={spot}/>
            <ellipse cx={12} cy={-27} rx={8} ry={5.5} fill={spot}/>
            <ellipse cx={-22} cy={-24} rx={5} ry={4} fill={spot}/>
            <ellipse cx={8} cy={-17} rx={6} ry={3.5} fill="#f2b8b0"/>
            <path d="M25 -52 l-4 -7 M39 -52 l4 -7" stroke="#e8dcc0" strokeWidth={3} strokeLinecap="round"/>
            <ellipse cx={22} cy={-46} rx={6} ry={3} fill="#faf7f0"/>
            <rect x={24} y={-56} width={20} height={24} rx={9} fill="#faf7f0"/>
            <rect x={30} y={-42} width={16} height={12} rx={6} fill="#f2b8b0"/>
            <circle cx={34} cy={-48} r={1.8} fill="#1f1f1f"/>
            <circle cx={42} cy={-48} r={1.8} fill="#1f1f1f"/>
        </At>
    );
}

function Windmill(p: Pos) {
    const sails = [0, 90, 180, 270].map(a => (
        <g key={a} transform={`rotate(${a})`}>
            <rect x={-2} y={-74} width={4} height={74} fill="#6b4a2b"/>
            <rect x={3} y={-70} width={16} height={56} fill="#fbf7ee" stroke="#6b4a2b" strokeWidth={1.5}/>
            <path d="M3 -56 H19 M3 -42 H19 M3 -28 H19" stroke="#6b4a2b" strokeWidth={1}/>
        </g>
    ));
    return (
        <At {...p}>
            <Shadow rx={40}/>
            <path d="M-24 0 L-15 -112 L15 -112 L24 0 Z" fill="#efe6d6"/>
            <path d="M0 0 L0 -112 L15 -112 L24 0 Z" fill="#d9ccb5"/>
            <path d="M-22 -110 L0 -140 L22 -110 Z" fill="#b5523b"/>
            <path d="M0 -140 L22 -110 L0 -110 Z" fill="#963f2c"/>
            <rect x={-8} y={-28} width={16} height={28} rx={8} fill="#6b4a2b"/>
            <rect x={-6} y={-82} width={12} height={14} rx={2} fill="#7aa7c7"/>
            <g transform="translate(0 -114)">
                <g>
                    {sails}
                    {MOTION && <animateTransform attributeName="transform" type="rotate" from="0" to="360" dur="14s" repeatCount="indefinite"/>}
                </g>
                <circle r={6} fill="#6b4a2b"/>
            </g>
        </At>
    );
}

function Fence({line, from, to, color = "#8a6440"}: { line: Line; from: number; to: number; color?: string }) {
    const posts: ReactNode[] = [];
    let rails = "", rails2 = "";
    for (let x = from; x <= to; x += 34) {
        const y = yAt(line, x) + 3;
        posts.push(<rect key={x} x={x - 3} y={y - 30} width={6} height={30} rx={1.5} fill={color}/>);
        rails += `${x === from ? "M" : "L"}${x} ${y - 22} `;
        rails2 += `${x === from ? "M" : "L"}${x} ${y - 11} `;
    }
    return (
        <g>
            <path d={rails} stroke={color} strokeWidth={4} fill="none"/>
            <path d={rails2} stroke={color} strokeWidth={4} fill="none"/>
            {posts}
        </g>
    );
}

function House({wall = "#f1e4cc", roof = "#9b3b2a", snow, ...p}: Pos & { wall?: string; roof?: string; snow?: boolean }) {
    return (
        <At {...p}>
            <Shadow rx={44}/>
            <rect x={-34} y={-46} width={68} height={46} fill={wall}/>
            <rect x={0} y={-46} width={34} height={46} fill={mix(wall, "#000000", 0.1)}/>
            <path d="M-44 -44 L0 -84 L44 -44 Z" fill={roof}/>
            {snow && <path d="M-44 -44 L0 -84 L44 -44 L36 -44 L0 -76 L-36 -44 Z M-30 -58 L0 -84 L30 -58 L20 -60 L0 -78 L-20 -60 Z" fill="#f8fafc"/>}
            <rect x={-24} y={-34} width={14} height={14} fill="#fde68a"/>
            <path d="M-17 -34 V-20 M-24 -27 H-10" stroke={wall} strokeWidth={2}/>
            <rect x={8} y={-28} width={14} height={28} fill="#6b4a2b"/>
            <rect x={18} y={-90} width={10} height={22} fill="#7c6a5a"/>
        </At>
    );
}

function Boat({hull = "#8a5a33", sail = "#fbf7ee", ...p}: Pos & { hull?: string; sail?: string }) {
    return (
        <At {...p}>
            <path d="M-40 -10 L40 -10 L28 6 L-28 6 Z" fill={hull}/>
            <rect x={-2} y={-78} width={4} height={68} fill="#5a3d24"/>
            <path d="M3 -74 L36 -18 L3 -18 Z" fill={sail}/>
            <path d="M-3 -64 L-30 -18 L-3 -18 Z" fill={mix(sail, "#000000", 0.1)}/>
            <path d="M-46 8 Q-23 2 0 8 T46 8" stroke="#ffffff" strokeOpacity={0.6} strokeWidth={2} fill="none"/>
        </At>
    );
}

function Bridge({c = "#8a5a33", ...p}: Pos & { c?: string }) {
    return (
        <At {...p}>
            <path d="M-110 0 Q0 -60 110 0" stroke={c} strokeWidth={12} fill="none"/>
            <path d="M-110 -26 Q0 -86 110 -26" stroke={c} strokeWidth={4} fill="none"/>
            {[-90, -60, -30, 0, 30, 60, 90].map(x => {
                const y = -((1 - (x / 110) ** 2) * 30);
                return <path key={x} d={`M${x} ${y} V${y - 26}`} stroke={c} strokeWidth={4}/>;
            })}
        </At>
    );
}

function Rock({c = "#7c7f86", ...p}: Pos & { c?: string }) {
    return (
        <At {...p}>
            <Shadow rx={34}/>
            <path d="M-34 0 L-26 -22 L-8 -32 L14 -28 L30 -10 L34 0 Z" fill={c}/>
            <path d="M-26 -22 L-8 -32 L14 -28 L4 -18 L-14 -16 Z" fill={mix(c, "#ffffff", 0.25)}/>
        </At>
    );
}

function Penguin(p: Pos) {
    return (
        <At {...p}>
            <Shadow rx={14}/>
            <ellipse cx={0} cy={-22} rx={13} ry={22} fill="#1f2937"/>
            <ellipse cx={2} cy={-18} rx={8} ry={15} fill="#f8fafc"/>
            <circle cx={2} cy={-40} r={10} fill="#1f2937"/>
            <circle cx={6} cy={-42} r={2.6} fill="#fff"/>
            <circle cx={6.6} cy={-42} r={1.2} fill="#111"/>
            <path d="M10 -39 L17 -37 L10 -35 Z" fill="#f59e0b"/>
            <path d="M-6 0 l-5 2 h9 Z M6 0 l-3 2 h9 Z" fill="#f59e0b"/>
        </At>
    );
}

function Iceberg({c = "#eaf7fc", shade = "#b6dcec", ...p}: Pos & { c?: string; shade?: string }) {
    return (
        <At {...p}>
            <path d="M-70 0 L-50 -50 L-26 -64 L-8 -106 L18 -70 L40 -78 L70 0 Z" fill={c}/>
            <path d="M-8 -106 L18 -70 L40 -78 L70 0 L10 0 L4 -60 Z" fill={shade}/>
            <path d="M-80 4 H80" stroke="#ffffff" strokeOpacity={0.5} strokeWidth={3}/>
        </At>
    );
}

function Igloo(p: Pos) {
    return (
        <At {...p}>
            <Shadow rx={52}/>
            <path d="M-48 0 A48 48 0 0 1 48 0 Z" fill="#f1f8fc"/>
            <path d="M-46 -14 H46 M-38 -30 H38 M-22 -42 H22 M-20 0 V-14 M14 -14 V-30 M-10 -30 V-42" stroke="#b9d9e8" strokeWidth={2}/>
            <path d="M24 0 A16 16 0 0 1 56 0 Z" fill="#e3f0f7"/>
            <path d="M32 0 A8 9 0 0 1 48 0 Z" fill="#1e3a4a"/>
        </At>
    );
}

function Torii({c = "#c2410c", ...p}: Pos & { c?: string }) {
    return (
        <At {...p}>
            <Shadow rx={50}/>
            <rect x={-38} y={-104} width={10} height={104} fill={c}/>
            <rect x={28} y={-104} width={10} height={104} fill={c}/>
            <path d="M-60 -112 Q0 -122 60 -112 L56 -102 Q0 -110 -56 -102 Z" fill="#1f2937"/>
            <rect x={-50} y={-100} width={100} height={9} fill={c}/>
            <rect x={-46} y={-78} width={92} height={7} fill={c}/>
        </At>
    );
}

function Lantern({glow = "#fde68a", ...p}: Pos & { glow?: string }) {
    return (
        <At {...p}>
            <rect x={-3} y={-60} width={6} height={60} fill="#57534e"/>
            <rect x={-12} y={-80} width={24} height={22} rx={3} fill={glow}/>
            <circle cx={0} cy={-69} r={22} fill={glow} opacity={0.25}/>
            <path d="M-16 -82 L16 -82 L0 -94 Z" fill="#44403c"/>
        </At>
    );
}

function Temple({c = "#8b8a6e", ...p}: Pos & { c?: string }) {
    const dark = mix(c, "#000000", 0.25);
    return (
        <At {...p}>
            <Shadow rx={90}/>
            <rect x={-90} y={-30} width={180} height={30} fill={c}/>
            <rect x={-68} y={-58} width={136} height={28} fill={mix(c, "#ffffff", 0.08)}/>
            <rect x={-46} y={-84} width={92} height={26} fill={c}/>
            <rect x={-26} y={-110} width={52} height={26} fill={mix(c, "#ffffff", 0.08)}/>
            <rect x={-10} y={-104} width={20} height={20} fill={dark}/>
            <rect x={-12} y={-30} width={24} height={30} fill={dark}/>
            <path d="M-80 -30 Q-74 -10 -82 4 M60 -58 Q66 -40 58 -26 M-40 -84 Q-46 -66 -38 -56" stroke="#2f7a3a" strokeWidth={4} fill="none"/>
        </At>
    );
}

function BigLeaf({c = "#166534", a = 0, ...p}: Pos & { c?: string; a?: number }) {
    return (
        <At {...p}>
            <g transform={`rotate(${a})`}>
                <path d="M0 0 Q-6 -40 0 -110" stroke={mix(c, "#000000", 0.3)} strokeWidth={4} fill="none"/>
                <path d="M0 -110 Q-50 -100 -46 -60 Q-40 -30 0 -40 Q40 -30 46 -60 Q50 -100 0 -110 Z" fill={c}/>
                <path d="M0 -104 V-44 M0 -90 L-26 -78 M0 -76 L-32 -62 M0 -90 L26 -78 M0 -76 L32 -62" stroke={mix(c, "#000000", 0.3)} strokeWidth={2}/>
            </g>
        </At>
    );
}

function Coral({c = "#fb7185", ...p}: Pos & { c?: string }) {
    return (
        <At {...p}>
            <path d="M0 0 V-40 L-18 -64 M0 -40 L14 -70 L6 -92 M14 -70 L30 -86 M-18 -64 L-30 -80 M-18 -64 L-10 -86"
                  stroke={c} strokeWidth={9} fill="none" strokeLinecap="round" strokeLinejoin="round"/>
            <ellipse cx={0} cy={-2} rx={16} ry={5} fill={mix(c, "#000000", 0.3)}/>
        </At>
    );
}

function Seaweed({c = "#15803d", h = 120, ...p}: Pos & { c?: string; h?: number }) {
    return (
        <At {...p}>
            <g>
                <path d={`M0 0 Q-14 ${-h * 0.25} 0 ${-h * 0.5} T0 ${-h}`} stroke={c} strokeWidth={7} fill="none" strokeLinecap="round"/>
                <path d={`M8 0 Q20 ${-h * 0.2} 8 ${-h * 0.4} T10 ${-h * 0.75}`} stroke={mix(c, "#ffffff", 0.15)} strokeWidth={5} fill="none" strokeLinecap="round"/>
                {MOTION && <animateTransform attributeName="transform" type="rotate" values="-4;4;-4" dur="5s" repeatCount="indefinite"/>}
            </g>
        </At>
    );
}

function Fish({c = "#fbbf24", dur = 30, dx = 1800, ...p}: Pos & { c?: string; dur?: number; dx?: number }) {
    return (
        <At {...p}>
            <g>
                <path d="M-16 0 L-28 -9 L-28 9 Z" fill={mix(c, "#000000", 0.2)}/>
                <ellipse cx={0} cy={0} rx={18} ry={9} fill={c}/>
                <circle cx={9} cy={-2} r={2} fill="#111827"/>
                {MOTION && <animateTransform attributeName="transform" type="translate" from={`${-dx / 2} 0`} to={`${dx / 2} 0`} dur={`${dur}s`} repeatCount="indefinite"/>}
            </g>
        </At>
    );
}

function Jellyfish({c = "#f0abfc", ...p}: Pos & { c?: string }) {
    return (
        <At {...p}>
            <g>
                <circle cx={0} cy={-6} r={34} fill={c} opacity={0.15}/>
                <path d="M-20 0 Q-20 -28 0 -28 Q20 -28 20 0 Q10 -4 0 0 Q-10 -4 -20 0 Z" fill={c} opacity={0.85}/>
                <path d="M-12 0 q-4 14 2 28 M-4 0 q4 16 -2 34 M4 0 q-4 14 2 30 M12 0 q4 12 -2 24" stroke={c} strokeWidth={2} fill="none" opacity={0.8}/>
                {MOTION && <animateTransform attributeName="transform" type="translate" values="0 0;0 -24;0 0" dur="6s" repeatCount="indefinite"/>}
            </g>
        </At>
    );
}

function Crystal({c = "#a78bfa", light = "#ede9fe", ...p}: Pos & { c?: string; light?: string }) {
    const prisms: [number, number, number, number][] = [[-22, -70, 14, -18], [0, -110, 18, 0], [24, -78, 14, 16], [-36, -40, 10, -30], [38, -46, 10, 22]];
    return (
        <At {...p}>
            <ellipse cx={0} cy={0} rx={60} ry={14} fill={c} opacity={0.25}/>
            {prisms.map(([x, h, w, tilt], i) => (
                <g key={i} transform={`translate(${x} 0) rotate(${tilt})`}>
                    <path d={`M${-w} 0 L${-w} ${h + w} L0 ${h} L${w} ${h + w} L${w} 0 Z`} fill={c}/>
                    <path d={`M0 ${h} L${w} ${h + w} L${w} 0 L0 0 Z`} fill={mix(c, "#000000", 0.2)}/>
                    <path d={`M${-w + 3} -4 L${-w + 3} ${h + w + 2}`} stroke={light} strokeWidth={2} opacity={0.8}/>
                </g>
            ))}
        </At>
    );
}

function Column({c = "#e7dcc4", broken, ...p}: Pos & { c?: string; broken?: boolean }) {
    const dark = mix(c, "#000000", 0.18);
    const top = broken ? -110 : -150;
    return (
        <At {...p}>
            <Shadow rx={34}/>
            <rect x={-26} y={-10} width={52} height={10} fill={dark}/>
            <rect x={-18} y={top} width={36} height={-top - 10} fill={c}/>
            {[-10, 0, 10].map(x => <path key={x} d={`M${x} ${top + 4} V-12`} stroke={dark} strokeWidth={2}/>)}
            {broken
                ? <path d={`M-18 ${top} L-8 ${top - 14} L4 ${top - 4} L18 ${top - 18} L18 ${top} Z`} fill={c}/>
                : <><rect x={-26} y={top - 12} width={52} height={12} fill={dark}/><rect x={-30} y={top - 18} width={60} height={7} fill={c}/></>}
        </At>
    );
}

function Arch({c = "#d9cbb0", ...p}: Pos & { c?: string }) {
    return (
        <At {...p}>
            <Shadow rx={70}/>
            <path d="M-70 0 V-90 A70 70 0 0 1 70 -90 V0 H42 V-86 A42 42 0 0 0 -42 -86 V0 Z" fill={c}/>
            <path d="M42 0 V-86 A42 42 0 0 0 0 -128 V-160 A70 70 0 0 1 70 -90 V0 Z" fill={mix(c, "#000000", 0.12)}/>
            <path d="M-50 -40 Q-62 -20 -54 0" stroke="#3f7a3a" strokeWidth={4} fill="none"/>
        </At>
    );
}

function FloatingIsland({rock = "#7c6f9b", grass = "#86c56a", tree = true, ...p}: Pos & { rock?: string; grass?: string; tree?: boolean }) {
    return (
        <At {...p}>
            <path d="M-80 0 Q-60 50 -20 70 L0 110 L18 66 Q60 44 80 0 Z" fill={rock}/>
            <path d="M0 110 L18 66 Q60 44 80 0 L20 0 Z" fill={mix(rock, "#000000", 0.2)}/>
            <path d="M-84 2 Q0 -14 84 2 Q0 12 -84 2 Z" fill={grass}/>
            <path d="M40 4 Q42 60 36 120" stroke="#bfdbfe" strokeWidth={6} opacity={0.8} fill="none"/>
            {tree && <Tree x={-30} y={0} s={0.55} leaf="#6fbf5a" dark="#4c9a40" light="#a3e08a"/>}
        </At>
    );
}

function Lighthouse(p: Pos) {
    return (
        <At {...p}>
            <Shadow rx={34}/>
            <path d="M-22 0 L-14 -130 L14 -130 L22 0 Z" fill="#f8fafc"/>
            <path d="M-19 -40 L19 -40 L18 -60 L-18 -60 Z M-16 -88 L16 -88 L15 -108 L-15 -108 Z" fill="#dc2626"/>
            <rect x={-12} y={-150} width={24} height={20} fill="#fde68a"/>
            <path d="M-16 -150 L0 -166 L16 -150 Z" fill="#1f2937"/>
            <g opacity={0.35}>
                <path d="M0 -140 L-260 -190 L-260 -100 Z" fill="#fde68a">
                    {MOTION && <animate attributeName="opacity" values="1;0;0;1" dur="4s" repeatCount="indefinite"/>}
                </path>
            </g>
        </At>
    );
}

function Camel({c = "#8a5a2b", ...p}: Pos & { c?: string }) {
    return (
        <At {...p}>
            <Shadow rx={34}/>
            <path d="M-30 0 L-28 -30 Q-28 -42 -16 -44 Q-8 -64 4 -46 Q14 -44 20 -36 L30 -56 Q34 -64 42 -60 L46 -54 L38 -50 L30 -30 L28 0 L23 0 L23 -24 L-16 -24 L-18 0 L-23 0 L-24 -22 Z" fill={c}/>
        </At>
    );
}

function Giraffe({c = "#d98c3a", ...p}: Pos & { c?: string }) {
    const spot = mix(c, "#000000", 0.35);
    return (
        <At {...p}>
            <Shadow rx={30}/>
            <path d="M-24 0 V-40 M-14 0 V-40 M12 0 V-40 M22 0 V-40" stroke={c} strokeWidth={6}/>
            <rect x={-30} y={-58} width={58} height={24} rx={10} fill={c}/>
            <path d="M14 -52 L30 -130 L42 -128 L28 -48 Z" fill={c}/>
            <path d="M30 -132 L52 -126 L50 -116 L32 -118 Z" fill={c}/>
            <path d="M33 -136 v-8 M39 -134 v-8" stroke={spot} strokeWidth={3} strokeLinecap="round"/>
            {[[-18, -48], [0, -50], [-6, -40], [16, -44], [28, -80], [24, -100], [32, -64]].map(([x, y], i) =>
                <circle key={i} cx={x} cy={y} r={4} fill={spot}/>)}
        </At>
    );
}

function Mesa({c = "#b44d33", ...p}: Pos & { c?: string }) {
    const stripe = mix(c, "#ffffff", 0.15), dark = mix(c, "#000000", 0.2);
    return (
        <At {...p}>
            <path d="M-140 0 L-110 -150 L-90 -160 L80 -160 L100 -150 L140 0 Z" fill={c}/>
            <path d="M40 -160 L80 -160 L100 -150 L140 0 L60 0 Z" fill={dark}/>
            <path d="M-118 -110 H118 M-126 -70 H128 M-132 -36 H134" stroke={stripe} strokeWidth={6} opacity={0.6}/>
        </At>
    );
}

function Peak({c = "#71859c", snow = "#f8fafc", h = 300, w = 260, ...p}: Pos & { c?: string; snow?: string; h?: number; w?: number }) {
    return (
        <At {...p}>
            <path d={`M${-w} 0 L${-w * 0.2} ${-h} L${w} 0 Z`} fill={c}/>
            <path d={`M${-w * 0.2} ${-h} L${w} 0 L${w * 0.1} 0 Z`} fill={mix(c, "#000000", 0.18)}/>
            <path d={`M${-w * 0.2} ${-h} L${-w * 0.42} ${-h * 0.72} L${-w * 0.3} ${-h * 0.76} L${-w * 0.2} ${-h * 0.68} L${-w * 0.06} ${-h * 0.76} L${w * 0.06} ${-h * 0.7} Z`} fill={snow}/>
        </At>
    );
}

function Volcano({c = "#3d3733", ...p}: Pos & { c?: string }) {
    return (
        <At {...p}>
            <path d="M-300 0 L-60 -260 L60 -260 L300 0 Z" fill={c}/>
            <path d="M0 -260 L60 -260 L300 0 L40 0 Z" fill={mix(c, "#000000", 0.25)}/>
            <path d="M-60 -260 Q0 -246 60 -260 Q0 -272 -60 -260 Z" fill="#f97316"/>
            <path d="M-20 -256 Q-30 -180 -70 -120 Q-90 -60 -80 0 L-60 0 Q-70 -60 -50 -120 Q-14 -180 -6 -256 Z" fill="#ea580c"/>
            <path d="M14 -256 Q30 -200 60 -150 Q90 -100 110 0 L124 0 Q104 -100 74 -150 Q44 -200 26 -256 Z" fill="#f97316" opacity={0.85}/>
            <ellipse cx={0} cy={-262} rx={90} ry={26} fill="#f97316" opacity={0.25}/>
        </At>
    );
}

function Rocket(p: Pos) {
    return (
        <At {...p}>
            <Shadow rx={30}/>
            <path d="M-16 -20 L-30 0 L-12 -6 Z M16 -20 L30 0 L12 -6 Z" fill="#ef4444"/>
            <path d="M-14 -6 L-14 -80 Q0 -112 14 -80 L14 -6 Z" fill="#e2e8f0"/>
            <path d="M0 -106 Q14 -96 14 -80 L14 -6 L0 -6 Z" fill="#cbd5e1"/>
            <circle cx={0} cy={-66} r={7} fill="#38bdf8" stroke="#64748b" strokeWidth={2}/>
            <path d="M-8 -6 L0 14 L8 -6 Z" fill="#f97316"/>
        </At>
    );
}

function Crater({c = "#2e2a72", ...p}: Pos & { c?: string }) {
    return (
        <At {...p}>
            <ellipse cx={0} cy={0} rx={50} ry={12} fill={mix(c, "#000000", 0.35)}/>
            <path d="M-50 0 A50 12 0 0 0 50 0" stroke={mix(c, "#ffffff", 0.2)} strokeWidth={3} fill="none"/>
        </At>
    );
}

// ---------- Ciel

function Sun({x, y, r = 46, c = "#fde68a", halo = "#fff7cc"}: { x: number; y: number; r?: number; c?: string; halo?: string }) {
    return (
        <g>
            <circle cx={x} cy={y} r={r * 2.4} fill={halo} opacity={0.18}/>
            <circle cx={x} cy={y} r={r * 1.5} fill={halo} opacity={0.3}/>
            <circle cx={x} cy={y} r={r} fill={c}/>
        </g>
    );
}

function Moon({x, y, r = 34, c = "#f1f5f9"}: { x: number; y: number; r?: number; c?: string }) {
    return (
        <g>
            <circle cx={x} cy={y} r={r * 2} fill={c} opacity={0.08}/>
            <circle cx={x} cy={y} r={r} fill={c}/>
            <circle cx={x - r * 0.3} cy={y - r * 0.2} r={r * 0.18} fill="#cbd5e1"/>
            <circle cx={x + r * 0.3} cy={y + r * 0.3} r={r * 0.12} fill="#cbd5e1"/>
        </g>
    );
}

function Cloud({x, y, s = 1, c = "#ffffff", opacity = 0.9, drift = 0}: { x: number; y: number; s?: number; c?: string; opacity?: number; drift?: number }) {
    return (
        <g transform={`translate(${x} ${y}) scale(${s})`} opacity={opacity}>
            <g>
                <ellipse cx={0} cy={0} rx={80} ry={22} fill={c}/>
                <circle cx={-34} cy={-10} r={26} fill={c}/>
                <circle cx={6} cy={-22} r={34} fill={c}/>
                <circle cx={42} cy={-8} r={22} fill={c}/>
                <ellipse cx={0} cy={8} rx={76} ry={10} fill={mix(c, "#000000", 0.08)}/>
                {MOTION && drift > 0 && <animateTransform attributeName="transform" type="translate" values={`0 0;${drift} 0;0 0`} dur="60s" repeatCount="indefinite"/>}
            </g>
        </g>
    );
}

function Birds({x, y, s = 1, c = "#1f2937"}: { x: number; y: number; s?: number; c?: string }) {
    return (
        <g transform={`translate(${x} ${y}) scale(${s})`} stroke={c} strokeWidth={2.5} fill="none" strokeLinecap="round">
            <path d="M0 0 q8 -8 16 0 q8 -8 16 0"/>
            <path d="M40 14 q6 -6 12 0 q6 -6 12 0"/>
            <path d="M18 26 q5 -5 10 0 q5 -5 10 0"/>
        </g>
    );
}

function Stars({n = 60, c = "#f8fafc", maxY = 420}: { n?: number; c?: string; maxY?: number }) {
    return (
        <g fill={c}>
            {Array.from({length: n}, (_, i) => (
                <circle key={i} cx={(i * 263) % SKY.w} cy={(i * 97) % maxY} r={i % 7 === 0 ? 2.2 : i % 3 === 0 ? 1.4 : 0.9} opacity={0.5 + (i % 5) / 10}/>
            ))}
        </g>
    );
}

function Planet({x, y, r, c, ring}: { x: number; y: number; r: number; c: string; ring?: string }) {
    return (
        <g>
            {ring && <ellipse cx={x} cy={y} rx={r * 1.9} ry={r * 0.45} fill="none" stroke={ring} strokeWidth={5} transform={`rotate(-18 ${x} ${y})`}/>}
            <circle cx={x} cy={y} r={r} fill={c}/>
            <path d={`M${x - r} ${y} A${r} ${r} 0 0 0 ${x + r} ${y} A${r} ${r * 0.6} 0 0 1 ${x - r} ${y} Z`} fill={mix(c, "#000000", 0.25)}/>
            <ellipse cx={x - r * 0.2} cy={y - r * 0.35} rx={r * 0.5} ry={r * 0.12} fill={mix(c, "#ffffff", 0.25)} opacity={0.6}/>
        </g>
    );
}

// ---------- Les 20 mondes

type Scene = { sky: ReactNode; ground: ReactNode };

const L = (base: number, amp: number, period: number, phase: number): Line => ({base, amp, period, phase});

function plaine(w: World): Scene {
    const far = L(270, 22, 170, 0), mid = L(340, 16, 120, 2), near = L(420, 12, 90, 1);
    return {
        sky: <>
            <Sun x={1340} y={130}/>
            <Cloud x={260} y={130} s={1.1} drift={60}/>
            <Cloud x={760} y={70} s={0.7} drift={40}/>
            <Cloud x={1080} y={230} s={0.9} drift={50}/>
            <Birds x={400} y={220} s={0.9} c="#334155"/>
        </>,
        ground: <>
            <Hill id="pl-far" line={far} top={mix(w.far, w.sky[1], 0.35)} bottom={w.far}/>
            {[100, 170, 240, 1260, 1330, 1470].map((x, i) => <Tree key={x} x={x} y={yAt(far, x) + 4} s={0.38 + (i % 2) * 0.06} leaf="#7dbb5c" dark="#5f9e48" light="#a6d88a"/>)}
            <Windmill x={1180} y={yAt(far, 1180) + 6} s={0.75}/>
            <Hill id="pl-mid" line={mid} top="#86c565" bottom="#6aab4d"/>
            <Fence line={mid} from={1060} to={1300}/>
            <Cow x={300} y={yAt(mid, 300) + 8} s={0.75}/>
            <Cow x={440} y={yAt(mid, 440) + 8} s={0.6} flip spot="#7c4a2a"/>
            <Cow x={1380} y={yAt(mid, 1380) + 8} s={0.7} flip/>
            <Hill id="pl-near" line={near} top="#5aa245" bottom="#3d7f30"/>
            <Tree x={90} y={yAt(near, 90) + 10} s={1.35}/>
            <Tree x={470} y={yAt(near, 470) + 10} s={0.95}/>
            <Tree x={1510} y={yAt(near, 1510) + 10} s={1.45}/>
            <Bush x={250} y={yAt(near, 250) + 8} s={1.1}/>
            <Bush x={1240} y={yAt(near, 1240) + 8}/>
            <Flowers x={180} y={yAt(near, 180) + 14}/>
            <Flowers x={380} y={yAt(near, 380) + 14} colors={["#fde047", "#f8fafc"]}/>
            <Flowers x={1120} y={yAt(near, 1120) + 14} colors={["#f472b6", "#c084fc"]}/>
            <Flowers x={1380} y={yAt(near, 1380) + 14}/>
            <Grass line={near} from={20} to={540} color="#2f6e26" dy={10}/>
            <Grass line={near} from={1060} to={1590} color="#2f6e26" dy={10}/>
        </>,
    };
}

function foret(w: World): Scene {
    const far = L(240, 10, 140, 0), mid = L(330, 12, 110, 1), near = L(420, 10, 80, 2);
    return {
        sky: <>
            <Moon x={1300} y={120} r={30} c="#e2f0e6"/>
            <Stars n={24} c="#d9f99d" maxY={300}/>
        </>,
        ground: <>
            <Hill id="fo-far" line={far} top={mix(w.far, w.sky[1], 0.4)} bottom={w.far} rim={false}/>
            {Array.from({length: 26}, (_, i) => i * 62 + 10).map((x, i) =>
                <Pine key={x} x={x} y={yAt(far, x) + 6} s={0.55 + (i % 3) * 0.08} c={mix(w.far, w.sky[1], 0.2)} dark={w.far}/>)}
            <Hill id="fo-mid" line={mid} top="#2a6342" bottom="#1d4a31"/>
            {[60, 150, 250, 360, 1120, 1220, 1330, 1450, 1550].map((x, i) =>
                <Pine key={x} x={x} y={yAt(mid, x) + 8} s={0.85 + (i % 2) * 0.15}/>)}
            <Hill id="fo-near" line={near} top="#1f4a2f" bottom="#122e1d"/>
            <Pine x={40} y={yAt(near, 40) + 12} s={1.6} c="#1f5a39" dark="#143d27"/>
            <Pine x={1560} y={yAt(near, 1560) + 12} s={1.7} c="#1f5a39" dark="#143d27"/>
            <Tree x={420} y={yAt(near, 420) + 10} s={1.1} leaf="#3d7f4a" dark="#2a5f36" light="#5fa66b"/>
            <Tree x={1220} y={yAt(near, 1220) + 10} s={1.2} leaf="#3d7f4a" dark="#2a5f36" light="#5fa66b"/>
            <Mushroom x={210} y={yAt(near, 210) + 12} s={1.3}/>
            <Mushroom x={240} y={yAt(near, 240) + 12} s={0.9} cap="#f59e0b"/>
            <Mushroom x={1360} y={yAt(near, 1360) + 12} s={1.2}/>
            <Rock x={300} y={yAt(near, 300) + 10} c="#55635a"/>
            <Bush x={1100} y={yAt(near, 1100) + 10} c="#2a5f36" light="#4b8a57"/>
            <Grass line={near} from={20} to={540} color="#0f2a19" dy={10}/>
            <Grass line={near} from={1060} to={1590} color="#0f2a19" dy={10}/>
        </>,
    };
}

function riviere(w: World): Scene {
    const far = L(250, 18, 160, 1), bank = L(330, 6, 140, 0), near = L(430, 10, 90, 2);
    return {
        sky: <>
            <Sun x={260} y={120} r={40}/>
            <Cloud x={900} y={110} s={1} drift={50}/>
            <Cloud x={1350} y={190} s={0.8} drift={40}/>
            <Birds x={1100} y={240} s={0.8} c="#334155"/>
        </>,
        ground: <>
            <Hill id="ri-far" line={far} top="#9cd18a" bottom="#78b968"/>
            {[90, 160, 1300, 1390, 1480].map((x, i) => <Tree key={x} x={x} y={yAt(far, x) + 4} s={0.4 + (i % 2) * 0.05} leaf="#6fb15b" dark="#4f9442" light="#9bd185"/>)}
            <Hill id="ri-bank" line={bank} top="#8cc66f" bottom="#6aa955"/>
            <defs>
                <linearGradient id="ri-water" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0" stopColor={mix(w.near, "#ffffff", 0.3)}/>
                    <stop offset="1" stopColor={w.near}/>
                </linearGradient>
            </defs>
            <rect x={0} y={360} width={W} height={H - 360} fill="url(#ri-water)"/>
            {[[120, 380], [380, 400], [1160, 390], [1420, 410], [260, 440], [1300, 450]].map(([x, y], i) =>
                <path key={i} d={`M${x} ${y} h46 M${x + 14} ${y + 8} h30`} stroke="#ffffff" strokeOpacity={0.55} strokeWidth={3} strokeLinecap="round"/>)}
            <Boat x={300} y={410} s={0.9}/>
            <Bridge x={1300} y={372} s={1.1}/>
            <Hill id="ri-near" line={near} top="#4f9a3c" bottom="#367a2b"/>
            <Reeds x={60} y={yAt(near, 60) + 6} s={1.3}/>
            <Reeds x={520} y={yAt(near, 520) + 6}/>
            <Reeds x={1100} y={yAt(near, 1100) + 6} s={1.2}/>
            <Tree x={200} y={yAt(near, 200) + 12} s={1.2}/>
            <Tree x={1500} y={yAt(near, 1500) + 12} s={1.3}/>
            <Rock x={420} y={yAt(near, 420) + 10} c="#8b9298"/>
            <Flowers x={1240} y={yAt(near, 1240) + 14} colors={["#fde047", "#f8fafc"]}/>
            <Grass line={near} from={20} to={540} color="#2b6322" dy={10}/>
            <Grass line={near} from={1060} to={1590} color="#2b6322" dy={10}/>
        </>,
    };
}

function cote(w: World): Scene {
    const sea = L(300, 4, 50, 0), beach = L(390, 14, 150, 1);
    return {
        sky: <>
            <Sun x={800} y={300} r={70} c="#fed7aa" halo="#fff1e0"/>
            <Cloud x={300} y={140} s={0.9} c="#ffe8d2" drift={40}/>
            <Cloud x={1300} y={110} s={1.1} c="#ffe8d2" drift={50}/>
            <Birds x={500} y={220} s={1} c="#7c2d12"/>
            <Birds x={1100} y={260} s={0.7} c="#7c2d12"/>
        </>,
        ground: <>
            <defs>
                <linearGradient id="co-sea" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0" stopColor={mix(w.far, "#ffffff", 0.25)}/>
                    <stop offset="1" stopColor={mix(w.far, "#000000", 0.2)}/>
                </linearGradient>
            </defs>
            <path d={wavePath(sea)} fill="url(#co-sea)"/>
            {[[200, 320], [520, 340], [1050, 330], [1380, 345], [700, 360], [1240, 365]].map(([x, y], i) =>
                <path key={i} d={`M${x} ${y} q12 -8 24 0 q12 -8 24 0`} stroke="#ffffff" strokeOpacity={0.6} strokeWidth={2.5} fill="none"/>)}
            <Boat x={1200} y={318} s={0.6} sail="#fef3c7"/>
            <Lighthouse x={1500} y={yAt(sea, 1500) + 4} s={0.9}/>
            <Hill id="co-beach" line={beach} top="#f6deaa" bottom="#e2bf7c"/>
            <path d={`M0 ${yAt(beach, 0) - 4} ${Array.from({length: 161}, (_, i) => `L${i * 10} ${(yAt(beach, i * 10) - 4).toFixed(1)}`).join(" ")}`}
                  stroke="#ffffff" strokeOpacity={0.7} strokeWidth={4} fill="none"/>
            <Palm x={120} y={yAt(beach, 120) + 14} s={1.4}/>
            <Palm x={330} y={yAt(beach, 330) + 14} s={1} flip/>
            <Palm x={1420} y={yAt(beach, 1420) + 14} s={1.5} flip/>
            <Palm x={1180} y={yAt(beach, 1180) + 14} s={0.9}/>
            <Rock x={480} y={yAt(beach, 480) + 12} c="#a8a29e"/>
            {[[220, 470], [440, 460], [1300, 470], [1100, 455]].map(([x, y], i) =>
                <path key={i} d={`M${x - 8} ${y} A8 8 0 0 1 ${x + 8} ${y} Z`} fill={i % 2 ? "#fda4af" : "#fef3c7"}/>)}
        </>,
    };
}

function marais(w: World): Scene {
    const far = L(260, 10, 150, 0), water = L(340, 3, 60, 0), near = L(430, 12, 100, 1);
    return {
        sky: <>
            <Moon x={300} y={130} r={28} c="#e7efd8"/>
            {[180, 260, 340].map((y, i) => <ellipse key={y} cx={800 + i * 200} cy={y} rx={500} ry={22} fill="#e5e7eb" opacity={0.12}/>)}
        </>,
        ground: <>
            <Hill id="ma-far" line={far} top={mix(w.far, w.sky[1], 0.4)} bottom={w.far} rim={false}/>
            {[80, 220, 1280, 1460].map((x, i) => <DeadTree key={x} x={x} y={yAt(far, x) + 6} s={0.7 + (i % 2) * 0.1} c="#3a4632"/>)}
            <path d={wavePath(water)} fill="#3d4d36"/>
            {[[150, 360], [420, 380], [1150, 370], [1400, 390], [300, 410], [1260, 420]].map(([x, y], i) => (
                <g key={i}>
                    <ellipse cx={x} cy={y} rx={22} ry={7} fill="#5a7a3a"/>
                    <path d={`M${x} ${y} L${x + 20} ${y - 3} L${x + 18} ${y + 4} Z`} fill="#3d4d36"/>
                    {i % 2 === 0 && <circle cx={x - 6} cy={y - 4} r={4} fill="#f9a8d4"/>}
                </g>
            ))}
            <ellipse cx={800} cy={330} rx={900} ry={18} fill="#e5e7eb" opacity={0.12}/>
            <Hill id="ma-near" line={near} top="#3c4e33" bottom="#26331f"/>
            <DeadTree x={110} y={yAt(near, 110) + 10} s={1.3}/>
            <DeadTree x={1490} y={yAt(near, 1490) + 10} s={1.4}/>
            <Reeds x={260} y={yAt(near, 260) + 8} s={1.4} c="#6b7a40"/>
            <Reeds x={470} y={yAt(near, 470) + 8} s={1.1} c="#6b7a40"/>
            <Reeds x={1140} y={yAt(near, 1140) + 8} s={1.3} c="#6b7a40"/>
            <Reeds x={1330} y={yAt(near, 1330) + 8} s={1.1} c="#6b7a40"/>
            <Mushroom x={380} y={yAt(near, 380) + 12} cap="#a3e635"/>
            <Grass line={near} from={20} to={540} color="#1a2414" dy={10}/>
            <Grass line={near} from={1060} to={1590} color="#1a2414" dy={10}/>
        </>,
    };
}

function savane(w: World): Scene {
    const far = L(290, 8, 200, 0), mid = L(350, 10, 160, 1), near = L(430, 8, 120, 2);
    return {
        sky: <>
            <Sun x={800} y={360} r={110} c="#fde047" halo="#fff2c2"/>
            <Birds x={320} y={180} s={1.2} c="#7c2d12"/>
            <Birds x={1200} y={230} s={0.8} c="#7c2d12"/>
        </>,
        ground: <>
            <Hill id="sa-far" line={far} top={mix(w.far, w.sky[1], 0.3)} bottom={w.far} rim={false}/>
            {[200, 420, 1150, 1400].map((x, i) => <Acacia key={x} x={x} y={yAt(far, x) + 4} s={0.45 + (i % 2) * 0.1} c="#7a5a2a" trunk="#5a3d22"/>)}
            <Hill id="sa-mid" line={mid} top="#c98a44" bottom="#a96d32"/>
            <Giraffe x={330} y={yAt(mid, 330) + 6} s={0.9} c="#b86f2c"/>
            <Giraffe x={1300} y={yAt(mid, 1300) + 6} s={0.75} flip c="#b86f2c"/>
            <Acacia x={1460} y={yAt(mid, 1460) + 6} s={0.9}/>
            <Hill id="sa-near" line={near} top="#8d5a26" bottom="#6b4119"/>
            <Acacia x={120} y={yAt(near, 120) + 10} s={1.5}/>
            <Rock x={480} y={yAt(near, 480) + 10} c="#8a6a4a"/>
            <Rock x={1150} y={yAt(near, 1150) + 10} c="#8a6a4a" s={1.2}/>
            <Grass line={near} from={20} to={540} color="#c9a05a" dy={10}/>
            <Grass line={near} from={1060} to={1590} color="#c9a05a" dy={10}/>
        </>,
    };
}

function desert(w: World): Scene {
    const far = L(260, 30, 220, 1), mid = L(350, 22, 170, 3), near = L(430, 16, 130, 0);
    return {
        sky: <>
            <Sun x={1300} y={120} r={52} c="#fffbeb" halo="#fff7d6"/>
            <Birds x={400} y={200} s={0.8} c="#7c4a12"/>
        </>,
        ground: <>
            <Hill id="de-far" line={far} top={mix(w.far, w.sky[1], 0.4)} bottom={w.far}/>
            <Hill id="de-mid" line={mid} top="#e8b867" bottom="#d19a4a"/>
            <ellipse cx={1320} cy={yAt(mid, 1320) + 26} rx={90} ry={16} fill="#38bdf8"/>
            <ellipse cx={1320} cy={yAt(mid, 1320) + 22} rx={70} ry={8} fill="#7dd3fc"/>
            <Palm x={1240} y={yAt(mid, 1240) + 20} s={0.8}/>
            <Palm x={1400} y={yAt(mid, 1400) + 20} s={0.95} flip/>
            <Camel x={300} y={yAt(mid, 300) + 8} s={1}/>
            <Camel x={400} y={yAt(mid, 400) + 8} s={0.8}/>
            <Hill id="de-near" line={near} top="#d9a456" bottom="#b5803a"/>
            <Cactus x={120} y={yAt(near, 120) + 12} s={1.3}/>
            <Cactus x={1500} y={yAt(near, 1500) + 12} s={1.1}/>
            <Rock x={1150} y={yAt(near, 1150) + 10} c="#a87d48"/>
            <path d={`M60 ${yAt(near, 60) + 30} q40 -10 80 0 q40 -10 80 0 M1250 ${yAt(near, 1250) + 30} q40 -10 80 0 q40 -10 80 0`} stroke="#f6d79a" strokeWidth={3} fill="none" opacity={0.7}/>
        </>,
    };
}

function canyon(w: World): Scene {
    const near = L(430, 8, 110, 1);
    return {
        sky: <>
            <Sun x={300} y={140} r={48} c="#fef3c7"/>
            <Birds x={1100} y={160} s={1.3} c="#5a1f10"/>
        </>,
        ground: <>
            <Mesa x={250} y={330} s={1.2} c={mix(w.far, w.sky[1], 0.3)}/>
            <Mesa x={1350} y={320} s={1.4} c={mix(w.far, w.sky[1], 0.3)}/>
            <Hill id="ca-mid" line={L(340, 14, 150, 2)} top="#c2603e" bottom="#9a452a"/>
            <Mesa x={80} y={400} s={0.9} c={w.far}/>
            <Mesa x={1520} y={410} s={0.8} c={w.far}/>
            <Hill id="ca-near" line={near} top={w.near} bottom={mix(w.near, "#000000", 0.25)}/>
            <Cactus x={420} y={yAt(near, 420) + 10} s={1.2} c="#4d7c3a"/>
            <Cactus x={1180} y={yAt(near, 1180) + 10} s={1} c="#4d7c3a"/>
            <Rock x={280} y={yAt(near, 280) + 10} c="#8e3b26" s={1.3}/>
            <Rock x={1330} y={yAt(near, 1330) + 10} c="#8e3b26"/>
            <Bush x={500} y={yAt(near, 500) + 10} c="#6b7a40" light="#8a9a55" s={0.8}/>
        </>,
    };
}

function montagne(w: World): Scene {
    const mid = L(350, 14, 110, 1), near = L(430, 10, 90, 0);
    return {
        sky: <>
            <Sun x={1320} y={120} r={40} c="#fefce8"/>
            <Cloud x={420} y={180} s={1} drift={50}/>
            <Cloud x={1050} y={250} s={0.7} drift={40}/>
        </>,
        ground: <>
            <Peak x={300} y={330} h={300} w={300} c={mix(w.far, w.sky[1], 0.3)}/>
            <Peak x={1250} y={330} h={340} w={320} c={mix(w.far, w.sky[1], 0.3)}/>
            <Peak x={760} y={330} h={200} w={240} c={mix(w.far, w.sky[1], 0.45)}/>
            <Hill id="mo-mid" line={mid} top="#6f8f6a" bottom="#55745a"/>
            {[60, 140, 220, 1200, 1290, 1380, 1480, 1560].map((x, i) =>
                <Pine key={x} x={x} y={yAt(mid, x) + 8} s={0.7 + (i % 2) * 0.12} snow c="#2f5d48" dark="#214636"/>)}
            <House x={380} y={yAt(mid, 380) + 8} s={0.8} wall="#a0704a" roof="#5a3a22" snow/>
            <Hill id="mo-near" line={near} top="#f1f5f9" bottom="#cbd5e1"/>
            <Pine x={90} y={yAt(near, 90) + 12} s={1.4} snow c="#2f5d48" dark="#214636"/>
            <Pine x={1500} y={yAt(near, 1500) + 12} s={1.5} snow c="#2f5d48" dark="#214636"/>
            <Rock x={460} y={yAt(near, 460) + 10} c="#64748b"/>
            <Rock x={1180} y={yAt(near, 1180) + 10} c="#64748b" s={1.2}/>
        </>,
    };
}

function banquise(w: World): Scene {
    const sea = L(330, 3, 60, 0), near = L(430, 10, 120, 1);
    return {
        sky: <>
            <Sun x={300} y={130} r={40} c="#ffffff" halo="#e0f2fe"/>
            <Cloud x={1100} y={150} s={1} c="#f0f9ff" drift={40}/>
        </>,
        ground: <>
            <Hill id="ba-far" line={L(270, 20, 140, 0)} top="#e6f4fa" bottom="#c4e3f0"/>
            <path d={wavePath(sea)} fill={mix(w.accent, "#0b3b5a", 0.4)}/>
            <Iceberg x={250} y={yAt(sea, 250) + 6} s={1}/>
            <Iceberg x={1300} y={yAt(sea, 1300) + 6} s={1.3}/>
            <Iceberg x={1520} y={yAt(sea, 1520) + 6} s={0.6}/>
            {[[480, 360], [1080, 370]].map(([x, y], i) => <ellipse key={i} cx={x} cy={y} rx={50} ry={8} fill="#e0f2fe"/>)}
            <Hill id="ba-near" line={near} top="#ffffff" bottom="#d6ebf5"/>
            <Igloo x={180} y={yAt(near, 180) + 10} s={1.2}/>
            <Penguin x={380} y={yAt(near, 380) + 10} s={1.2}/>
            <Penguin x={420} y={yAt(near, 420) + 10} s={0.9} flip/>
            <Penguin x={1180} y={yAt(near, 1180) + 10} s={1.1} flip/>
            <Penguin x={1220} y={yAt(near, 1220) + 10} s={0.8}/>
            <Rock x={1450} y={yAt(near, 1450) + 10} c="#a7c4d4"/>
        </>,
    };
}

function aurores(w: World): Scene {
    const near = L(430, 10, 120, 1);
    return {
        sky: <>
            <Stars n={90}/>
            {[0, 1, 2].map(i => (
                <path key={i} d={`M-100 ${160 + i * 50} Q300 ${60 + i * 40} 700 ${190 + i * 30} T1700 ${120 + i * 50}`}
                      stroke={i === 1 ? "#a78bfa" : w.accent} strokeWidth={60 - i * 14} fill="none" opacity={0.18}>
                    {MOTION && <animate attributeName="opacity" values="0.1;0.3;0.1" dur={`${8 + i * 3}s`} repeatCount="indefinite"/>}
                </path>
            ))}
            <Moon x={1350} y={110} r={26}/>
        </>,
        ground: <>
            <Hill id="au-far" line={L(290, 26, 150, 0)} top="#1b3a4f" bottom="#122a3a" rim={false}/>
            {Array.from({length: 16}, (_, i) => i * 105 + 20).filter(x => x < 560 || x > 1040).map((x, i) =>
                <Pine key={x} x={x} y={yAt(L(290, 26, 150, 0), x) + 6} s={0.5 + (i % 2) * 0.08} snow c="#13303f" dark="#0d2330"/>)}
            <Hill id="au-near" line={near} top="#dbeafe" bottom="#94a3b8"/>
            <Pine x={100} y={yAt(near, 100) + 12} s={1.4} snow c="#16394a" dark="#0e2a37"/>
            <Pine x={200} y={yAt(near, 200) + 12} s={1} snow c="#16394a" dark="#0e2a37"/>
            <Pine x={1480} y={yAt(near, 1480) + 12} s={1.5} snow c="#16394a" dark="#0e2a37"/>
            <House x={1260} y={yAt(near, 1260) + 10} s={0.9} wall="#7c5a3a" roof="#3b2a1a" snow/>
        </>,
    };
}

function cerisiers(w: World): Scene {
    const far = L(280, 20, 160, 0), near = L(430, 10, 110, 2);
    const pink = {leaf: "#f9a8d4", dark: "#ec7fb0", light: "#fce7f3", trunk: "#5b3a3a"};
    return {
        sky: <>
            <Sun x={1250} y={150} r={60} c="#fecdd3" halo="#fff1f2"/>
            <Cloud x={380} y={140} s={0.9} c="#fff1f5" drift={40}/>
        </>,
        ground: <>
            <Hill id="ce-far" line={far} top={mix(w.far, w.sky[1], 0.35)} bottom={w.far}/>
            {[80, 180, 300, 1220, 1340, 1470].map((x, i) => <Tree key={x} x={x} y={yAt(far, x) + 4} s={0.45 + (i % 2) * 0.06} {...pink}/>)}
            <Hill id="ce-mid" line={L(350, 10, 130, 1)} top="#a7c98a" bottom="#86ad6c"/>
            <Torii x={1300} y={yAt(L(350, 10, 130, 1), 1300) + 8} s={1}/>
            <Hill id="ce-near" line={near} top="#8fbf73" bottom="#6a9a53"/>
            <Tree x={130} y={yAt(near, 130) + 12} s={1.5} {...pink}/>
            <Tree x={1480} y={yAt(near, 1480) + 12} s={1.5} {...pink}/>
            <Lantern x={380} y={yAt(near, 380) + 10} s={1.1}/>
            <Lantern x={1150} y={yAt(near, 1150) + 10} s={1.1}/>
            <Rock x={480} y={yAt(near, 480) + 10} c="#9ca3af"/>
            {Array.from({length: 18}, (_, i) => i < 9 ? 30 + i * 55 : 1080 + (i - 9) * 55).map(x =>
                <ellipse key={x} cx={x} cy={yAt(near, x) + 18 + (x % 3) * 6} rx={4} ry={2.5} fill="#fbcfe8"/>)}
        </>,
    };
}

function jungle(w: World): Scene {
    const near = L(430, 10, 100, 1);
    return {
        sky: <>
            {[60, 150, 260, 1320, 1430, 1530].map((x, i) => (
                <g key={x}>
                    <path d={`M${x} 0 Q${x + 18} ${120 + i * 15} ${x - 6} ${230 + i * 20}`} stroke="#14532d" strokeWidth={5} fill="none"/>
                    {[60, 120, 180].map(y => <ellipse key={y} cx={x + 8} cy={y + i * 8} rx={12} ry={6} fill="#166534" transform={`rotate(-30 ${x + 8} ${y + i * 8})`}/>)}
                </g>
            ))}
            <Birds x={900} y={160} s={1} c="#052e16"/>
        </>,
        ground: <>
            <Hill id="ju-far" line={L(260, 24, 120, 0)} top={mix(w.far, w.sky[1], 0.3)} bottom={w.far} rim={false}/>
            <Temple x={1250} y={300} s={1.2} c="#8a8f74"/>
            <Hill id="ju-mid" line={L(360, 16, 100, 2)} top="#14703a" bottom="#0c552b"/>
            {[60, 200, 330, 1150, 1450].map((x, i) => <Palm key={x} x={x} y={yAt(L(360, 16, 100, 2), x) + 10} s={0.9 + (i % 2) * 0.2} leaf="#16a34a" dark="#0f7a37"/>)}
            <Hill id="ju-near" line={near} top="#065f46" bottom="#033d2e"/>
            <BigLeaf x={40} y={yAt(near, 40) + 14} s={1.6} a={20}/>
            <BigLeaf x={150} y={yAt(near, 150) + 14} s={1.2} a={-15} c="#15803d"/>
            <BigLeaf x={480} y={yAt(near, 480) + 14} s={1} a={25}/>
            <BigLeaf x={1120} y={yAt(near, 1120) + 14} s={1.1} a={-20} c="#15803d"/>
            <BigLeaf x={1450} y={yAt(near, 1450) + 14} s={1.5} a={15}/>
            <BigLeaf x={1560} y={yAt(near, 1560) + 14} s={1.3} a={-25} c="#15803d"/>
            <Flowers x={300} y={yAt(near, 300) + 14} colors={["#f97316", "#facc15"]}/>
            <Flowers x={1280} y={yAt(near, 1280) + 14} colors={["#ec4899", "#f97316"]}/>
        </>,
    };
}

function abysses(w: World): Scene {
    const floor = L(420, 14, 140, 1);
    return {
        sky: <>
            {[200, 520, 1080, 1400].map((x, i) => <path key={x} d={`M${x} -20 L${x + 80} -20 L${x + 220 + i * 20} 600 L${x + 60} 600 Z`} fill="#bae6fd" opacity={0.06}/>)}
            <Fish x={800} y={260} s={0.8} c="#fde047" dur={40}/>
            <Fish x={800} y={330} s={0.6} c="#fb923c" dur={28} dx={-1800}/>
            <Jellyfish x={250} y={220} s={1.2}/>
            <Jellyfish x={1380} y={300} s={0.9} c="#a5f3fc"/>
        </>,
        ground: <>
            <Hill id="ab-far" line={L(300, 30, 160, 0)} top={mix(w.far, w.sky[1], 0.4)} bottom={w.far} rim={false}/>
            <Fish x={800} y={260} s={0.5} c="#67e8f9" dur={36}/>
            <Hill id="ab-floor" line={floor} top="#1c5a73" bottom="#0c3346"/>
            {[60, 130, 470, 1130, 1500, 1560].map((x, i) => <Seaweed key={x} x={x} y={yAt(floor, x) + 10} h={110 + (i % 3) * 40}/>)}
            <Coral x={250} y={yAt(floor, 250) + 10} s={1.4}/>
            <Coral x={360} y={yAt(floor, 360) + 10} s={0.9} c="#fb923c"/>
            <Coral x={1260} y={yAt(floor, 1260) + 10} s={1.2} c="#f472b6"/>
            <Coral x={1380} y={yAt(floor, 1380) + 10} s={1.5} c="#fbbf24"/>
            <Rock x={1000 + 120} y={yAt(floor, 1120) + 10} c="#30566a"/>
            {[180, 1450].map(x => (
                <g key={x} transform={`translate(${x} ${yAt(floor, x) + 12})`}>
                    <path d="M-16 0 A16 12 0 0 1 16 0 Z" fill="#e2e8f0"/>
                    <circle cx={0} cy={-4} r={4} fill="#f8fafc"/>
                </g>
            ))}
        </>,
    };
}

function cristaux(w: World): Scene {
    const near = L(430, 10, 100, 1);
    return {
        sky: <>
            <path d={`M0 0 H${SKY.w} V40 ${Array.from({length: 17}, (_, i) => `L${SKY.w - i * 100} ${40 + (i % 2 ? 30 : 90 + (i % 3) * 30)}`).join(" ")} L0 40 Z`} fill="#1e0b3d"/>
            {[150, 420, 1180, 1460].map((x, i) => <path key={x} d={`M${x - 14} 40 L${x} ${150 + i * 20} L${x + 14} 40 Z`} fill="#c084fc" opacity={0.7}/>)}
        </>,
        ground: <>
            <Hill id="cr-far" line={L(280, 26, 120, 0)} top={mix(w.far, w.sky[1], 0.3)} bottom={w.far} rim={false}/>
            <Crystal x={240} y={300} s={0.8} c="#7c3aed" light="#ddd6fe"/>
            <Crystal x={1340} y={290} s={0.9} c="#7c3aed" light="#ddd6fe"/>
            <Hill id="cr-near" line={near} top="#3b1a6e" bottom="#24104a"/>
            <Crystal x={110} y={yAt(near, 110) + 10} s={1.5} c="#c084fc" light="#faf5ff"/>
            <Crystal x={420} y={yAt(near, 420) + 10} s={1} c="#e879f9" light="#fdf4ff"/>
            <Crystal x={1170} y={yAt(near, 1170) + 10} s={1.1} c="#a78bfa" light="#f5f3ff"/>
            <Crystal x={1480} y={yAt(near, 1480) + 10} s={1.6} c="#c084fc" light="#faf5ff"/>
            <Rock x={290} y={yAt(near, 290) + 10} c="#4b3a6b"/>
        </>,
    };
}

function volcan(w: World): Scene {
    const near = L(430, 10, 90, 1);
    return {
        sky: <>
            <Cloud x={700} y={110} s={1.6} c="#3f3a36" opacity={0.85} drift={30}/>
            <Cloud x={1050} y={170} s={1.2} c="#57534e" opacity={0.7} drift={40}/>
            <Cloud x={300} y={150} s={1} c="#292524" opacity={0.8}/>
        </>,
        ground: <>
            <Volcano x={1200} y={340} s={1} c={w.far}/>
            <Hill id="vo-mid" line={L(350, 18, 120, 2)} top="#3a3330" bottom="#26211f"/>
            <path d={`M0 ${yAt(near, 0) + 20} Q300 400 520 470 L560 ${H} L0 ${H} Z`} fill="#ea580c" opacity={0.7}/>
            <Hill id="vo-near" line={near} top="#2b2522" bottom="#171311"/>
            <path d="M100 470 Q260 440 420 480" stroke="#f97316" strokeWidth={8} fill="none" opacity={0.8}/>
            <path d="M1100 480 Q1300 450 1560 470" stroke="#f97316" strokeWidth={6} fill="none" opacity={0.7}/>
            <DeadTree x={120} y={yAt(near, 120) + 10} s={1.3} c="#1c1917"/>
            <DeadTree x={1480} y={yAt(near, 1480) + 10} s={1.2} c="#1c1917"/>
            <Rock x={360} y={yAt(near, 360) + 10} c="#44403c" s={1.3}/>
            <Rock x={1200} y={yAt(near, 1200) + 10} c="#44403c"/>
        </>,
    };
}

function cite(w: World): Scene {
    const near = L(430, 8, 120, 1);
    return {
        sky: <>
            <Sun x={300} y={140} r={50} c="#fef3c7"/>
            <Cloud x={1200} y={140} s={1} c="#fdf8ec" drift={40}/>
            <Birds x={800} y={210} s={0.8} c="#57442a"/>
        </>,
        ground: <>
            <Hill id="ci-far" line={L(290, 16, 160, 0)} top={mix(w.far, w.sky[1], 0.3)} bottom={w.far}/>
            {[120, 240, 360, 1220, 1340, 1460].map((x, i) => <Column key={x} x={x} y={300 + (i % 2) * 6} s={0.6} broken={i % 3 === 1} c="#d8c9a8"/>)}
            <Hill id="ci-mid" line={L(360, 10, 130, 2)} top="#b8a07a" bottom="#9a835e"/>
            <Arch x={1320} y={yAt(L(360, 10, 130, 2), 1320) + 8} s={1}/>
            <Hill id="ci-near" line={near} top="#8e7653" bottom="#6d5a3e"/>
            <Column x={80} y={yAt(near, 80) + 12} s={1.4} c="#e7dcc4"/>
            <Column x={240} y={yAt(near, 240) + 12} s={1.2} broken c="#e7dcc4"/>
            <Column x={1480} y={yAt(near, 1480) + 12} s={1.5} broken c="#e7dcc4"/>
            <Rock x={420} y={yAt(near, 420) + 10} c="#c8b796"/>
            <Rock x={1150} y={yAt(near, 1150) + 10} c="#c8b796" s={1.3}/>
            <Bush x={330} y={yAt(near, 330) + 10} c="#5a7a3a" light="#7a9a55"/>
        </>,
    };
}

function iles(w: World): Scene {
    return {
        sky: <>
            <Sun x={1300} y={130} r={50} c="#fffbeb"/>
            <Cloud x={250} y={150} s={1.2} drift={60}/>
            <Cloud x={900} y={90} s={0.8} drift={40}/>
            <FloatingIsland x={420} y={300} s={0.8}/>
            <FloatingIsland x={1250} y={260} s={0.6} tree={false}/>
            <Birds x={700} y={220} s={0.9} c="#4338ca"/>
        </>,
        ground: <>
            {[100, 380, 660, 940, 1220, 1500].map((x, i) => <Cloud key={x} x={x} y={300 + (i % 2) * 20} s={1.6} c={mix(w.far, w.sky[1], 0.3)} opacity={0.9}/>)}
            {[0, 300, 600, 900, 1200, 1500].map((x, i) => <Cloud key={x} x={x + 60} y={420 + (i % 2) * 14} s={2} c="#ffffff" opacity={1}/>)}
            <FloatingIsland x={180} y={330} s={1.1}/>
            <FloatingIsland x={1420} y={340} s={1.2}/>
            <Rect y={460} fill="#ffffff"/>
        </>,
    };
}

const Rect = ({y, fill}: { y: number; fill: string }) => <rect x={0} y={y} width={W} height={H - y} fill={fill}/>;

function orage(w: World): Scene {
    const near = L(430, 12, 100, 1);
    return {
        sky: <>
            {[150, 520, 900, 1300].map((x, i) => <Cloud key={x} x={x} y={110 + (i % 2) * 40} s={1.8} c="#1f2937" opacity={0.95}/>)}
            {[330, 1100].map((x, i) => (
                <path key={x} d={`M${x} 140 L${x - 40} 260 L${x - 10} 260 L${x - 60} 400`} stroke="#fef9c3" strokeWidth={5} fill="none" strokeLinejoin="round" opacity={0}>
                    {MOTION && <animate attributeName="opacity" values="0;0;1;0;1;0;0" keyTimes="0;0.8;0.82;0.84;0.86;0.9;1" dur={`${7 + i * 3}s`} repeatCount="indefinite"/>}
                </path>
            ))}
            {[0, 1, 2, 3, 4, 5].map(i => <path key={i} d={`M${i * 300 + 40} 150 l-40 260`} stroke="#94a3b8" strokeWidth={2} opacity={0.15}/>)}
        </>,
        ground: <>
            <Hill id="or-far" line={L(280, 20, 150, 0)} top={mix(w.far, w.sky[1], 0.2)} bottom={w.far} rim={false}/>
            <Lighthouse x={1380} y={yAt(L(280, 20, 150, 0), 1380) + 6} s={0.9}/>
            <Hill id="or-mid" line={L(360, 14, 110, 2)} top="#273244" bottom="#1a2232"/>
            {[80, 220, 1180, 1500].map((x, i) => (
                <g key={x} transform={`translate(${x} ${yAt(L(360, 14, 110, 2), x) + 8}) skewX(-10)`}>
                    <Tree x={0} y={0} s={0.8 + (i % 2) * 0.2} leaf="#2f4a3a" dark="#22382c" light="#3f5f4c" trunk="#2b211a"/>
                </g>
            ))}
            <Hill id="or-near" line={near} top="#141c2b" bottom="#0b111c"/>
            <Rock x={400} y={yAt(near, 400) + 10} c="#334155" s={1.3}/>
            <Rock x={1200} y={yAt(near, 1200) + 10} c="#334155"/>
            <Grass line={near} from={20} to={540} color="#1e293b" dy={10}/>
            <Grass line={near} from={1060} to={1590} color="#1e293b" dy={10}/>
        </>,
    };
}

function cosmos(w: World): Scene {
    const ground = L(440, 8, 160, 0);
    return {
        sky: <>
            <Stars n={140} maxY={600}/>
            <ellipse cx={500} cy={220} rx={420} ry={110} fill="#7c3aed" opacity={0.18} transform="rotate(-12 500 220)"/>
            <ellipse cx={560} cy={240} rx={260} ry={60} fill="#f0abfc" opacity={0.12} transform="rotate(-12 560 240)"/>
            <Planet x={1300} y={160} r={56} c="#f59e0b" ring="#fde68a"/>
            <Planet x={280} y={420} r={26} c="#38bdf8"/>
            <Planet x={1500} y={430} r={16} c="#f472b6"/>
            <path d="M900 80 l140 60" stroke="#f8fafc" strokeWidth={2} strokeLinecap="round" opacity={0}>
                {MOTION && <animate attributeName="opacity" values="0;0;0.9;0" keyTimes="0;0.9;0.93;1" dur="9s" repeatCount="indefinite"/>}
            </path>
        </>,
        ground: <>
            <circle cx={800} cy={H + 1500} r={1900} fill={mix(w.near, "#ffffff", 0.08)}/>
            <Hill id="cs-ground" line={ground} top="#3a357e" bottom="#1e1b4b"/>
            <Crater x={200} y={yAt(ground, 200) + 22} s={1.2}/>
            <Crater x={470} y={yAt(ground, 470) + 30} s={0.8}/>
            <Crater x={1180} y={yAt(ground, 1180) + 26} s={1}/>
            <Crater x={1470} y={yAt(ground, 1470) + 20} s={1.4}/>
            <Rocket x={330} y={yAt(ground, 330) + 8} s={1.2}/>
            <g transform={`translate(1320 ${yAt(ground, 1320) + 6})`}>
                <rect x={-2} y={-70} width={4} height={70} fill="#e2e8f0"/>
                <path d="M2 -70 L40 -60 L2 -50 Z" fill={w.accent}/>
            </g>
        </>,
    };
}

const SCENES: ((w: World) => Scene)[] = [
    plaine, foret, riviere, cote, marais, savane, desert, canyon, montagne, banquise,
    aurores, cerisiers, jungle, abysses, cristaux, volcan, cite, iles, orage, cosmos,
];

// partie du décor d'un monde : le ciel (calé en haut de l'écran) ou le sol (calé en bas)
export function WorldScene({index, world, part}: { index: number; world: World; part: "sky" | "ground" }) {
    const scene = SCENES[((index % SCENES.length) + SCENES.length) % SCENES.length]!(world);
    const box = part === "sky" ? SKY : GROUND;
    return (
        <svg className={`world-${part}`} viewBox={`0 0 ${box.w} ${box.h}`}
             preserveAspectRatio={part === "sky" ? "xMidYMin slice" : "xMidYMax slice"}>
            {scene[part]}
        </svg>
    );
}
