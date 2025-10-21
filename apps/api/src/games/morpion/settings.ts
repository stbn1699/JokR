import type {MorpionPlayerRef, MorpionSettings, MorpionSymbol} from "./types";

export const createDefaultMorpionSettings = (): MorpionSettings => ({symbols: {}});

export const sanitizeMorpionSymbols = (
    players: MorpionPlayerRef[],
    base: Record<string, MorpionSymbol> = {}
): Record<string, MorpionSymbol> => {
    const sortedPlayers = [...players].sort((a, b) => a.joinedAt - b.joinedAt);
    const assigned = new Set<MorpionSymbol>();
    const symbols: Record<string, MorpionSymbol> = {};

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
): MorpionSettings => {
    const baseSymbols = settings?.symbols ?? {};
    return {symbols: sanitizeMorpionSymbols(players, baseSymbols)};
};
