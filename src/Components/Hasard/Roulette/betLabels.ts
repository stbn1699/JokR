import {rouletteNumbers} from "../../../../backend/src/utils/roulette.ts";

const OUTSIDE_LABELS: Record<string, string> = {
    red: "Rouge", black: "Noir", even: "Pair", odd: "Impair", low: "1-18", high: "19-36",
    "dozen:1": "1-12", "dozen:2": "13-24", "dozen:3": "25-36",
    "column:1": "Col. 1", "column:2": "Col. 2", "column:3": "Col. 3",
};

// Nom court d'une mise : « 17 », « 17/20 » (à cheval), « 17/18/20/21 » (carré), « Rouge »…
export const betLabel = (key: string) => OUTSIDE_LABELS[key] ?? rouletteNumbers(key)?.join("/") ?? key;
