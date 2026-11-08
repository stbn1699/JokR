import {useSyncExternalStore} from "react";
import {api} from "../api/api.ts";
import {chipImage} from "./chips.ts";
import {shopService} from "./shop.service.ts";

/*
 * Jeux de jetons de la boutique : le serveur lit les dossiers public/chips/<jeu>/ et renvoie les jeux, leurs images
 * et leurs prix (GET /shop/chip-sets). Le jeu choisi par le joueur (boutique) sert partout : roulette, Plinko.
 * Un jeu est repéré par un identifiant du type « chips:premium » ; « chips:default » : les jetons classiques.
 */

export type ChipSet = { id: string; set: string; name: string; price: number; chips: Record<string, string> };
export type ChipSetCatalog = { defaultSet: string; sets: ChipSet[] };

export const DEFAULT_CHIP_SET_ID = "chips:default";

let catalog: ChipSetCatalog | null = null;
// jeu choisi par le joueur (null : jetons classiques, ou pas encore chargé)
let mine: string | null = null;
let loading = false;
const listeners = new Set<() => void>();
const notify = () => listeners.forEach(l => l());

function load() {
    if (loading) return;
    loading = true;
    api<ChipSetCatalog>("/shop/chip-sets", {method: "GET"})
        .then(data => {
            catalog = data;
            notify();
        })
        .catch(() => {
            loading = false;
        });
    // jeu choisi : seulement pour un joueur connecté (sinon la requête échoue, jetons classiques)
    shopService.state()
        .then(state => {
            mine = state.chipSet;
            notify();
        })
        .catch(() => undefined);
}

const subscribe = (listener: () => void) => {
    listeners.add(listener);
    load();
    return () => listeners.delete(listener);
};

export const useChipSets = () => useSyncExternalStore(subscribe, () => catalog, () => null);
export const useMyChipSet = () => useSyncExternalStore(subscribe, () => mine ?? DEFAULT_CHIP_SET_ID, () => DEFAULT_CHIP_SET_ID);

// Jeu choisi dans la boutique : appliqué tout de suite partout
export function setMyChipSet(id: string | null) {
    mine = id === DEFAULT_CHIP_SET_ID ? null : id;
    notify();
}

// Image d'un jeton d'un jeu (jetons classiques si le jeu est inconnu ou pas encore chargé)
export function chipFile(value: number, setId: string | null, from: ChipSetCatalog | null = catalog): string {
    return from?.sets.find(s => s.id === setId)?.chips[String(value)] ?? chipImage(value);
}

// Image d'un jeton du jeu choisi par le joueur (ou d'un autre jeu, pour un aperçu)
export function useChipImage(setId?: string): (value: number) => string {
    const sets = useChipSets();
    const my = useMyChipSet();
    const id = setId ?? my;
    return (value: number) => chipFile(value, id, sets);
}
