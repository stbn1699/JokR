// Statistiques de la boutique (GET /stats/shop, administrateur) ; montants en crédits

export type ShopStatsData = {
    generatedAt: string;
    overview: {
        purchases: number; spent: number; buyers: number; purchases1: number; purchases7: number; spent7: number;
        buyers7: number; first: string | null;
        // tous les comptes, crédits qu'ils détiennent, et combien portent un fond (acheté ou de niveau)
        users: number; creditsHeld: number; wearing: number; wearingBought: number; wearingTier: number;
    };
    items: { itemId: string; sales: number; spent: number; sales7: number; last: string; wearing: number }[];
    // fonds portés en ce moment (background null : fond par défaut)
    worn: { background: string | null; players: number }[];
    timeline: { day: string; purchases: number; spent: number; buyers: number }[];
    buyers: { username: string; purchases: number; spent: number; credits: number; background: string | null; last: string }[];
    recent: { username: string; itemId: string; price: number; at: string }[];
};
