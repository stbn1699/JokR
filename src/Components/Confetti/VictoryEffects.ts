/**
 * Effets de victoire (fin de grille), choisis dans la boutique : chacun pose un calque plein écran par-dessus la page
 * (sans bloquer les clics), joue quelques secondes puis se retire tout seul.
 * - confettis : l'animation historique (Confetti.tsx)
 * - artifice : des fusées qui montent et éclatent (canvas)
 * - jetons, cartes : une pluie d'objets qui tournoient en tombant
 * - etoiles : une gerbe d'étoiles dorées depuis le centre
 * - bulles : des bulles qui montent en ondulant et éclatent en haut
 * Avec « réduire les animations » (prefers-reduced-motion), seuls les confettis (courts) sont joués.
 */

import "./VictoryEffects.scss";
import {confetti} from "./Confetti.tsx";
import {CHIP_VALUES} from "../../Services/chips.ts";
import {chipFile, currentChipSet} from "../../Services/chipSets.ts";

const rand = (min: number, max: number) => Math.random() * (max - min) + min;
const pick = <T, >(items: readonly T[]): T => items[Math.floor(Math.random() * items.length)]!;

// Calque plein écran, retiré après `ms`
function layer(className: string, ms: number): HTMLDivElement {
    const el = document.createElement("div");
    el.className = `victory-fx ${className}`;
    el.setAttribute("aria-hidden", "true");
    document.body.appendChild(el);
    window.setTimeout(() => el.remove(), ms);
    return el;
}

// Objet animé en CSS : position de départ, durée, délai et variables lues par les @keyframes
function piece(parent: HTMLElement, el: HTMLElement, style: Record<string, string>) {
    for (const [key, value] of Object.entries(style)) el.style.setProperty(key, value);
    parent.appendChild(el);
}

// ---------- Feux d'artifice : fusées puis gerbes de particules (gravité, fondu)
function fireworks() {
    const root = layer("victory-fireworks", 4200);
    const canvas = document.createElement("canvas");
    root.appendChild(canvas);
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const dpr = window.devicePixelRatio || 1;
    const w = window.innerWidth;
    const h = window.innerHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.scale(dpr, dpr);

    type Spark = { x: number; y: number; vx: number; vy: number; life: number; color: string };
    type Rocket = { x: number; y: number; vy: number; targetY: number; at: number; color: string; done: boolean };
    const rockets: Rocket[] = Array.from({length: 7}, (_, i) => ({
        x: rand(0.15, 0.85) * w, y: h + 10, vy: -rand(700, 900), targetY: rand(0.15, 0.45) * h,
        at: i * 260 + rand(0, 120), color: `hsl(${rand(0, 360)}, 95%, 62%)`, done: false,
    }));
    const sparks: Spark[] = [];
    const start = performance.now();
    let last = start;

    const frame = (now: number) => {
        const dt = Math.min((now - last) / 1000, 0.05);
        last = now;
        ctx.clearRect(0, 0, w, h);
        for (const r of rockets) {
            if (r.done || now - start < r.at) continue;
            r.y += r.vy * dt;
            ctx.fillStyle = "#fff6d0";
            ctx.fillRect(r.x - 1.5, r.y, 3, 14);
            if (r.y <= r.targetY) {
                r.done = true;
                for (let i = 0; i < 80; i++) {
                    const angle = (i / 80) * Math.PI * 2;
                    const speed = rand(120, 340);
                    sparks.push({x: r.x, y: r.y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, life: 1, color: r.color});
                }
            }
        }
        for (const s of sparks) {
            s.vy += 220 * dt;
            s.vx *= 0.985;
            s.x += s.vx * dt;
            s.y += s.vy * dt;
            s.life -= dt / 1.4;
            if (s.life <= 0) continue;
            ctx.globalAlpha = s.life;
            ctx.fillStyle = s.color;
            ctx.beginPath();
            ctx.arc(s.x, s.y, 2.6, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.globalAlpha = 1;
        if (now - start < 4000) requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
}

// ---------- Pluie d'objets (jetons, cartes) : ils tombent en tournoyant, lancés pendant 1,5 s
function rain(className: string, count: number, make: () => HTMLElement) {
    const root = layer(className, 4800);
    for (let i = 0; i < count; i++) {
        piece(root, make(), {
            "left": `${rand(-2, 98)}vw`,
            "animation-duration": `${rand(1.8, 3)}s`,
            "animation-delay": `${rand(0, 1.5)}s`,
            "--spin": `${rand(360, 1080) * (Math.random() < 0.5 ? -1 : 1)}deg`,
            "--sway": `${rand(-12, 12)}vw`,
        });
    }
}

function chipRain() {
    const set = currentChipSet();
    rain("victory-chips", 45, () => {
        const img = document.createElement("img");
        img.src = chipFile(pick(CHIP_VALUES), set);
        img.alt = "";
        return img;
    });
}

const SUITS = [["♠", "black"], ["♥", "red"], ["♦", "red"], ["♣", "black"]] as const;

function cardRain() {
    rain("victory-cards", 36, () => {
        const card = document.createElement("span");
        const [suit, color] = pick(SUITS);
        card.className = `card ${color}`;
        card.textContent = suit;
        return card;
    });
}

// ---------- Étoiles : deux gerbes depuis le centre de l'écran
function stars() {
    const root = layer("victory-stars", 3200);
    for (let i = 0; i < 46; i++) {
        const angle = rand(0, Math.PI * 2);
        const distance = rand(18, 48);
        const star = document.createElement("span");
        star.textContent = "★";
        piece(root, star, {
            "--dx": `${Math.cos(angle) * distance}vmax`,
            "--dy": `${Math.sin(angle) * distance}vmax`,
            "font-size": `${rand(18, 46)}px`,
            "animation-duration": `${rand(1.2, 2.2)}s`,
            "animation-delay": `${i < 23 ? 0 : 0.45}s`,
        });
    }
}

// ---------- Bulles : elles montent en ondulant et éclatent en haut
function bubbles() {
    const root = layer("victory-bubbles", 5200);
    for (let i = 0; i < 40; i++) {
        const size = rand(18, 64);
        piece(root, document.createElement("span"), {
            "left": `${rand(0, 96)}vw`,
            "width": `${size}px`,
            "height": `${size}px`,
            "animation-duration": `${rand(2.4, 3.6)}s`,
            "animation-delay": `${rand(0, 1.4)}s`,
            "--sway": `${rand(2, 6)}vw`,
        });
    }
}

const EFFECTS: Record<string, () => void> = {
    "victory-confettis": confetti,
    "victory-artifice": fireworks,
    "victory-jetons": chipRain,
    "victory-etoiles": stars,
    "victory-cartes": cardRain,
    "victory-bulles": bubbles,
};

// Joue un effet de victoire (inconnu : les confettis)
export function playVictoryEffect(id: string) {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    (reduced ? confetti : EFFECTS[id] ?? confetti)();
}
