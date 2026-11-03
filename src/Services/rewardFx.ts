import "./rewardFx.scss";

/*
 * Effets de récompense après une victoire, partagés entre la popup de victoire et le header.
 *
 * 1. À la victoire, hold() fige le header sur la progression d'avant (le serveur a déjà donné la nouvelle)
 * 2. À la fermeture de la popup, fly() lance des particules (bleues vers la barre d'XP, orange vers
 *    les crédits) ; quand les premières arrivent, le header est libéré et anime le changement
 * 3. release() libère le header sans particules (popup fermée autrement, animations réduites...)
 */

export type HeldProgress = { level: number; xp: number; credits: number };

type State = {
    // Valeurs affichées par le header tant que les particules ne sont pas arrivées
    held: HeldProgress | null;
    // Jusqu'à quand le header anime les changements (au lieu de les afficher directement)
    animateUntil: number;
};

let state: State = {held: null, animateUntil: 0};
const listeners = new Set<() => void>();
let safetyTimer: number | undefined;

function setState(next: State) {
    state = next;
    listeners.forEach(l => l());
}

export const rewardFx = {
    subscribe(listener: () => void) {
        listeners.add(listener);
        return () => listeners.delete(listener);
    },

    getState: () => state,

    hold(progress: HeldProgress) {
        setState({...state, held: progress});
        // Filet de sécurité : le header ne reste jamais figé indéfiniment
        window.clearTimeout(safetyTimer);
        safetyTimer = window.setTimeout(() => rewardFx.release(), 5 * 60_000);
    },

    // Le header affiche les vraies valeurs, en les animant pendant quelques secondes
    // (le temps que la nouvelle progression arrive du serveur si elle n'est pas encore là)
    release() {
        window.clearTimeout(safetyTimer);
        if (!state.held) return;
        setState({held: null, animateUntil: Date.now() + 4000});
    },

    /**
     * Particules de la popup vers le header. `xpFrom` / `creditsFrom` : éléments d'où elles partent
     * (null = pas de gain de ce type). Le header est libéré à l'arrivée des premières.
     */
    fly(xpFrom: Element | null, creditsFrom: Element | null) {
        if (!state.held) return;
        if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
            rewardFx.release();
            return;
        }
        const xpTarget = visibleTarget(".header .xp-bar", ".header .level-icon");
        const creditsTarget = visibleTarget(".header .credits");
        const flights = [
            xpFrom && xpTarget ? burst(xpFrom, xpTarget, "xp", 22) : null,
            creditsFrom && creditsTarget ? burst(creditsFrom, creditsTarget, "credits", 16) : null,
        ].filter((f): f is Flight => f !== null);

        if (flights.length === 0) {
            rewardFx.release();
            return;
        }
        const firstArrival = Math.min(...flights.map(f => f.firstArrivalMs));
        window.setTimeout(() => rewardFx.release(), firstArrival);
    },
};

// Premier élément visible parmi les sélecteurs (la barre d'XP est masquée sur les très petits écrans)
function visibleTarget(...selectors: string[]): Element | null {
    for (const selector of selectors) {
        const el = document.querySelector(selector);
        if (!el) continue;
        const r = el.getBoundingClientRect();
        if (r.width > 0 && r.height > 0) return el;
    }
    return null;
}

type Flight = { firstArrivalMs: number };

const COLORS = {
    xp: ["#3b82f6", "#60a5fa", "#93c5fd"],
    credits: ["#f59e0b", "#f97316", "#fbbf24"],
};

/**
 * Éclatement de particules autour de `from`, qui filent ensuite vers `to`.
 * Chaque particule : explosion (≈ 350 ms) → courte pause → vol courbe vers la cible (≈ 700 ms).
 */
function burst(from: Element, to: Element, kind: "xp" | "credits", count: number): Flight {
    const a = from.getBoundingClientRect();
    const b = to.getBoundingClientRect();
    const ax = a.left + a.width / 2, ay = a.top + a.height / 2;
    const bx = b.left + b.width / 2, by = b.top + b.height / 2;

    const layer = document.createElement("div");
    layer.className = "reward-fx-layer";
    document.body.appendChild(layer);

    let firstArrivalMs = Infinity;
    let lastEnd = 0;

    for (let i = 0; i < count; i++) {
        const dot = document.createElement("span");
        dot.className = `reward-fx-particle ${kind}`;
        dot.style.background = COLORS[kind][i % COLORS[kind].length]!;
        const size = 6 + Math.random() * 7;
        dot.style.width = dot.style.height = `${size}px`;
        dot.style.left = `${ax - size / 2}px`;
        dot.style.top = `${ay - size / 2}px`;
        layer.appendChild(dot);

        // Explosion dans toutes les directions
        const angle = (i / count) * Math.PI * 2 + Math.random() * 0.6;
        const radius = 45 + Math.random() * 75;
        const ex = Math.cos(angle) * radius, ey = Math.sin(angle) * radius;
        // Vol vers la cible, avec un point de passage décalé pour courber la trajectoire
        const tx = bx - ax, ty = by - ay;
        const cx = ex + (tx - ex) * 0.5 + (Math.random() - 0.5) * 160;
        const cy = ey + (ty - ey) * 0.35 - 40 - Math.random() * 60;

        const burstMs = 320 + Math.random() * 120;
        const delay = Math.random() * 80;
        const flyDelay = 120 + Math.random() * 260;
        const flyMs = 620 + Math.random() * 260;
        const total = burstMs + flyDelay + flyMs;
        const arrival = delay + total;
        firstArrivalMs = Math.min(firstArrivalMs, arrival);
        lastEnd = Math.max(lastEnd, arrival);

        const t1 = burstMs / total, t2 = (burstMs + flyDelay) / total;
        const anim = dot.animate([
            {transform: "translate(0, 0) scale(0.3)", opacity: 0, offset: 0},
            {transform: "translate(0, 0) scale(1)", opacity: 1, offset: 0.04},
            {transform: `translate(${ex}px, ${ey}px) scale(1.15)`, opacity: 1, offset: t1, easing: "ease-in-out"},
            {transform: `translate(${ex}px, ${ey + 6}px) scale(1)`, opacity: 1, offset: t2, easing: "cubic-bezier(.5, 0, .9, .6)"},
            {transform: `translate(${cx}px, ${cy}px) scale(0.85)`, opacity: 1, offset: t2 + (1 - t2) * 0.55, easing: "cubic-bezier(.2, .5, .6, 1)"},
            {transform: `translate(${tx}px, ${ty}px) scale(0.4)`, opacity: 0.9, offset: 1},
        ], {duration: total, delay, easing: "linear", fill: "forwards"});

        // Chaque arrivée fait « encaisser » la cible
        anim.onfinish = () => {
            dot.remove();
            to.classList.remove("reward-fx-hit");
            void (to as HTMLElement).offsetWidth; // relance l'animation CSS
            to.classList.add("reward-fx-hit");
        };
    }

    window.setTimeout(() => {
        layer.remove();
        to.classList.remove("reward-fx-hit");
    }, lastEnd + 600);

    return {firstArrivalMs};
}
