/**
 * Plateau du Plinko dessiné sur un canvas : clous (qui s'allument quand la bille les touche), parois,
 * cases avec leur multiplicateur, et les billes en train de tomber.
 * Les chutes viennent du serveur (graine) et sont rejouées ici avec le même moteur physique.
 */

import {forwardRef, useEffect, useImperativeHandle, useRef} from "react";
import {
    PLINKO_BALL_RADIUS,
    PLINKO_BOTTOM,
    PLINKO_HEIGHT,
    PLINKO_MULTIPLIERS,
    PLINKO_PEG_RADIUS,
    PLINKO_PEGS,
    PLINKO_SLOTS,
    PLINKO_SPACING,
    PLINKO_WALLS,
    PLINKO_WIDTH,
    type PlinkoDrop,
    slotCenterX,
} from "../../../../backend/src/utils/plinko.ts";

export type PlinkoBoardHandle = {
    // lance l'animation d'une chute ; onLand est appelé quand la bille arrive dans sa case
    drop: (drop: PlinkoDrop, onLand: () => void) => void;
};

type Ball = { drop: PlinkoDrop; start: number; onLand: () => void; landed: boolean; hue: number };

const FPS = 60;
const PEG_GLOW_MS = 350;
const SLOT_BUMP_MS = 450;
const SLOT_TOP = PLINKO_BOTTOM + PLINKO_BALL_RADIUS + 6;
const SLOT_HEIGHT = 34;

// Couleur d'une case : rouge vif aux bords (gros gains), vers le jaune puis le gris au centre
function slotColor(slot: number): string {
    const m = PLINKO_MULTIPLIERS[slot]!;
    if (m >= 10) return "#ef4444";
    if (m >= 4) return "#f97316";
    if (m >= 2) return "#f59e0b";
    if (m >= 1) return "#eab308";
    if (m >= 0.6) return "#84cc16";
    return "#64748b";
}

const PlinkoBoard = forwardRef<PlinkoBoardHandle>(function PlinkoBoard(_props, ref) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const balls = useRef<Ball[]>([]);
    const pegLit = useRef(new Map<number, number>()); // clou → moment où il a été touché
    const slotLit = useRef(new Map<number, number>()); // case → moment où une bille y est tombée
    const frameRequest = useRef<number | null>(null);
    const hue = useRef(0);

    // Dessine une image ; continue tant qu'une bille tombe ou qu'un clou brille encore
    const draw = useRef<(now: number) => void>(() => undefined);
    draw.current = (now: number) => {
        frameRequest.current = null;
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext("2d");
        if (!canvas || !ctx) return;

        // taille du canvas = taille affichée × densité de l'écran (net sur téléphone)
        const ratio = window.devicePixelRatio || 1;
        const width = canvas.clientWidth;
        const scale = width / PLINKO_WIDTH;
        if (canvas.width !== Math.round(width * ratio)) {
            canvas.width = Math.round(width * ratio);
            canvas.height = Math.round(PLINKO_HEIGHT * scale * ratio);
        }
        ctx.setTransform(scale * ratio, 0, 0, scale * ratio, 0, 0);
        ctx.clearRect(0, 0, PLINKO_WIDTH, PLINKO_HEIGHT);

        let busy = false;

        // billes : avance de chacune, clous touchés allumés, arrivée dans la case
        for (const ball of balls.current) {
            const frame = Math.floor((now - ball.start) / 1000 * FPS);
            for (const hit of ball.drop.hits) {
                if (hit.frame <= frame && hit.frame > frame - 2) pegLit.current.set(hit.peg, now);
            }
            if (!ball.landed && frame >= ball.drop.frames.length - 1) {
                ball.landed = true;
                slotLit.current.set(ball.drop.slot, now);
                ball.onLand();
            }
        }
        balls.current = balls.current.filter(b => !b.landed);

        // parois
        ctx.strokeStyle = "rgba(249, 250, 251, 0.18)";
        ctx.lineWidth = 2;
        for (const {a, b} of PLINKO_WALLS) {
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.stroke();
        }

        // clous
        PLINKO_PEGS.forEach((peg, i) => {
            const lit = pegLit.current.get(i);
            const glow = lit === undefined ? 0 : Math.max(0, 1 - (now - lit) / PEG_GLOW_MS);
            if (glow > 0) {
                busy = true;
                ctx.fillStyle = `rgba(251, 191, 36, ${0.35 * glow})`;
                ctx.beginPath();
                ctx.arc(peg.x, peg.y, PLINKO_PEG_RADIUS + 7 * glow, 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.fillStyle = glow > 0 ? `rgb(${249}, ${250 - 59 * glow}, ${251 - 215 * glow})` : "#e5e7eb";
            ctx.beginPath();
            ctx.arc(peg.x, peg.y, PLINKO_PEG_RADIUS, 0, Math.PI * 2);
            ctx.fill();
        });

        // cases et multiplicateurs
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.font = "bold 13px 'Josefin Slab', serif";
        for (let slot = 0; slot < PLINKO_SLOTS; slot++) {
            const lit = slotLit.current.get(slot);
            const t = lit === undefined ? 1 : Math.min(1, (now - lit) / SLOT_BUMP_MS);
            if (t < 1) busy = true;
            const bump = Math.sin(t * Math.PI) * 6;
            const x = slotCenterX(slot) - PLINKO_SPACING / 2 + 2;
            ctx.fillStyle = slotColor(slot);
            ctx.globalAlpha = t < 1 ? 1 : 0.85;
            ctx.beginPath();
            ctx.roundRect(x, SLOT_TOP + bump, PLINKO_SPACING - 4, SLOT_HEIGHT, 6);
            ctx.fill();
            ctx.globalAlpha = 1;
            ctx.fillStyle = "#1c1917";
            ctx.fillText(`${PLINKO_MULTIPLIERS[slot]}×`, slotCenterX(slot), SLOT_TOP + SLOT_HEIGHT / 2 + 1 + bump);
        }

        // billes (position entre deux images enregistrées : mouvement fluide sur les écrans à 120 Hz)
        for (const ball of balls.current) {
            busy = true;
            const exact = (now - ball.start) / 1000 * FPS;
            const i = Math.min(Math.floor(exact), ball.drop.frames.length - 1);
            const a = ball.drop.frames[i]!;
            const b = ball.drop.frames[Math.min(i + 1, ball.drop.frames.length - 1)]!;
            const k = exact - i;
            const x = a.x + (b.x - a.x) * k;
            const y = a.y + (b.y - a.y) * k;
            const gradient = ctx.createRadialGradient(x - 3, y - 3, 1, x, y, PLINKO_BALL_RADIUS);
            gradient.addColorStop(0, `hsl(${ball.hue}, 100%, 85%)`);
            gradient.addColorStop(1, `hsl(${ball.hue}, 90%, 55%)`);
            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(x, y, PLINKO_BALL_RADIUS, 0, Math.PI * 2);
            ctx.fill();
        }

        if (busy) frameRequest.current = requestAnimationFrame(t => draw.current(t));
    };

    const redraw = () => {
        if (frameRequest.current === null) frameRequest.current = requestAnimationFrame(t => draw.current(t));
    };

    useImperativeHandle(ref, () => ({
        drop(drop, onLand) {
            hue.current = (hue.current + 47) % 360;
            balls.current.push({drop, start: performance.now(), onLand, landed: false, hue: 30 + hue.current % 40});
            redraw();
        },
    }));

    // Premier dessin, et à chaque changement de taille
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        redraw();
        const observer = new ResizeObserver(() => {
            canvas.width = 0; // force le recalcul de la taille
            redraw();
        });
        observer.observe(canvas);
        return () => {
            observer.disconnect();
            if (frameRequest.current !== null) cancelAnimationFrame(frameRequest.current);
            frameRequest.current = null;
        };
    }, []);

    return <canvas ref={canvasRef} className="plinko-canvas" style={{aspectRatio: `${PLINKO_WIDTH} / ${PLINKO_HEIGHT}`}}
                   role="img" aria-label="Plateau du Plinko"/>;
});

export default PlinkoBoard;
