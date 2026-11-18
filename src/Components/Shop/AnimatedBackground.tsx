/**
 * Fond animé (boutique › Fonds animés) : un fond de base en CSS, et par-dessus une animation légère.
 * - etoiles, pluie, flocons, lucioles : des particules dessinées dans un canvas (requestAnimationFrame)
 * - respire : trois halos de couleur animés en CSS (pas de canvas)
 * Le même composant sert au fond du site (plein écran), aux aperçus et aux vignettes de la boutique :
 * le nombre et la taille des particules suivent la taille de la zone. Avec « réduire les animations »
 * (prefers-reduced-motion), une seule image fixe est dessinée.
 */

import "./AnimatedBackground.scss";
import {useEffect, useRef} from "react";
import {findAnimatedBackground} from "../../Services/shopCatalog.ts";

type Particle = { x: number; y: number; r: number; vx: number; vy: number; phase: number; speed: number };

type Effect = {
    // nombre de particules pour une zone de w × h (s : échelle, 1 en plein écran)
    count: (w: number, h: number) => number;
    spawn: (w: number, h: number, s: number, anywhere: boolean) => Particle;
    step: (p: Particle, dt: number, w: number, h: number, s: number) => void;
    draw: (ctx: CanvasRenderingContext2D, p: Particle, s: number) => void;
};

const rand = (min: number, max: number) => min + Math.random() * (max - min);

const EFFECTS: Record<string, Effect> = {
    // étoiles fixes qui scintillent, chacune à son rythme
    etoiles: {
        count: (w, h) => Math.max(30, Math.round((w * h) / 5000)),
        spawn: (w, h, s) => ({x: rand(0, w), y: rand(0, h), r: rand(0.4, 1.6) * Math.max(s, 0.6), vx: 0, vy: 0, phase: rand(0, Math.PI * 2), speed: rand(0.6, 2.2)}),
        step: (p, dt) => {
            p.phase += p.speed * dt;
        },
        draw: (ctx, p) => {
            ctx.globalAlpha = 0.25 + 0.75 * (0.5 + 0.5 * Math.sin(p.phase));
            ctx.fillStyle = "#ffffff";
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
            ctx.fill();
        },
    },
    // gouttes fines qui tombent en biais
    pluie: {
        count: (w, h) => Math.max(25, Math.round((w * h) / 9000)),
        spawn: (w, h, s, anywhere) => ({x: rand(-50, w), y: anywhere ? rand(0, h) : rand(-h * 0.2, 0), r: rand(10, 24) * s, vx: 0, vy: rand(500, 820) * s, phase: 0, speed: 0}),
        step: (p, dt, w, h, s) => {
            p.y += p.vy * dt;
            p.x += p.vy * 0.15 * dt;
            if (p.y > h + p.r) Object.assign(p, EFFECTS.pluie!.spawn(w, h, s, false));
        },
        draw: (ctx, p, s) => {
            ctx.globalAlpha = 0.35;
            ctx.strokeStyle = "#b4c8e6";
            ctx.lineWidth = Math.max(1, 1.2 * s);
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(p.x + p.r * 0.15, p.y + p.r);
            ctx.stroke();
        },
    },
    // flocons qui descendent en se balançant
    flocons: {
        count: (w, h) => Math.max(25, Math.round((w * h) / 12000)),
        spawn: (w, h, s, anywhere) => ({x: rand(0, w), y: anywhere ? rand(0, h) : rand(-30, 0), r: rand(1, 3.5) * Math.max(s, 0.5), vx: 0, vy: rand(20, 60) * s, phase: rand(0, Math.PI * 2), speed: rand(0.5, 1.5)}),
        step: (p, dt, w, h, s) => {
            p.phase += p.speed * dt;
            p.y += p.vy * dt;
            p.x += Math.sin(p.phase) * 18 * s * dt;
            if (p.y > h + 10) Object.assign(p, EFFECTS.flocons!.spawn(w, h, s, false));
        },
        draw: (ctx, p) => {
            ctx.globalAlpha = 0.85;
            ctx.fillStyle = "#ffffff";
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
            ctx.fill();
        },
    },
    // lucioles qui flottent sans but et s'allument doucement
    lucioles: {
        count: (w, h) => Math.max(8, Math.round((w * h) / 40000)),
        spawn: (w, h, s) => ({x: rand(0, w), y: rand(h * 0.2, h), r: rand(2, 3.5) * Math.max(s, 0.5), vx: rand(-20, 20) * s, vy: rand(-20, 20) * s, phase: rand(0, Math.PI * 2), speed: rand(0.8, 1.8)}),
        step: (p, dt, w, h, s) => {
            p.phase += p.speed * dt;
            // la direction change un peu à chaque image : une trajectoire qui flâne
            p.vx = Math.max(-30 * s, Math.min(30 * s, p.vx + rand(-40, 40) * s * dt));
            p.vy = Math.max(-30 * s, Math.min(30 * s, p.vy + rand(-40, 40) * s * dt));
            p.x = (p.x + p.vx * dt + w) % w;
            p.y = Math.max(h * 0.1, Math.min(h, p.y + p.vy * dt));
        },
        draw: (ctx, p) => {
            const glow = 0.5 + 0.5 * Math.sin(p.phase);
            const halo = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * 5);
            halo.addColorStop(0, `rgba(236, 255, 140, ${0.9 * glow})`);
            halo.addColorStop(1, "rgba(236, 255, 140, 0)");
            ctx.globalAlpha = 1;
            ctx.fillStyle = halo;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.r * 5, 0, Math.PI * 2);
            ctx.fill();
        },
    },
};

type AnimatedBackgroundProps = {
    // identifiant du fond (« anim-pluie »)
    id: string;
    className?: string;
};

export default function AnimatedBackground({id, className = ""}: AnimatedBackgroundProps) {
    const background = findAnimatedBackground(id);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const effect = background ? EFFECTS[background.slug] : undefined;

    useEffect(() => {
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext("2d");
        if (!canvas || !ctx || !effect) return;
        const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        let particles: Particle[] = [];
        let w = 0;
        let h = 0;
        let s = 1;
        let frame = 0;
        let last = performance.now();

        const draw = () => {
            ctx.clearRect(0, 0, w, h);
            for (const p of particles) effect.draw(ctx, p, s);
        };

        // nouvelle taille : canvas net (écrans haute densité), particules redistribuées
        const resize = () => {
            const rect = canvas.getBoundingClientRect();
            const dpr = window.devicePixelRatio || 1;
            w = rect.width;
            h = rect.height;
            s = Math.min(1, Math.max(0.35, w / 1200));
            canvas.width = Math.round(w * dpr);
            canvas.height = Math.round(h * dpr);
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
            particles = Array.from({length: effect.count(w, h)}, () => effect.spawn(w, h, s, true));
            draw();
        };

        const loop = (now: number) => {
            // pas plus de 50 ms d'un coup (retour sur l'onglet après une pause)
            const dt = Math.min((now - last) / 1000, 0.05);
            last = now;
            for (const p of particles) effect.step(p, dt, w, h, s);
            draw();
            frame = requestAnimationFrame(loop);
        };

        const observer = new ResizeObserver(resize);
        observer.observe(canvas);
        resize();
        if (!still) frame = requestAnimationFrame(loop);
        return () => {
            cancelAnimationFrame(frame);
            observer.disconnect();
        };
    }, [effect]);

    if (!background) return null;
    return (
        <div className={`anim-bg anim-${background.slug} ${className}`} style={{background: background.base}} aria-hidden>
            {effect ? <canvas ref={canvasRef}/> : <><span className="anim-blob one"/><span className="anim-blob two"/><span className="anim-blob three"/></>}
        </div>
    );
}
