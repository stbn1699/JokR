import type {IconType} from "react-icons";
import {FaFont, FaHashtag, FaPuzzlePiece, FaThLarge} from "react-icons/fa";

// Familles de jeux (« autres » : jeu pas encore classé, pour qu'il reste visible)
export type GameType = "chiffres" | "grille" | "mots" | "autres";

// Ordre des sections et des filtres de l'accueil
export const GAME_TYPE_ORDER: GameType[] = ["chiffres", "grille", "mots", "autres"];

export const GAME_TYPES: Record<GameType, { label: string; icon: IconType }> = {
    chiffres: {label: "Chiffres", icon: FaHashtag},
    grille: {label: "Grille", icon: FaThLarge},
    mots: {label: "Mots", icon: FaFont},
    autres: {label: "Autres", icon: FaPuzzlePiece},
};

// Type de chaque jeu (un nouveau jeu s'ajoute ici)
const TYPE_BY_GAME: Record<string, GameType> = {
    SUDOKU: "chiffres",
    BINERO: "chiffres",
    RIKUDO: "chiffres",
    TECTONIC: "chiffres",
    GALAXIES: "grille",
    SHIKAKU: "grille",
    QUEENS: "grille",
    TRACE: "grille",
    COLORIA: "grille",
    TUYAUX: "grille",
    LIENS: "grille",
    BOUCHON: "grille",
    PATURAGES: "grille",
    DEVIMOT: "mots",
    ECHELLE: "mots",
    MOTSMELES: "mots",
    MOTSACASER: "mots",
};

export function gameType(code: string): GameType {
    return TYPE_BY_GAME[code] ?? "autres";
}

// Jeux rangés par type, sans les types vides
export function groupGamesByType<T extends { code: string }>(games: T[]): { type: GameType; games: T[] }[] {
    return GAME_TYPE_ORDER
        .map(type => ({type, games: games.filter(game => gameType(game.code) === type)}))
        .filter(section => section.games.length > 0);
}
