/**
 * Écran trop petit pour le site : fenêtre de moins de 1000px de large (téléphone, petite fenêtre, gros zoom),
 * ou appareil tactile sans souris (téléphone, tablette). Le site est alors remplacé par l'écran « petit écran ».
 * Au-dessus, la mise en page de 1920px est réduite à la taille de la fenêtre (voir index.css).
 */

import {useSyncExternalStore} from "react";

const NARROW = "(max-width: 999px)";
const TOUCH_ONLY = "(hover: none) and (pointer: coarse)";
const QUERY = `${NARROW}, ${TOUCH_ONLY}`;

const subscribe = (onChange: () => void) => {
    const query = window.matchMedia(QUERY);
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
};

export const useSmallScreen = () =>
    useSyncExternalStore(subscribe, () => window.matchMedia(QUERY).matches, () => false);

/** Appareil tactile sans souris : téléphone ou tablette (sinon, un ordinateur dont la fenêtre est trop petite) */
export const isTouchOnly = () => window.matchMedia(TOUCH_ONLY).matches;
