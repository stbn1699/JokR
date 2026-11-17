/**
 * Décor d'un monde, derrière la carte des niveaux : un ciel en dégradé, deux couches de silhouettes plates en bas de
 * l'écran (collines, sapins, dunes, colonnes…) et quelques particules (lucioles, flocons, bulles, braises, étoiles…).
 * Calque fixé à l'écran, sous le contenu ; il recouvre le fond choisi en boutique sur cette page seulement.
 * Les particules s'arrêtent si l'utilisateur préfère réduire les animations.
 */

import {type CSSProperties, useMemo} from "react";
import type {Terrain, World} from "./worlds.ts";

// le décor est dessiné dans une boîte de W × H, calée en bas de l'écran
const W = 1200;
const H = 360;

const f = (n: number) => n.toFixed(1);

// sol ondulé : y de base, amplitude, période, décalage
function wave(y: number, amp: number, period: number, phase: number): string {
    let d = `M0 ${H} L0 ${f(y + amp * Math.sin(phase))}`;
    for (let x = 0; x <= W; x += 20) d += ` L${x} ${f(y + amp * Math.sin(x / period + phase))}`;
    return `${d} L${W} ${H} Z`;
}

// rangée de pointes (sapins, cristaux, sommets) posée sur une bande de sol
function spikes(n: number, base: number, height: number, widthRatio: number, shift: number): string {
    let d = `M0 ${H} L0 ${base}`;
    for (let i = 0; i <= n; i++) {
        const x = (i + shift) * W / n, half = W / n * widthRatio / 2;
        const top = base - height * (0.7 + 0.3 * Math.sin(i * 2.3 + shift * 5));
        d += ` L${f(x - half)} ${base} L${f(x)} ${f(top)} L${f(x + half)} ${base}`;
    }
    return `${d} L${W} ${base} L${W} ${H} Z`;
}

// rangée de ronds (feuillages, coraux, nuages) sur une bande de sol
function blobs(n: number, base: number, r: number, shift: number, fill: string, ry = r): string {
    let s = `<rect x="0" y="${base}" width="${W}" height="${H - base}" fill="${fill}"/>`;
    for (let i = 0; i <= n; i++) {
        const x = (i + shift) * W / n, k = 0.75 + 0.25 * Math.sin(i * 1.7 + shift * 3);
        s += `<ellipse cx="${f(x)}" cy="${base}" rx="${f(r * k)}" ry="${f(ry * k)}" fill="${fill}"/>`;
    }
    return s;
}

const path = (d: string, fill: string, extra = "") => `<path d="${d}" fill="${fill}"${extra}/>`;

function scenery(terrain: Terrain, far: string, near: string): string | undefined {
    switch (terrain) {
        case "hills":
            return path(wave(170, 28, 150, 0), far) + path(wave(255, 20, 105, 2), near);
        case "waves":
            return path(wave(190, 8, 45, 0), far) + path(wave(265, 10, 60, 1), near);
        case "dunes":
            return path(wave(175, 34, 210, 1), far) + path(wave(265, 24, 150, 3), near);
        case "trees":
            return path(spikes(30, 230, 150, 0.9, 0), far) + path(spikes(18, 320, 150, 0.95, 0.5), near);
        case "peaks": {
            let caps = "";
            for (let i = 0; i <= 5; i++) {
                const x = i * W / 5, top = 250 - 230 * (0.7 + 0.3 * Math.sin(i * 2.3));
                caps += `<path d="M${f(x - 34)} ${f(top + 46)} L${f(x)} ${f(top)} L${f(x + 34)} ${f(top + 46)} Z" fill="#f8fafc"/>`;
            }
            return path(spikes(5, 250, 230, 1, 0), far) + caps + path(wave(290, 16, 90, 0), near);
        }
        case "ice":
            return path(spikes(9, 230, 110, 0.7, 0.2), far) + path(wave(285, 5, 80, 0), near);
        case "aurora":
            return `<path d="M0 70 Q300 10 600 80 T1200 50 L1200 120 Q900 170 600 130 T0 150 Z" fill="${far}" opacity="0.55"/>`
                + `<path d="M0 120 Q300 70 600 140 T1200 110 L1200 150 Q900 200 600 170 T0 180 Z" fill="${far}" opacity="0.3"/>`
                + path(wave(270, 12, 130, 0), near);
        case "blossom":
            return blobs(9, 210, 85, 0, far, 60) + blobs(7, 300, 75, 0.5, near, 50);
        case "jungle":
            return blobs(12, 200, 70, 0, far) + blobs(8, 300, 80, 0.4, near, 60);
        case "reef":
            return path(wave(230, 14, 120, 1), far) + blobs(16, 320, 34, 0.3, near, 46);
        case "crystals":
            return path(spikes(22, 240, 190, 0.45, 0), far) + path(spikes(14, 320, 140, 0.5, 0.5), near);
        case "volcano":
            return `<path d="M260 ${H} L540 90 L640 90 L940 ${H} Z" fill="${far}"/>`
                + `<path d="M560 90 L580 200 L600 150 L612 90 Z" fill="#f97316" opacity="0.9"/>`
                + path(wave(285, 12, 70, 0), near);
        case "columns": {
            let cols = "";
            for (let i = 0; i < 9; i++) {
                const x = 40 + i * 140, top = 120 + 50 * ((i * 7) % 3);
                cols += `<rect x="${x}" y="${top}" width="44" height="${H - top}" fill="${far}"/><rect x="${x - 12}" y="${top - 16}" width="68" height="16" fill="${far}"/>`;
            }
            return cols + path(wave(295, 8, 120, 0), near);
        }
        case "clouds": {
            let clouds = "";
            for (let i = 0; i < 8; i++) clouds += `<ellipse cx="${i * 170 + 40}" cy="${f(170 + 20 * Math.sin(i * 2))}" rx="110" ry="42" fill="${far}" opacity="0.9"/>`;
            return clouds
                + `<path d="M120 270 L420 270 L360 340 L190 340 Z" fill="${near}"/><ellipse cx="270" cy="270" rx="160" ry="22" fill="${near}"/>`
                + `<path d="M780 290 L1080 290 L1020 350 L850 350 Z" fill="${near}"/><ellipse cx="930" cy="290" rx="160" ry="20" fill="${near}"/>`;
        }
        case "storm":
            return `<path class="world-bolt" d="M820 20 L770 140 L805 140 L750 260" stroke="#fde68a" stroke-width="6" fill="none"/>`
                + path(wave(200, 22, 130, 0), far) + path(wave(275, 14, 95, 1), near);
        case "space":
            return `<ellipse cx="380" cy="120" rx="320" ry="80" fill="${far}" opacity="0.45"/>`
                + `<circle cx="960" cy="110" r="46" fill="${far}"/><ellipse cx="960" cy="110" rx="80" ry="14" fill="none" stroke="#c4b5fd" stroke-width="4"/>`
                + `<circle cx="600" cy="${H + 640}" r="760" fill="${near}"/>`;
    }
}

// particules : positions et rythmes fixes (pas de hasard d'un rendu à l'autre)
const COUNT = 18;

export default function WorldBackdrop({world}: { world: World }) {
    const svg = useMemo(() => scenery(world.terrain, world.far, world.near) ?? "", [world]);
    return (
        <div className="world-backdrop" aria-hidden
             style={{background: `linear-gradient(${world.sky[0]}, ${world.sky[1]})`}}>
            <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMax slice" dangerouslySetInnerHTML={{__html: svg}}/>
            {world.particles !== "none" && (
                <div className={`world-particles ${world.particles}`}>
                    {Array.from({length: COUNT}, (_, i) => (
                        <span key={i} style={{
                            left: `${(i * 37 + 11) % 100}%`,
                            top: `${(i * 53 + 7) % 100}%`,
                            animationDelay: `${-((i * 1.7) % 9)}s`,
                            animationDuration: `${6 + (i * 1.3) % 6}s`,
                            "--s": `${0.6 + ((i * 7) % 5) / 5}`,
                        } as CSSProperties}/>
                    ))}
                </div>
            )}
        </div>
    );
}
