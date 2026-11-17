/**
 * Décor d'un monde, derrière la carte des niveaux : le ciel en dégradé, avec en haut ses éléments (soleil, nuages,
 * aurores, planètes…) et en bas le sol détaillé du monde (voir worldScenes.tsx), puis les particules qui passent devant
 * (feuilles, pétales, éclats de lumière, flocons, bulles, braises…).
 * Calque fixé à l'écran, sous le contenu ; il recouvre le fond choisi en boutique sur cette page seulement.
 * Les particules et les petits mouvements s'arrêtent si l'utilisateur préfère réduire les animations.
 */

import "./LevelsMap.scss";
import type {CSSProperties, ReactNode} from "react";
import {WorldScene} from "./worldScenes.tsx";
import type {ParticleKind, World} from "./worlds.ts";

// formes des particules dessinées (les autres sont des points en CSS)
const SHAPES: Partial<Record<ParticleKind, (c: string) => ReactNode>> = {
    leaves: c => <>
        <path d="M0 -9 Q8 -2 0 9 Q-8 -2 0 -9 Z" fill={c}/>
        <path d="M0 -7 V8" stroke="#000" strokeOpacity={0.25} strokeWidth={1}/>
    </>,
    petals: c => <path d="M0 -7 Q7 -1 0 7 Q-4 0 0 -7 Z" fill={c}/>,
    sparkles: c => <path d="M0 -9 L2 -2 L9 0 L2 2 L0 9 L-2 2 L-9 0 L-2 -2 Z" fill={c}/>,
};

// combien de particules de chaque sorte
const COUNT: Record<ParticleKind, number> = {
    leaves: 14, petals: 22, sparkles: 22, fireflies: 18, snow: 40, bubbles: 18, embers: 24, dust: 26, rain: 60,
};

// position et rythme fixes pour la particule i (pas de hasard d'un rendu à l'autre)
function particleStyle(i: number, kind: ParticleKind): CSSProperties {
    const fast = kind === "rain";
    return {
        left: `${(i * 37 + 11) % 100}%`,
        top: `${(i * 53 + 7) % 100}%`,
        animationDelay: `${-((i * 1.7) % (fast ? 1.2 : 14))}s`,
        animationDuration: fast ? `${0.8 + (i % 4) * 0.15}s` : `${(kind === "leaves" || kind === "petals" ? 12 : 7) + (i * 1.3) % 7}s`,
        "--s": `${0.6 + ((i * 7) % 5) / 6}`,
    } as CSSProperties;
}

// framed : dans un cadre (fenêtre de la fête du nouveau monde) au lieu de tout l'écran
export default function WorldBackdrop({index, world, framed}: { index: number; world: World; framed?: boolean }) {
    return (
        <div className={`world-backdrop ${framed ? "framed" : ""}`} aria-hidden
             style={{background: `linear-gradient(${world.sky[0]}, ${world.sky[1]} 70%)`}}>
            <WorldScene index={index} world={world} part="sky"/>
            <WorldScene index={index} world={world} part="ground"/>
            {world.particles.map(({kind, colors}) => (
                <div key={kind} className={`world-particles ${kind}`}>
                    {Array.from({length: COUNT[kind]}, (_, i) => {
                        const color = colors[i % colors.length]!;
                        const shape = SHAPES[kind];
                        return (
                            <span key={i} style={{...particleStyle(i, kind), "--c": color} as CSSProperties}>
                                {shape && <svg viewBox="-10 -10 20 20">{shape(color)}</svg>}
                            </span>
                        );
                    })}
                </div>
            ))}
        </div>
    );
}
