/*
 * XP gagnée selon la place finale à un défi du jour (pour chaque jeu, à la clôture du défi) :
 * 1er : 200, 2e : 150, 3e : 100, puis du 4e (47) au 50e (1), un de moins par place. Au-delà : rien.
 * Ex aequo : même place, donc même XP.
 */
export const DAILY_RANK_XP_LAST_RANK = 50;

export function dailyRankXp(rank: number): number {
    if (!Number.isInteger(rank) || rank < 1) return 0;
    if (rank === 1) return 200;
    if (rank === 2) return 150;
    if (rank === 3) return 100;
    return rank <= DAILY_RANK_XP_LAST_RANK ? DAILY_RANK_XP_LAST_RANK + 1 - rank : 0;
}
