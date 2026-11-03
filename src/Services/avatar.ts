/*
 * Icônes de profil générées (dans l'esprit des identicons de GitHub).
 *
 * Une icône = une grille 5×5 symétrique, style plat : de gros blocs d'une couleur vive sur un fond uni
 * clair (comme une grille de puzzle). Tout est tiré d'une graine texte (`avatar`
 * en base, 4 à 32 caractères a-z0-9) : la même graine donne toujours la même icône, rien d'autre n'est stocké.
 */

export const AVATAR_PATTERN = /^[a-z0-9]{4,32}$/;

export type AvatarCell = { x: number; y: number };

// Style plat : un fond uni clair et de gros blocs d'une seule couleur vive
export type AvatarDesign = {
    background: string;
    color: string;
    cells: AvatarCell[];
};

// Graine → entier 32 bits (FNV-1a, puis mélange pour bien répartir les bits)
function hash32(text: string): number {
    let h = 0x811c9dc5;
    for (let i = 0; i < text.length; i++) {
        h ^= text.charCodeAt(i);
        h = Math.imul(h, 0x01000193);
    }
    h ^= h >>> 16;
    h = Math.imul(h, 0x85ebca6b);
    h ^= h >>> 13;
    h = Math.imul(h, 0xc2b2ae35);
    h ^= h >>> 16;
    return h >>> 0;
}

// Générateur pseudo-aléatoire reproductible (mulberry32)
function generator(seed: number): () => number {
    let a = seed;
    return () => {
        a = (a + 0x6d2b79f5) | 0;
        let t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

const hsl = (h: number, s: number, l: number) => `hsl(${Math.round(((h % 360) + 360) % 360)}, ${s}%, ${l}%)`;

export function avatarDesign(seed: string): AvatarDesign {
    const random = generator(hash32(seed));
    const hue = random() * 360;
    // un peu de variété dans la vivacité et la luminosité des blocs
    const saturation = 62 + Math.round(random() * 20);
    const lightness = 46 + Math.round(random() * 10);

    // Motif : 3 colonnes tirées au hasard, recopiées en miroir (colonnes 3 et 4 = 1 et 0)
    let half: boolean[][] = [];
    for (let attempt = 0; attempt < 12; attempt++) {
        half = Array.from({length: 5}, () => Array.from({length: 3}, () => random() < 0.5));
        const filled = half.reduce((n, row) => n + (row[0] ? 2 : 0) + (row[1] ? 2 : 0) + (row[2] ? 1 : 0), 0);
        const middle = half.some(row => row[2]);
        // ni trop vide ni trop plein, et quelque chose au centre pour que le motif « tienne »
        if (filled >= 8 && filled <= 17 && middle) break;
    }

    const cells: AvatarCell[] = [];
    for (let y = 0; y < 5; y++) {
        for (let x = 0; x < 5; x++) {
            const source = x < 3 ? x : 4 - x;
            if (half[y]![source]) cells.push({x, y});
        }
    }

    return {
        background: hsl(hue, 55, 92),
        color: hsl(hue, saturation, lightness),
        cells,
    };
}

// Nouvelle graine au hasard (12 caractères a-z0-9)
export function randomAvatarSeed(): string {
    const alphabet = "abcdefghijklmnopqrstuvwxyz0123456789";
    const bytes = new Uint8Array(12);
    crypto.getRandomValues(bytes);
    return Array.from(bytes, b => alphabet[b % alphabet.length]).join("");
}
