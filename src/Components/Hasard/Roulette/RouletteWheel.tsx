/**
 * Roue de la roulette (canvas) : 37 cases dans l'ordre de la vraie roue européenne.
 * Au repos, la roue tourne doucement. Au lancer, elle accélère puis ralentit, la bille tourne en sens
 * inverse sur le bord, ralentit, descend en rebondissant et finit dans la case tirée par le serveur.
 */

import {forwardRef, useEffect, useImperativeHandle, useRef} from "react";
import {ROULETTE_WHEEL, rouletteColor} from "../../../../backend/src/utils/roulette.ts";

export type RouletteWheelHandle = {
    /*
     * Lance la roue ; onDone est appelé quand la bille est posée dans la case `number`.
     * `elapsed` : temps déjà écoulé depuis le début du lancer (roulette en direct : on arrive en cours de route) ;
     * si la bille devrait déjà être posée, elle l'est tout de suite.
     */
    spin: (number: number, onDone: () => void, elapsed?: number) => void;
};

const TAU = Math.PI * 2;
const SEGMENT = TAU / ROULETTE_WHEEL.length;
const IDLE_SPEED = 0.25; // tours de roue au repos (radians par seconde)
const SPIN_MS = 6500; // durée d'un lancer
const BALL_SETTLE = 0.78; // la bille est posée à 78 % du lancer, puis tourne avec la roue

const COLORS = {red: "#c81e1e", black: "#111827", green: "#059669"} as const;

const easeOutCubic = (t: number) => 1 - (1 - t) ** 3;

type Spin = {
    start: number;
    wheelFrom: number;
    wheelTurn: number; // angle parcouru par la roue pendant le lancer
    ballFrom: number; // angle de la bille par rapport à la roue, au départ
    ballTo: number; // à l'arrivée (centre de la case tirée)
    onDone: () => void;
    done: boolean;
};

const RouletteWheel = forwardRef<RouletteWheelHandle>(function RouletteWheel(_props, ref) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const wheel = useRef(0); // angle de la roue
    const ball = useRef<{ rel: number; radius: number } | null>(null); // bille posée (angle par rapport à la roue)
    const spin = useRef<Spin | null>(null);
    const last = useRef<number | null>(null);

    useImperativeHandle(ref, () => ({
        spin(number, onDone, elapsed = 0) {
            const index = ROULETTE_WHEEL.indexOf(number as typeof ROULETTE_WHEEL[number]);
            const target = index * SEGMENT;
            const from = ball.current?.rel ?? Math.PI;
            // la bille fait 9 à 10 tours dans l'autre sens par rapport à la roue avant de tomber dans sa case
            let delta = ((from - target) % TAU + TAU) % TAU;
            delta += 9 * TAU;
            if (elapsed >= SPIN_MS * BALL_SETTLE) {
                spin.current = null;
                ball.current = {rel: target, radius: 0.62};
                onDone();
                return;
            }
            spin.current = {
                start: performance.now() - elapsed, wheelFrom: wheel.current, wheelTurn: 3.5 * TAU,
                ballFrom: from, ballTo: from - delta, onDone, done: false,
            };
            ball.current = null;
        },
    }));

    useEffect(() => {
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext("2d");
        if (!canvas || !ctx) return;
        let request = 0;

        const frame = (now: number) => {
            request = requestAnimationFrame(frame);
            const dt = last.current === null ? 0 : Math.min(0.05, (now - last.current) / 1000);
            last.current = now;

            // ---------- mouvement
            let ballRel: number | null = ball.current?.rel ?? null;
            let ballRadius = ball.current?.radius ?? 0.62;
            const s = spin.current;
            if (s) {
                const t = Math.min(1, (now - s.start) / SPIN_MS);
                // la roue repart vite et ralentit jusqu'à sa vitesse de repos
                wheel.current = s.wheelFrom + s.wheelTurn * easeOutCubic(t) + IDLE_SPEED * (now - s.start) / 1000;
                const tb = Math.min(1, t / BALL_SETTLE);
                ballRel = s.ballFrom + (s.ballTo - s.ballFrom) * easeOutCubic(tb);
                // sur le bord, puis descente vers les cases avec quelques rebonds qui s'amortissent
                if (tb < 0.55) ballRadius = 0.86;
                else {
                    const k = (tb - 0.55) / 0.45;
                    const bounce = Math.abs(Math.sin(k * Math.PI * 3)) * (1 - k) * 0.08;
                    ballRadius = 0.86 - (0.86 - 0.62) * Math.min(1, k * 1.4) + bounce;
                }
                if (tb >= 1 && !s.done) {
                    s.done = true;
                    ball.current = {rel: s.ballTo, radius: 0.62};
                    s.onDone();
                }
                if (t >= 1) spin.current = null;
            } else {
                wheel.current += IDLE_SPEED * dt;
            }

            // ---------- dessin
            const ratio = window.devicePixelRatio || 1;
            const size = canvas.clientWidth;
            if (canvas.width !== Math.round(size * ratio)) {
                canvas.width = Math.round(size * ratio);
                canvas.height = Math.round(size * ratio);
            }
            const R = size / 2;
            ctx.setTransform(ratio, 0, 0, ratio, R * ratio, R * ratio);
            ctx.clearRect(-R, -R, size, size);

            // bois du bord
            const rim = ctx.createRadialGradient(0, 0, R * 0.7, 0, 0, R);
            rim.addColorStop(0, "#5b3a1a");
            rim.addColorStop(1, "#2a1709");
            ctx.fillStyle = rim;
            ctx.beginPath();
            ctx.arc(0, 0, R * 0.99, 0, TAU);
            ctx.fill();
            // piste de la bille
            ctx.fillStyle = "#3b2414";
            ctx.beginPath();
            ctx.arc(0, 0, R * 0.92, 0, TAU);
            ctx.fill();

            // cases
            const base = -Math.PI / 2 + wheel.current;
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.font = `bold ${Math.max(9, R * 0.075)}px 'Josefin Slab', serif`;
            ROULETTE_WHEEL.forEach((n, i) => {
                const a = base + i * SEGMENT;
                ctx.fillStyle = COLORS[rouletteColor(n)];
                ctx.beginPath();
                ctx.moveTo(0, 0);
                ctx.arc(0, 0, R * 0.8, a - SEGMENT / 2, a + SEGMENT / 2);
                ctx.closePath();
                ctx.fill();
                ctx.strokeStyle = "rgba(212, 175, 55, 0.7)";
                ctx.lineWidth = 1;
                ctx.stroke();
                ctx.save();
                ctx.rotate(a + Math.PI / 2);
                ctx.fillStyle = "#f9fafb";
                ctx.fillText(String(n), 0, -R * 0.72);
                ctx.restore();
            });
            // fond des cases (où la bille se pose) et centre
            ctx.strokeStyle = "rgba(212, 175, 55, 0.8)";
            ctx.lineWidth = 2;
            for (const r of [0.8, 0.66]) {
                ctx.beginPath();
                ctx.arc(0, 0, R * r, 0, TAU);
                ctx.stroke();
            }
            const cone = ctx.createRadialGradient(-R * 0.08, -R * 0.08, R * 0.02, 0, 0, R * 0.56);
            cone.addColorStop(0, "#7c5a2e");
            cone.addColorStop(1, "#2d1b0c");
            ctx.fillStyle = cone;
            ctx.beginPath();
            ctx.arc(0, 0, R * 0.56, 0, TAU);
            ctx.fill();
            // croisillon doré au centre
            ctx.save();
            ctx.rotate(wheel.current);
            ctx.strokeStyle = "#d4af37";
            ctx.lineWidth = R * 0.03;
            ctx.lineCap = "round";
            for (let k = 0; k < 4; k++) {
                ctx.rotate(Math.PI / 2);
                ctx.beginPath();
                ctx.moveTo(0, 0);
                ctx.lineTo(0, -R * 0.2);
                ctx.stroke();
            }
            ctx.fillStyle = "#d4af37";
            ctx.beginPath();
            ctx.arc(0, 0, R * 0.05, 0, TAU);
            ctx.fill();
            ctx.restore();

            // bille
            if (ballRel !== null) {
                const a = base + ballRel;
                const x = Math.cos(a) * R * ballRadius;
                const y = Math.sin(a) * R * ballRadius;
                const br = Math.max(4, R * 0.035);
                const shine = ctx.createRadialGradient(x - br * 0.4, y - br * 0.4, br * 0.1, x, y, br);
                shine.addColorStop(0, "#ffffff");
                shine.addColorStop(1, "#b8c0cc");
                ctx.fillStyle = shine;
                ctx.beginPath();
                ctx.arc(x, y, br, 0, TAU);
                ctx.fill();
            }
        };
        request = requestAnimationFrame(frame);
        return () => cancelAnimationFrame(request);
    }, []);

    return <canvas ref={canvasRef} className="roulette-canvas" role="img" aria-label="Roue de la roulette"/>;
});

export default RouletteWheel;
