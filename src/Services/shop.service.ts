import {api} from "../api/api.ts";

// Ce que le joueur possède dans la boutique
export interface ShopState {
    credits: number;
    // fond du site choisi (null : fond par défaut)
    background: string | null;
    // bille de Plinko choisie (null : bille par défaut)
    plinkoBall: string | null;
    // jeu de jetons choisi (null : jetons classiques)
    chipSet: string | null;
    // effet de victoire choisi (null : les confettis)
    victoryEffect: string | null;
    owned: string[];
    // prix de chaque objet, donné par le serveur
    prices: Record<string, number>;
}

// Objet parmi les meilleures ventes : achats des 7 derniers jours, et depuis toujours
export interface BestSeller {
    itemId: string;
    week: number;
    total: number;
}

const json = {"Content-Type": "application/json"};

export const shopService = {
    async bestSellers(signal?: AbortSignal): Promise<BestSeller[]> {
        const {items} = await api<{ items: BestSeller[] }>("/shop/best-sellers", {method: "GET"}, signal);
        return items;
    },

    state(signal?: AbortSignal): Promise<ShopState> {
        return api<ShopState>("/shop", {method: "GET"}, signal);
    },

    // Achète un objet : renvoie les crédits restants
    async buy(itemId: string): Promise<number> {
        const {credits} = await api<{ credits: number }>("/shop/buy", {method: "POST", headers: json, body: JSON.stringify({itemId})});
        return credits;
    },

    // Choisit un jeu de jetons possédé (null : jetons classiques)
    // Choisit un effet de victoire possédé (null : les confettis)
    async setVictoryEffect(itemId: string | null): Promise<void> {
        await api("/shop/victory-effect", {method: "PUT", headers: json, body: JSON.stringify({itemId})});
    },

    async setChipSet(itemId: string | null): Promise<void> {
        await api("/shop/chip-set", {method: "PUT", headers: json, body: JSON.stringify({itemId})});
    },

    // Choisit une bille de Plinko possédée (null : bille par défaut)
    async setPlinkoBall(itemId: string | null): Promise<void> {
        await api("/shop/plinko-ball", {method: "PUT", headers: json, body: JSON.stringify({itemId})});
    },

    // Choisit un fond possédé (null : fond par défaut)
    async setBackground(itemId: string | null): Promise<void> {
        await api("/shop/background", {method: "PUT", headers: json, body: JSON.stringify({itemId})});
    },
};
