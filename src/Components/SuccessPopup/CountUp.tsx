import {useEffect, useRef, useState} from "react";

/**
 * Nombre qui défile jusqu'à `value` en grossissant, puis « rebondit » à sa taille normale.
 * Si `value` change ensuite (gain multiplié), il repart de la valeur affichée vers la nouvelle.
 * - delay : attente avant le premier défilement (ms)
 * - duration : durée d'un défilement (ms)
 */
type CountUpProps = {
    value: number;
    delay?: number;
    duration?: number;
};

const reducedMotion = () => window.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true;

export default function CountUp({value, delay = 0, duration = 1000}: CountUpProps) {
    const [reduced] = useState(reducedMotion);
    const [shown, setShown] = useState({value: reduced ? value : 0, progress: reduced ? 1 : 0});
    // Valeur affichée (point de départ si `value` change) et premier défilement déjà fait
    const current = useRef(shown.value);
    const started = useRef(false);

    useEffect(() => {
        if (reduced) return;
        const from = current.current;
        const wait = started.current ? 0 : delay;
        started.current = true;
        let frame = 0;
        const start = performance.now() + wait;
        const tick = (now: number) => {
            const t = Math.min(1, Math.max(0, (now - start) / duration));
            // départ rapide, fin qui ralentit
            const eased = 1 - Math.pow(1 - t, 3);
            const next = Math.round(from + (value - from) * eased);
            current.current = next;
            setShown({value: next, progress: t});
            if (t < 1) frame = requestAnimationFrame(tick);
        };
        frame = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(frame);
    }, [value, delay, duration, reduced]);

    const done = shown.progress >= 1;
    const eased = 1 - Math.pow(1 - shown.progress, 3);

    return (
        <span className={`count-up ${done ? "done" : ""}`}
              style={done ? undefined : {transform: `scale(${1 + 0.35 * eased})`}}>
            {shown.value}
        </span>
    );
}
