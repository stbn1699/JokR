/**
 * Header qui s'efface au défilement : caché quand on descend dans la page, de retour dès qu'on remonte.
 * Il part dès le premier vrai mouvement vers le bas. Toujours visible tout en haut de la page, et tant qu'une fenêtre (visite guidée, popup…) est ouverte.
 */

import {useEffect, useState} from "react";

// en deçà, un petit mouvement (tremblement du doigt, rebond en bas de page) ne change rien
const THRESHOLD = 8;

export function useHideOnScroll(enabled: boolean, resetKey: string): boolean {
    // caché pour quelle page : en changeant de page, le header réapparaît
    const [hiddenOn, setHiddenOn] = useState<string | null>(null);

    useEffect(() => {
        if (!enabled) return;
        const setHidden = (hidden: boolean) => setHiddenOn(hidden ? resetKey : null);
        let last = window.scrollY;
        const onScroll = () => {
            const y = window.scrollY;
            if (y <= 0 || document.querySelector("[aria-modal='true']")) {
                setHidden(false);
                last = y;
                return;
            }
            if (Math.abs(y - last) < THRESHOLD) return;
            setHidden(y > last);
            last = y;
        };
        window.addEventListener("scroll", onScroll, {passive: true});
        return () => window.removeEventListener("scroll", onScroll);
    }, [enabled, resetKey]);

    return enabled && hiddenOn === resetKey;
}
