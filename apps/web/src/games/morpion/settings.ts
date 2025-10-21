import type {MorpionPlayerRef, MorpionSettings, MorpionSymbol} from "./types";

export const sanitizeMorpionSymbols = (
    players: MorpionPlayerRef[],
    base: Record<string, MorpionSymbol | undefined> = {}
): Record<string, MorpionSymbol | undefined> => {
    const sortedPlayers = [...players].sort((a, b) => a.joinedAt - b.joinedAt);
    const assigned = new Set<MorpionSymbol>();
    const symbols: Record<string, MorpionSymbol | undefined> = {};

    for (const player of sortedPlayers) {
        const symbol = base[player.id];
        if (symbol && !assigned.has(symbol)) {
            symbols[player.id] = symbol;
            assigned.add(symbol);
        }
    }

    for (const player of sortedPlayers) {
        if (symbols[player.id]) {
            continue;
        }

        if (!assigned.has("X")) {
            symbols[player.id] = "X";
            assigned.add("X");
            continue;
        }

        if (!assigned.has("O")) {
            symbols[player.id] = "O";
            assigned.add("O");
        }
    }

    return symbols;
};

export const ensureMorpionSettingsForPlayers = (
    players: MorpionPlayerRef[],
    settings?: MorpionSettings | null
): MorpionSettings => ({symbols: sanitizeMorpionSymbols(players, settings?.symbols)});

export const buildMorpionSettingsWithCross = (
    players: MorpionPlayerRef[],
    crossPlayerId: string | null
): MorpionSettings => {
    const baseSymbols: Record<string, MorpionSymbol | undefined> = {};
    if (crossPlayerId) {
        baseSymbols[crossPlayerId] = "X";
    }

    return {symbols: sanitizeMorpionSymbols(players, baseSymbols)};
};
