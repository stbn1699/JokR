import {useSyncExternalStore} from "react";
import {api} from "../api/api.ts";

/*
 * Fonds en images de la boutique (drapeaux des fiertés…) : le serveur lit public/backgrounds/<série>/<format>/
 * et renvoie chaque fond avec une image par format (GET /shop/backgrounds). Chargé une fois par visite.
 * Un fond est repéré par un identifiant du type « bg:lgbt/trans ».
 */

export type ImageBackground = { id: string; set: string; name: string; price: number; file: string };
export type ImageBackgroundSet = { set: string; name: string; price: number; backgrounds: ImageBackground[] };

let catalog: ImageBackgroundSet[] | null = null;
let loading = false;
const listeners = new Set<() => void>();

const subscribe = (listener: () => void) => {
    listeners.add(listener);
    if (!loading) {
        loading = true;
        api<{ sets: ImageBackgroundSet[] }>("/shop/backgrounds", {method: "GET"})
            .then(data => {
                catalog = data.sets;
                listeners.forEach(l => l());
            })
            .catch(() => {
                loading = false;
            });
    }
    return () => listeners.delete(listener);
};

// Fonds en images, par série (null le temps du chargement)
export const useImageBackgrounds = () => useSyncExternalStore(subscribe, () => catalog, () => null);

export const findImageBackground = (id: string | null | undefined, from: ImageBackgroundSet[] | null) =>
    id ? from?.flatMap(s => s.backgrounds).find(b => b.id === id) : undefined;

export const isImageBackground = (id: string | null | undefined) => id?.startsWith("bg:") === true;

// Fond CSS d'une image : elle couvre toute la zone (ses bords flous sont cachés par un léger débordement, voir index.css)
export const imageCss = (file: string) => `url("${file}") center / cover no-repeat`;
