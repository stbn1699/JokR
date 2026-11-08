import {useSyncExternalStore} from "react";
import {api} from "../api/api.ts";
import {shopService} from "./shop.service.ts";

/*
 * Billes de Plinko de la boutique : le serveur lit les dossiers public/plinko_ball/<série>/ et renvoie
 * les séries, leurs couleurs (image, nom) et leurs prix (GET /shop/plinko-balls). Chargé une fois par visite.
 * Une bille est repérée par un identifiant du type « ball:rainbow/1_red ».
 * La bille choisie par le joueur est partagée dans tout le site (Plinko, boutique, crayon de personnalisation).
 */

export type PlinkoBall = { id: string; set: string; file: string; name: string; price: number };
export type PlinkoBallSet = { set: string; name: string; price: number; balls: PlinkoBall[] };
export type PlinkoBallCatalog = { defaultBall: string; sets: PlinkoBallSet[] };

export const DEFAULT_BALL_ID = "ball:rainbow/3_default";
export const DEFAULT_BALL_FILE = "/plinko_ball/rainbow/3_default.svg";

let catalog: PlinkoBallCatalog | null = null;
// bille choisie par le joueur (null : bille par défaut, ou pas encore chargée)
let mine: string | null = null;
let loading: Promise<void> | null = null;
const listeners = new Set<() => void>();

function load() {
    loading ??= api<PlinkoBallCatalog>("/shop/plinko-balls", {method: "GET"})
        .then(data => {
            catalog = data;
            listeners.forEach(l => l());
        })
        .catch(() => {
            // réessaie à la prochaine demande
            loading = null;
        });
    // bille choisie : seulement pour un joueur connecté
    shopService.state()
        .then(state => {
            mine = state.plinkoBall;
            listeners.forEach(l => l());
        })
        .catch(() => undefined);
}

const subscribe = (listener: () => void) => {
    listeners.add(listener);
    load();
    return () => listeners.delete(listener);
};

// Catalogue des billes (null le temps du chargement)
export const usePlinkoBalls = () => useSyncExternalStore(subscribe, () => catalog, () => null);

// Bille choisie par le joueur (la bille par défaut si aucune)
export const useMyPlinkoBall = () => useSyncExternalStore(subscribe, () => mine ?? DEFAULT_BALL_ID, () => DEFAULT_BALL_ID);

// Bille choisie (boutique, crayon) : appliquée tout de suite partout
export function setMyPlinkoBall(id: string | null) {
    mine = id === DEFAULT_BALL_ID ? null : id;
    listeners.forEach(l => l());
}

// Image d'une bille (la bille par défaut si elle est inconnue ou pas encore chargée)
export function plinkoBallFile(id: string | null | undefined, from: PlinkoBallCatalog | null = catalog): string {
    if (!id) return DEFAULT_BALL_FILE;
    return from?.sets.flatMap(s => s.balls).find(b => b.id === id)?.file ?? DEFAULT_BALL_FILE;
}
