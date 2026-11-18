import {useSyncExternalStore} from "react";
import {shopService} from "./shop.service.ts";
import {playVictoryEffect} from "../Components/Confetti/VictoryEffects.ts";

/*
 * Effets de victoire de la boutique : joués en fin de grille (SuccessPopup). Les confettis sont offerts (effet par
 * défaut) ; les autres s'achètent (mêmes identifiants et prix que backend/src/utils/shop.ts).
 * L'effet choisi par le joueur est lu avec le reste de la boutique (GET /shop) et partagé dans tout le site.
 */

export const VICTORY_PRICE = 30;
export const DEFAULT_VICTORY_ID = "victory-confettis";

export type VictoryEffect = { id: string; slug: string; name: string; description: string; free: boolean };

export const VICTORY_EFFECTS: VictoryEffect[] = [
    {slug: "confettis", name: "Confettis", description: "Une pluie de confettis de toutes les couleurs.", free: true},
    {slug: "artifice", name: "Feux d'artifice", description: "Des fusées qui éclatent en gerbes de couleur.", free: false},
    {slug: "jetons", name: "Pluie de jetons", description: "Tes jetons de casino tombent en tournoyant.", free: false},
    {slug: "etoiles", name: "Étoiles", description: "Une explosion d'étoiles dorées depuis le centre.", free: false},
    {slug: "cartes", name: "Pluie de cartes", description: "Des cartes à jouer qui tombent en virevoltant.", free: false},
    {slug: "bulles", name: "Bulles", description: "Des bulles qui montent et éclatent en haut de l'écran.", free: false},
].map(e => ({...e, id: `victory-${e.slug}`}));

export const findVictoryEffect = (id: string | null | undefined) => VICTORY_EFFECTS.find(e => e.id === id);

// effet choisi (null : les confettis, ou pas encore lu)
let mine: string | null = null;
let loading: Promise<void> | null = null;
const listeners = new Set<() => void>();
const notify = () => listeners.forEach(l => l());

// Lu une fois (seulement pour un joueur connecté : sinon la requête échoue, et ce sont les confettis)
function load(): Promise<void> {
    loading ??= shopService.state()
        .then(state => {
            mine = state.victoryEffect;
            notify();
        })
        .catch(() => {
            loading = null;
        });
    return loading;
}

const subscribe = (listener: () => void) => {
    listeners.add(listener);
    void load();
    return () => listeners.delete(listener);
};

export const useMyVictoryEffect = () => useSyncExternalStore(subscribe, () => mine ?? DEFAULT_VICTORY_ID, () => DEFAULT_VICTORY_ID);

// Effet choisi (boutique, page Personnaliser) : appliqué tout de suite
export function setMyVictoryEffect(id: string | null) {
    mine = id === DEFAULT_VICTORY_ID ? null : id;
    notify();
}

// Fin de grille : joue l'effet du joueur (le choix est lu au besoin, sans faire attendre plus d'un instant)
export async function playMyVictoryEffect() {
    await Promise.race([load(), new Promise(resolve => setTimeout(resolve, 600))]);
    playVictoryEffect(mine ?? DEFAULT_VICTORY_ID);
}
