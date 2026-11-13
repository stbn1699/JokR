/**
 * Les rouleaux d'une machine à sous (3 à 5 colonnes) et ses lignes de gain.
 * Chaque rouleau est la bande de symboles répétée plusieurs fois ; un lancer la fait défiler de plus d'un tour
 * puis ralentir jusqu'à l'arrêt tiré par le serveur, les rouleaux s'arrêtant l'un après l'autre (gauche à droite).
 * Les lignes jouées sont tracées en couleur et numérotées (discrètes, ou bien visibles quand `showLines`). Masquées
 * par le joueur (`linesVisible`), elles n'apparaissent qu'un instant, en grand, quand il en change le nombre ;
 * après un lancer, les lignes gagnantes s'allument en doré avec les cases qui comptent.
 * Le parent lance avec spin(stops) (via ref) et apprend la fin par onStopped. Changer de nombre de colonnes :
 * le parent recrée le composant (key).
 */

import {type CSSProperties, forwardRef, useImperativeHandle, useRef, useState} from "react";
import {SLOT_ROWS, slotLines, type SlotMachine} from "../../../../backend/src/utils/slots.ts";
import {LINE_COLORS} from "./slotColors.ts";

// Répétitions de la bande : assez pour 3 tours et les lignes visibles
const LOOPS = 6;
// Durée du défilement du premier rouleau, et délai entre deux arrêts (secondes)
const FIRST_STOP_S = 1.1;
const STOP_GAP_S = 0.35;

export type SlotReelsHandle = { spin: (stops: number[]) => void };

type SlotReelsProps = {
    machine: SlotMachine;
    // arrêts affichés au départ : leur nombre donne le nombre de colonnes
    initialStops: number[];
    // nombre de lignes jouées, et lignes bien visibles (choix du nombre de lignes)
    lines: number;
    showLines: boolean;
    // tracés et numéros des lignes jouées affichés (choix du joueur) ; les lignes gagnantes s'allument toujours
    linesVisible: boolean;
    // lignes gagnantes à montrer (après l'arrêt) : ligne et nombre de cases depuis la gauche
    wins: { line: number; count: number }[];
    spinning: boolean;
    onStopped: () => void;
};

const SlotReels = forwardRef<SlotReelsHandle, SlotReelsProps>(function SlotReels(props, ref) {
    const {machine, initialStops, lines, showLines, linesVisible, wins, spinning, onStopped} = props;
    const reels = initialStops.length;
    const length = machine.strip.length;
    const columns = useRef<(HTMLDivElement | null)[]>([]);
    // position de chaque rouleau : indice (dans la bande répétée) du symbole en haut de la fenêtre
    const positions = useRef(initialStops.map(s => s + length));
    const [initial] = useState(positions.current);
    const symbol = (id: string) => machine.symbols.find(s => s.id === id)!;
    const played = slotLines(reels, lines);

    useImperativeHandle(ref, () => ({
        spin(stops: number[]) {
            stops.forEach((stop, r) => {
                const el = columns.current[r];
                if (!el) return;
                // on repart du même symbole, ramené au 2e tour de la bande, sans animation
                const from = (positions.current[r]! % length) + length;
                el.style.transition = "none";
                el.style.setProperty("--p", String(from));
                void el.offsetHeight;
                // puis défilement jusqu'à l'arrêt, sur la 4e bande (plus d'un tour complet plus loin)
                const to = stop + length * 3;
                el.style.transition = `transform ${FIRST_STOP_S + r * STOP_GAP_S}s cubic-bezier(.12, .7, .25, 1.03)`;
                el.style.setProperty("--p", String(to));
                positions.current[r] = to;
            });
            window.setTimeout(onStopped, (FIRST_STOP_S + (stops.length - 1) * STOP_GAP_S) * 1000 + 80);
        },
    }), [length, onStopped]);

    // pastilles numérotées à gauche : décalées quand plusieurs lignes partent de la même case
    const badgeOffset = played.map((rows, i) => played.slice(0, i).filter(other => other[0] === rows[0]).length);
    const point = (reel: number, row: number) => `${reel * 100 + 50},${row * 100 + 50}`;

    return (
        <div className="slot-window" style={{"--reels": reels} as CSSProperties}>
            {Array.from({length: reels}, (_, r) => (
                <div className="slot-reel" key={r}>
                    <div className="slot-strip" ref={el => {
                        columns.current[r] = el;
                    }} style={{"--p": initial[r]} as CSSProperties}>
                        {Array.from({length: LOOPS}, () => machine.strip).flat().map((id, i) => (
                            <div className="slot-cell" key={i}>
                                <img src={symbol(id).image} alt={symbol(id).name} draggable={false}/>
                            </div>
                        ))}
                    </div>
                </div>
            ))}
            <svg className={`slot-lines ${showLines ? "show" : !linesVisible ? "hidden" : ""} ${spinning ? "spinning" : ""} ${wins.length ? "has-wins" : ""}`}
                 viewBox={`0 0 ${reels * 100} ${SLOT_ROWS * 100}`} preserveAspectRatio="none" aria-hidden>
                {/* lignes jouées, chacune sa couleur */}
                {played.map((rows, i) => (
                    <polyline key={i} className="slot-line-played" stroke={LINE_COLORS[i]}
                              points={rows.map((row, reel) => point(reel, row)).join(" ")}/>
                ))}
                {/* lignes gagnantes : cases qui comptent et tracé doré */}
                {wins.map(w => played[w.line]!.slice(0, w.count).map((row, reel) => (
                    <rect key={`${w.line}-${reel}`} className="slot-line-cell" x={reel * 100 + 6} y={row * 100 + 6} width="88" height="88" rx="12"/>
                )))}
                {wins.map(w => (
                    <polyline key={`w${w.line}`} className="slot-line" points={played[w.line]!.map((row, reel) => point(reel, row)).join(" ")}/>
                ))}
            </svg>
            {/* numéros des lignes, à gauche de la fenêtre */}
            <div className={`slot-line-badges ${showLines ? "show" : !linesVisible ? "hidden" : ""}`} aria-hidden>
                {played.map((rows, i) => (
                    <span key={i} className={wins.some(w => w.line === i) ? "win" : ""}
                          style={{"--row": rows[0], "--k": badgeOffset[i], background: LINE_COLORS[i]} as CSSProperties}>{i + 1}</span>
                ))}
            </div>
        </div>
    );
});

export default SlotReels;
