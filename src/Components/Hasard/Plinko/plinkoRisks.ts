import type {PlinkoRisk} from "../../../../backend/src/utils/plinko.ts";

// Tableaux de gains du Plinko : nom affiché et description courte
export const RISK_LABELS: Record<PlinkoRisk, { name: string; hint: string }> = {
    low: {name: "Prudent", hint: "Petits gains, une bille sur deux gagne"},
    medium: {name: "Équilibré", hint: "Jusqu'à ×10 sur les bords"},
    high: {name: "Risqué", hint: "×25 sur les bords, ×0,1 au centre"},
};
