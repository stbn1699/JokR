/**
 * Plateau du Plinko dessiné sur un canvas : clous (qui s'allument quand la bille les touche), parois,
 * cases avec le multiplicateur du tableau choisi (prudent, équilibré ou risqué), et les billes en train de tomber.
 * Les chutes viennent du serveur (graine) et sont rejouées ici avec le même moteur physique.
 * Les billes des autres joueurs (« fantômes ») passent en fond, grises et transparentes : elles n'allument
 * pas les clous et ne font pas rebondir les cases. Celles des amis peuvent avoir un contour bleu.
 * Chaque bille est dessinée avec son image (celle choisie dans la boutique) et tourne sur elle-même en roulant :
 * son angle suit le chemin parcouru de côté (distance / rayon), comme une vraie bille.
 */

import {forwardRef, useEffect, useImperativeHandle, useRef} from "react";
import {DEFAULT_BALL_FILE} from "../../../Services/plinkoBalls.ts";
import {
    PLINKO_BALL_RADIUS,
    PLINKO_BOTTOM,
    PLINKO_HEIGHT,
    PLINKO_PEG_RADIUS,
    PLINKO_PEGS,
    PLINKO_SLOTS,
    PLINKO_SPACING,
    PLINKO_WALLS,
    PLINKO_WIDTH,
    type PlinkoDrop,
    type PlinkoRisk,
    plinkoMultiplier,
    slotCenterX,
} from "../../../../backend/src/utils/plinko.ts";

export type PlinkoBoardHandle = {
    // lance l'animation d'une chute ; onLand est appelé quand la bille arrive dans sa case ; `ball` : image de la bille
    drop: (drop: PlinkoDrop, onLand: () => void, ball?: string) => void;
    // bille d'un autre joueur, déjà partie depuis `elapsed` ms (en fond, grise) ; `ring` : contour bleu (un ami)
    ghost: (drop: PlinkoDrop, elapsed: number, ball?: string, ring?: boolean) => void;
    // retire les billes des autres joueurs encore en l'air
    clearGhosts: () => void;
};

type Ball = { drop: PlinkoDrop; start: number; onLand?: () => void; landed: boolean; ghost: boolean; image: string; angles: number[]; ring?: boolean };

const FRIEND_RING = "#3b82f6";

// Contour bleu autour d'une bille (bille d'un ami), net et opaque même sur une bille transparente
function drawRing(ctx: CanvasRenderingContext2D, x: number, y: number) {
    ctx.strokeStyle = FRIEND_RING;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(x, y, PLINKO_BALL_RADIUS + 1.5, 0, Math.PI * 2);
    ctx.stroke();
}

// Angle de la bille à chaque image : elle roule, donc tourne de (déplacement de côté / rayon)
function rollingAngles(drop: PlinkoDrop): number[] {
    const angles = [0];
    for (let i = 1; i < drop.frames.length; i++) {
        angles.push(angles[i - 1]! + (drop.frames[i]!.x - drop.frames[i - 1]!.x) / PLINKO_BALL_RADIUS);
    }
    return angles;
}

const FPS = 60;
const PEG_GLOW_MS = 350;
const SLOT_BUMP_MS = 450;
const SLOT_TOP = PLINKO_BOTTOM + PLINKO_BALL_RADIUS + 6;
const SLOT_HEIGHT = 34;

// Couleur d'une case selon son multiplicateur : rouge vif pour les gros gains, vers le jaune puis le gris
function slotColor(m: number): string {
    if (m >= 10) return "#ef4444";
    if (m >= 4) return "#f97316";
    if (m >= 2) return "#f59e0b";
    if (m >= 1) return "#eab308";
    if (m >= 0.6) return "#84cc16";
    return "#64748b";
}

const PlinkoBoard = forwardRef<PlinkoBoardHandle, { risk: PlinkoRisk }>(function PlinkoBoard({risk}, ref) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const balls = useRef<Ball[]>([]);
    const pegLit = useRef(new Map<number, number>()); // clou → moment où il a été touché
    const slotLit = useRef(new Map<number, number>()); // case → moment où une bille y est tombée
    const frameRequest = useRef<number | null>(null);
    // images des billes (public/plinko_ball), chargées une fois chacune
    const images = useRef(new Map<string, HTMLImageElement>());
    const imageOf = (src: string) => {
        let image = images.current.get(src);
        if (!image) {
            image = new Image();
            image.src = src;
            images.current.set(src, image);
        }
        return image;
    };

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
            if (!ball.ghost) {
                for (const hit of ball.drop.hits) {
                    if (hit.frame <= frame && hit.frame > frame - 2) pegLit.current.set(hit.peg, now);
                }
            }
            if (!ball.landed && frame >= ball.drop.frames.length - 1) {
                ball.landed = true;
                if (!ball.ghost) slotLit.current.set(ball.drop.slot, now);
                ball.onLand?.();
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
            const multiplier = plinkoMultiplier(slot, risk);
            ctx.fillStyle = slotColor(multiplier);
            ctx.globalAlpha = t < 1 ? 1 : 0.85;
            ctx.beginPath();
            ctx.roundRect(x, SLOT_TOP + bump, PLINKO_SPACING - 4, SLOT_HEIGHT, 6);
            ctx.fill();
            ctx.globalAlpha = 1;
            ctx.fillStyle = "#1c1917";
            ctx.fillText(`${multiplier}×`, slotCenterX(slot), SLOT_TOP + SLOT_HEIGHT / 2 + 1 + bump);
        }

        // billes (position entre deux images enregistrées : mouvement fluide sur les écrans à 120 Hz),
        // celles des autres joueurs d'abord : les miennes passent devant
        const ordered = [...balls.current.filter(b => b.ghost), ...balls.current.filter(b => !b.ghost)];
        for (const ball of ordered) {
            busy = true;
            const exact = (now - ball.start) / 1000 * FPS;
            const i = Math.min(Math.floor(exact), ball.drop.frames.length - 1);
            const a = ball.drop.frames[i]!;
            const b = ball.drop.frames[Math.min(i + 1, ball.drop.frames.length - 1)]!;
            const k = exact - i;
            const x = a.x + (b.x - a.x) * k;
            const y = a.y + (b.y - a.y) * k;
            const image = imageOf(ball.image);
            if (image.complete && image.naturalWidth > 0) {
                const angleA = ball.angles[i]!;
                const angle = angleA + ((ball.angles[Math.min(i + 1, ball.angles.length - 1)] ?? angleA) - angleA) * k;
                // billes des autres joueurs : la leur, en noir et blanc et transparente
                if (ball.ghost) {
                    ctx.globalAlpha = 0.35;
                    ctx.filter = "grayscale(1)";
                }
                ctx.save();
                ctx.translate(x, y);
                ctx.rotate(angle);
                ctx.drawImage(image, -PLINKO_BALL_RADIUS, -PLINKO_BALL_RADIUS, PLINKO_BALL_RADIUS * 2, PLINKO_BALL_RADIUS * 2);
                ctx.restore();
                ctx.globalAlpha = 1;
                ctx.filter = "none";
                if (ball.ring) drawRing(ctx, x, y);
                continue;
            }
            // image pas encore chargée : un simple rond
            ctx.fillStyle = ball.ghost ? "rgba(203, 213, 225, 0.32)" : "#fde047";
            ctx.beginPath();
            ctx.arc(x, y, PLINKO_BALL_RADIUS, 0, Math.PI * 2);
            ctx.fill();
            if (ball.ring) drawRing(ctx, x, y);
        }

        if (busy) frameRequest.current = requestAnimationFrame(t => draw.current(t));
    };

    const redraw = () => {
        if (frameRequest.current === null) frameRequest.current = requestAnimationFrame(t => draw.current(t));
    };

    useImperativeHandle(ref, () => ({
        drop(drop, onLand, ball = DEFAULT_BALL_FILE) {
            balls.current.push({drop, start: performance.now(), onLand, landed: false, ghost: false, image: ball, angles: rollingAngles(drop)});
            redraw();
        },
        ghost(drop, elapsed, ball = DEFAULT_BALL_FILE, ring = false) {
            // déjà arrivée en bas : rien à montrer
            if (elapsed / 1000 * FPS >= drop.frames.length - 1) return;
            balls.current.push({drop, start: performance.now() - elapsed, landed: false, ghost: true, image: ball, angles: rollingAngles(drop), ring});
            redraw();
        },
        clearGhosts() {
            balls.current = balls.current.filter(b => !b.ghost);
            redraw();
        },
    }));

    // Premier dessin, et à chaque changement de taille
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        imageOf(DEFAULT_BALL_FILE);
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

    // Autre tableau choisi : les cases changent
    useEffect(() => redraw(), [risk]);

    // Aussi grand que possible, sans dépasser la hauteur de l'écran (header, marges et bulle « Un bug ? » déduits)
    return <canvas ref={canvasRef} className="plinko-canvas"
                   style={{aspectRatio: `${PLINKO_WIDTH} / ${PLINKO_HEIGHT}`, width: `min(100%, calc((100dvh - 14rem) * ${PLINKO_WIDTH / PLINKO_HEIGHT}))`}}
                   role="img" aria-label="Plateau du Plinko"/>;
});

export default PlinkoBoard;
