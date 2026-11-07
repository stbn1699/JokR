import {api} from "../api/api.ts";

// Ce que le joueur possède dans la boutique
export interface ShopState {
    credits: number;
    // fond du site choisi (null : fond par défaut)
    background: string | null;
    owned: string[];
    // prix de chaque objet, donné par le serveur
    prices: Record<string, number>;
}

const json = {"Content-Type": "application/json"};

export const shopService = {
    state(signal?: AbortSignal): Promise<ShopState> {
        return api<ShopState>("/shop", {method: "GET"}, signal);
    },

    // Achète un objet : renvoie les crédits restants
    async buy(itemId: string): Promise<number> {
        const {credits} = await api<{ credits: number }>("/shop/buy", {method: "POST", headers: json, body: JSON.stringify({itemId})});
        return credits;
    },

    // Choisit un fond possédé (null : fond par défaut)
    async setBackground(itemId: string | null): Promise<void> {
        await api("/shop/background", {method: "PUT", headers: json, body: JSON.stringify({itemId})});
    },
};
