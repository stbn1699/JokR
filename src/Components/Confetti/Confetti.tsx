import {useEffect, useRef} from 'react';
import './Confetti.scss';

type EmitterRect = { x: number; y: number; width: number; height: number };

type ConfettiProps = {
    active: boolean;
    duration?: number; // ms
    particleCount?: number;
    colors?: string[];
    zIndex?: number;
    pointerEvents?: 'none' | 'auto';
    onComplete?: () => void;
    emitter?: { x?: number; y?: number } | { rect: EmitterRect } | 'center';
    loop?: boolean;
};

type Particle = {
    x: number;
    y: number;
    vx: number;
    vy: number;
    size: number;
    color: string;
    life: number;
    ttl: number;
    rotation: number;
    vr: number;
};

const defaultColors = ['#f94144', '#f3722c', '#f9c74f', '#90be6d', '#43aa8b', '#577590'];

export default function Confetti({
                                     active,
                                     duration = 2000,
                                     particleCount = 180, // increased for wider coverage
                                     colors = defaultColors,
                                     zIndex = 9999,
                                     pointerEvents = 'none',
                                     onComplete,
                                     emitter = 'center',
                                     loop = false,
                                 }: ConfettiProps) {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const dpr = Math.max(1, window.devicePixelRatio || 1);

        const fit = () => {
            const rect: { width: number; height: number } = {width: window.innerWidth, height: window.innerHeight};
            canvas.style.width = rect.width + 'px';
            canvas.style.height = rect.height + 'px';
            canvas.width = Math.round(rect.width * dpr);
            canvas.height = Math.round(rect.height * dpr);
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        };

        fit();

        const ro = new ResizeObserver(fit);
        if (canvas.parentElement) ro.observe(canvas.parentElement);

        let rafId: number | null = null;
        let particles: Particle[] = [];
        let startTime = 0;
        let lastTime = 0;

        const gravity = 0.0015; // reduced gravity so particles travel farther (px per ms^2)
        const friction = 0.998;

        const emitBurst = (extraOriginOffset = 0) => {
            const parentRect: { width: number; height: number } = {
                width: window.innerWidth,
                height: window.innerHeight
            };
            if (!parentRect) return;

            // Helper to compute emitter origin per particle
            const computeOrigin = () => {
                // If emitter is a rect, emit around that rect (with margin)
                if (typeof emitter === 'object' && 'rect' in emitter) {
                    const r = emitter.rect as EmitterRect;
                    const marginX = Math.max(40, r.width * 0.6);
                    const marginY = Math.max(30, r.height * 0.6);
                    const side = Math.floor(Math.random() * 4);
                    let ex = r.x + Math.random() * r.width;
                    let ey = r.y + Math.random() * r.height;
                    const outsideOffsetX = 20 + Math.random() * marginX;
                    const outsideOffsetY = 15 + Math.random() * marginY;
                    if (side === 0) {
                        ex = r.x + Math.random() * (r.width + marginX) - marginX / 2;
                        ey = r.y - outsideOffsetY;
                    } else if (side === 1) {
                        ex = r.x + r.width + outsideOffsetX;
                        ey = r.y + Math.random() * (r.height + marginY) - marginY / 2;
                    } else if (side === 2) {
                        ex = r.x + Math.random() * (r.width + marginX) - marginX / 2;
                        ey = r.y + r.height + outsideOffsetY;
                    } else {
                        ex = r.x - outsideOffsetX;
                        ey = r.y + Math.random() * (r.height + marginY) - marginY / 2;
                    }
                    const insideX = ex >= r.x && ex <= r.x + r.width;
                    const insideY = ey >= r.y && ey <= r.y + r.height;
                    if (insideX && insideY) {
                        const distTop = Math.abs(ey - r.y);
                        const distBottom = Math.abs(ey - (r.y + r.height));
                        const distLeft = Math.abs(ex - r.x);
                        const distRight = Math.abs(ex - (r.x + r.width));
                        const min = Math.min(distTop, distBottom, distLeft, distRight);
                        if (min === distTop) {
                            ey = r.y - outsideOffsetY;
                        } else if (min === distBottom) {
                            ey = r.y + r.height + outsideOffsetY;
                        } else if (min === distLeft) {
                            ex = r.x - outsideOffsetX;
                        } else {
                            ex = r.x + r.width + outsideOffsetX;
                        }
                    }
                    return {ex, ey};
                }

                // If emitter is an explicit point
                if (typeof emitter === 'object' && 'x' in emitter && (emitter as { x?: number }).x !== undefined) {
                    const ex = (emitter as { x?: number }).x! + extraOriginOffset;
                    const ey = (emitter as { y?: number }).y ?? 0;
                    return {ex, ey};
                }

                // Default: top-center with optional horizontal offset
                return {ex: parentRect.width / 2 + extraOriginOffset, ey: parentRect.height * 0.06};
            };

            for (let i = 0; i < particleCount; i++) {
                const origin = computeOrigin();
                // Wider angle: random across 360 degrees but biased downward when origin is top
                const angle = Math.random() * Math.PI * 2;
                const baseSpeed = Math.random() * 0.8 + 0.6; // increased speed (px per ms)
                const vx = Math.cos(angle) * baseSpeed * (Math.random() * 2 + 0.5);
                const vy = Math.sin(angle) * baseSpeed * (Math.random() * 2 + 0.5);
                particles.push({
                    x: origin.ex + (Math.random() - 0.5) * 16,
                    y: origin.ey + (Math.random() - 0.5) * 12,
                    vx,
                    vy,
                    size: Math.round(Math.random() * 12 + 8), // larger particles
                    color: colors[Math.floor(Math.random() * colors.length)],
                    life: 0,
                    ttl: Math.round(Math.random() * 1600 + 1000), // longer life
                    rotation: Math.random() * Math.PI,
                    vr: (Math.random() - 0.5) * 0.04,
                });
            }
        };

        const loopFn = (now: number) => {
            if (!startTime) startTime = now;
            if (!lastTime) lastTime = now;
            const dt = Math.min(40, now - lastTime);
            lastTime = now;
            const elapsed = now - startTime;

            const rect = canvas.getBoundingClientRect();
            ctx.clearRect(0, 0, rect.width, rect.height);

            for (let i = particles.length - 1; i >= 0; i--) {
                const p = particles[i];
                p.vy += gravity * dt;
                p.vx *= friction;
                p.vy *= friction;
                p.x += p.vx * dt;
                p.y += p.vy * dt;
                p.rotation += p.vr * dt;
                p.life += dt;

                const alpha = Math.max(0, 1 - p.life / p.ttl);
                ctx.save();
                ctx.globalAlpha = alpha;
                ctx.translate(p.x, p.y);
                ctx.rotate(p.rotation);
                ctx.fillStyle = p.color;
                ctx.beginPath();
                ctx.rect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
                ctx.fill();
                ctx.restore();

                if (p.y > rect.height + 80 || p.life >= p.ttl) {
                    particles.splice(i, 1);
                }
            }

            if (elapsed < duration || particles.length > 0) {
                rafId = requestAnimationFrame(loopFn);
            } else {
                if (onComplete) onComplete();
                if (loop && active) {
                    // restart
                    startTime = 0;
                    particles = [];
                    // double burst to increase spread
                    emitBurst(-120);
                    emitBurst(120);
                    rafId = requestAnimationFrame(loopFn);
                }
            }
        };

        if (active) {
            // initial double burst for wider coverage
            emitBurst(-120);
            emitBurst(120);
            rafId = requestAnimationFrame(loopFn);
        }

        const handleVisibility = () => {
            if (document.hidden) {
                if (rafId) cancelAnimationFrame(rafId);
            } else {
                if (!rafId && (active || particles.length > 0)) {
                    lastTime = performance.now();
                    rafId = requestAnimationFrame(loopFn);
                }
            }
        };
        document.addEventListener('visibilitychange', handleVisibility);

        return () => {
            if (rafId) cancelAnimationFrame(rafId);
            ro.disconnect();
            document.removeEventListener('visibilitychange', handleVisibility);
        };
    }, [active, colors, duration, emitter, onComplete, particleCount, loop]);

    return (
        <canvas
            className="confetti-canvas"
            ref={canvasRef}
            style={{zIndex, pointerEvents}}
            aria-hidden
        />
    );
}
