/*
 * Onglet Social : règles qui ne touchent pas à la base (testées dans social.test.ts).
 */

// ---------- Défis : qui affronte qui

// Une ligne par joueur défié (friend_challenge_players), avec le défi : `senderMs` est le temps de celui qui a envoyé
// sa grille (null pour un duel, où l'envoyeur a sa propre ligne de joueur)
export type ChallengeRow = {
    challengeId: string;
    senderId: string;
    senderMs: number | null;
    userId: string;
    durationMs: number | null;
    finishedAt: Date | null;
};

// Un face-à-face fini : `senderId` contre `opponentId`, chacun avec son temps
export type ChallengeMatch = { challengeId: string; senderId: string; opponentId: string; senderMs: number; opponentMs: number; at: Date };

/*
 * Face-à-face terminés (les deux temps connus). Une grille envoyée à plusieurs amis fait un face-à-face par ami
 * (contre l'envoyeur, jamais entre eux). Pour un duel, le temps de l'envoyeur est sur sa ligne.
 * Rangés du plus ancien au plus récent (moment où le second a fini).
 */
export function challengeMatches(rows: ChallengeRow[]): ChallengeMatch[] {
    const senderTime = new Map<string, { ms: number; at: Date | null }>();
    for (const r of rows) {
        if (r.userId === r.senderId && r.durationMs !== null) senderTime.set(r.challengeId, {ms: r.durationMs, at: r.finishedAt});
    }
    const matches: ChallengeMatch[] = [];
    for (const r of rows) {
        if (r.userId === r.senderId || r.durationMs === null) continue;
        const sender = r.senderMs !== null ? {ms: r.senderMs, at: null} : senderTime.get(r.challengeId);
        if (!sender) continue;
        const at = [r.finishedAt, sender.at].filter((d): d is Date => d !== null).sort((a, b) => b.getTime() - a.getTime())[0] ?? new Date(0);
        matches.push({challengeId: r.challengeId, senderId: r.senderId, opponentId: r.userId, senderMs: sender.ms, opponentMs: r.durationMs, at});
    }
    return matches.sort((a, b) => a.at.getTime() - b.at.getTime());
}

// Bilan de `me` contre chaque adversaire : victoires, défaites (égalité au millième : ni l'un ni l'autre)
export function records(me: string, matches: ChallengeMatch[]): Map<string, { wins: number; losses: number }> {
    const result = new Map<string, { wins: number; losses: number }>();
    for (const m of matches) {
        const mine = m.senderId === me;
        if (!mine && m.opponentId !== me) continue;
        const other = mine ? m.opponentId : m.senderId;
        const [myMs, theirMs] = mine ? [m.senderMs, m.opponentMs] : [m.opponentMs, m.senderMs];
        const record = result.get(other) ?? {wins: 0, losses: 0};
        if (myMs < theirMs) record.wins++;
        else if (myMs > theirMs) record.losses++;
        result.set(other, record);
    }
    return result;
}

// ---------- Duels : difficulté → grille

export const DIFFICULTIES = ["Facile", "Moyen", "Difficile", "Expert"] as const;
export type Difficulty = typeof DIFFICULTIES[number];
// Jeux sans banque de niveaux : une seule difficulté, celle du défi du jour
export const STANDARD = "Standard";

export const isDifficulty = (v: unknown): v is Difficulty => typeof v === "string" && (DIFFICULTIES as readonly string[]).includes(v);

/*
 * Niveaux (numérotés à partir de 1) où piocher la grille d'un duel : les niveaux sont rangés du plus simple au plus
 * retors, on coupe ce qui suit le tutoriel en quatre tranches inégales (les premières grilles se ressemblent plus).
 */
export function difficultyRange(difficulty: Difficulty, count: number, tutorial: number): { from: number; to: number } {
    const playable = count - tutorial;
    const cuts = [0, 0.15, 0.45, 0.75, 1];
    const i = DIFFICULTIES.indexOf(difficulty);
    const from = tutorial + 1 + Math.floor(playable * cuts[i]!);
    const to = Math.max(from, tutorial + Math.floor(playable * cuts[i + 1]!));
    return {from, to};
}

// ---------- Messages

export const MESSAGE_MAX = 500;

// Texte d'un message : espaces en trop retirés ; null s'il est vide ou trop long
export function cleanMessage(value: unknown): string | null {
    if (typeof value !== "string") return null;
    const text = value.replace(/\r\n?/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
    if (!text || text.length > MESSAGE_MAX) return null;
    return text;
}
