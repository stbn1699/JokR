/*
 * Partage d'un défi du jour réussi : « J'ai fait 2:31 au Queens du jour ! … »
 */

// Temps au format court du message : "0:45", "2:31", "1:02:45"
export function shareTime(ms: number): string {
    const total = Math.max(0, Math.floor(ms / 1000));
    const [h, m, s] = [Math.floor(total / 3600), Math.floor((total % 3600) / 60), total % 60];
    const pad = (n: number) => String(n).padStart(2, "0");
    return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
}

export type DailyShare = {
    gameCode: string;
    gameName: string;
    durationMs: number;
};

// Message partagé (sans le lien, ajouté à part : les applications le mettent en aperçu).
// Pas de place au classement : elle change encore jusqu'à minuit.
export function dailyShareText({gameName, durationMs}: DailyShare): string {
    return `J'ai fait ${shareTime(durationMs)} au ${gameName} du jour ! Viens jouer contre moi sur JokR :`;
}

// Lien vers le défi du jour de ce jeu
export const dailyShareUrl = (gameCode: string, origin = window.location.origin) => `${origin}/defi/${gameCode.toUpperCase()}`;

/**
 * Partage le défi : menu de partage du système s'il existe (téléphone), sinon copie du message et du lien.
 * "shared" : partagé (ou menu fermé) · "copied" : copié · "failed" : rien n'a marché
 */
export async function shareDaily(share: DailyShare): Promise<"shared" | "copied" | "failed"> {
    const text = dailyShareText(share);
    const url = dailyShareUrl(share.gameCode);
    if (typeof navigator.share === "function") {
        try {
            await navigator.share({title: "JokR", text, url});
            return "shared";
        } catch (err) {
            // Menu fermé sans partager : rien à signaler
            if ((err as Error).name === "AbortError") return "shared";
        }
    }
    try {
        await navigator.clipboard.writeText(`${text} ${url}`);
        return "copied";
    } catch {
        return "failed";
    }
}
