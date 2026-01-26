import type {GameStats} from "./GameStats.model.js";

export type UserStats = {
    id: string;
    gameStats: GameStats[];
}