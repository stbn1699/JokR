import {useLayoutEffect, useRef} from "react";
import type {IconType} from "react-icons";

/**
 * Icône d'un thème ou d'une catégorie du Quizz, à taille de dessin égale : les familles d'icônes ne laissent pas
 * la même marge autour du dessin (celles de game-icons, « Gi », en laissent beaucoup plus que Font Awesome, « Fa »),
 * si bien qu'à taille de police égale certaines paraissaient plus petites. Le dessin est mesuré (getBBox) et la
 * zone affichée (viewBox) recadrée sur un carré qui le contient tout juste : chaque icône remplit la même place,
 * celle des plus grandes (les petites sont agrandies).
 */

// marge laissée autour du dessin, en part de son plus grand côté : aucune, pour que chaque dessin prenne la taille
// des plus grandes icônes (celles qui remplissaient déjà leur cadre) ; les petites grandissent, aucune ne rétrécit
const PADDING = 0;

export default function QuizzIcon({icon: Icon}: { icon: IconType }) {
    const ref = useRef<HTMLSpanElement>(null);

    useLayoutEffect(() => {
        const svg = ref.current?.querySelector("svg");
        if (!svg) return;
        svg.removeAttribute("data-fitted");
        try {
            const box = svg.getBBox();
            if (box.width === 0 || box.height === 0) return;
            const side = Math.max(box.width, box.height) * (1 + 2 * PADDING);
            const x = box.x + box.width / 2 - side / 2;
            const y = box.y + box.height / 2 - side / 2;
            svg.setAttribute("viewBox", `${x} ${y} ${side} ${side}`);
            svg.setAttribute("data-fitted", "");
        } catch {
            // dessin pas encore mesurable (élément caché) : l'icône garde son cadre d'origine
        }
    }, [Icon]);

    return <span ref={ref} className="quizz-icon"><Icon aria-hidden/></span>;
}
