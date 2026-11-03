import {useEffect, useRef, useState, useSyncExternalStore} from "react";
import {rewardFx} from "../../Services/rewardFx.ts";
import {xpToNextLevel} from "../../Services/leveling.ts";

/*
 * Niveau, XP et crédits affichés par le header.
 * - Après une victoire, ils restent sur les valeurs d'avant (rewardFx.hold) jusqu'à l'arrivée des particules
 * - Ensuite, le changement est animé : la barre se remplit (jusqu'au bout puis repart en cas de montée de
 *   niveau), les crédits défilent
 * - Hors de ces moments (connexion, rechargement), les valeurs s'affichent directement
 */

export type Progress = { level: number; xp: number; credits: number };

export type ShownProgress = Progress & {
    // true : la barre change de largeur sans transition (retour à 0 après une montée de niveau)
    instant: boolean;
    // effets CSS en cours
    levelPop: boolean;
    creditsBump: boolean;
};

const FILL_MS = 800;
const CREDITS_MS = 900;

function still(p: Progress): ShownProgress {
    return {...p, instant: false, levelPop: false, creditsBump: false};
}

export function useHeaderProgress(live: Progress): ShownProgress {
    const fx = useSyncExternalStore(rewardFx.subscribe, rewardFx.getState);
    const target = fx.held ?? live;
    // Animation en cours (null : on affiche directement la cible)
    const [anim, setAnim] = useState<ShownProgress | null>(null);
    // Dernières valeurs affichées : point de départ de l'animation suivante
    const last = useRef<ShownProgress>(still(target));

    const {level, xp, credits} = target;
    useEffect(() => {
        const from = last.current;
        const frames: number[] = [];
        const timers: number[] = [];
        const cleanup = () => {
            frames.forEach(cancelAnimationFrame);
            timers.forEach(window.clearTimeout);
        };
        if (from.level === level && from.xp === xp && from.credits === credits) return cleanup;

        // Changement hors récompense : affichage direct
        if (Date.now() > fx.animateUntil) {
            frames.push(requestAnimationFrame(() => setAnim(null)));
            return cleanup;
        }

        const levelUp = level > from.level;
        const creditsChange = credits !== from.credits;

        // 1. La barre se remplit (jusqu'au bout si on change de niveau)
        frames.push(requestAnimationFrame(() => setAnim({
            ...from,
            instant: false,
            levelPop: false,
            creditsBump: creditsChange,
            ...(levelUp ? {xp: xpToNextLevel(from.level)} : {level, xp}),
        })));

        // 2. Les crédits défilent
        if (creditsChange) {
            const start = performance.now();
            const tick = (now: number) => {
                const t = Math.min(1, (now - start) / CREDITS_MS);
                const eased = 1 - Math.pow(1 - t, 3);
                const value = Math.round(from.credits + (credits - from.credits) * eased);
                setAnim(a => a && {...a, credits: value});
                if (t < 1) frames.push(requestAnimationFrame(tick));
            };
            frames.push(requestAnimationFrame(tick));
        }

        // 3. Montée de niveau : nouvelle icône, la barre repart de 0 vers l'XP du nouveau niveau
        if (levelUp) {
            timers.push(window.setTimeout(() => setAnim(a => a && {...a, level, xp: 0, instant: true, levelPop: true}), FILL_MS));
            timers.push(window.setTimeout(() => setAnim(a => a && {...a, xp, instant: false}), FILL_MS + 60));
        }

        // 4. Fin : on revient à l'affichage direct
        timers.push(window.setTimeout(() => setAnim(null), (levelUp ? 2 * FILL_MS : FILL_MS) + CREDITS_MS));
        return cleanup;
    }, [level, xp, credits, fx.animateUntil]);

    const shown = anim ?? still(target);
    useEffect(() => {
        last.current = shown;
    });
    return shown;
}
