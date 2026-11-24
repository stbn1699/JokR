import {type ReactNode} from "react";
import {useNavigate} from "react-router-dom";
import {useDailyGame} from "./useDailyGame.ts";
import DailyDonePopup from "./DailyDonePopup.tsx";
import {dailyService, formatDailyDate} from "../../Services/daily.service.ts";
import {DAILY_REWARD_MULTIPLIER} from "../../Services/dailyGames.ts";

// Props des jeux qui ont un défi du jour : défi du jour, ou défi d'un jour passé rejoué (AAAA-MM-JJ)
export type GridChallengeProps = { daily?: boolean; replayDate?: string };

type GridChallengeOptions<Saved extends { gameId: string }, Grid> = {
    code: string;
    gameName: string;
    // Défi du jour, ou défi d'un jour passé rejoué (AAAA-MM-JJ, hors classement)
    daily: boolean;
    replayDate?: string;
    fetchStatus: (gameId: string) => Promise<{ grid: Grid; elapsedMs: number }>;
    // sauvegarde d'un défi qui vient de commencer
    emptySave: (gameId: string) => Saved;
    onLoad: (grid: Grid, saved: Saved, elapsedMs: number) => void;
};

/**
 * Défi du jour (ou d'un jour passé) des jeux de grille réglés par une taille et un curseur :
 * pas de popup de réglages, la grille du jour arrive toute seule, avec sa propre sauvegarde.
 * Renvoie ce que le jeu affiche autour de sa grille : sous-titre de la barre d'outils, bandeau au-dessus
 * de la grille, popup « déjà réussi » et réglages de la popup de victoire.
 */
export function useGridChallenge<Saved extends { gameId: string }, Grid>(options: GridChallengeOptions<Saved, Grid>) {
    const {code, gameName, daily, replayDate} = options;
    const navigate = useNavigate();
    const challenge = daily || replayDate !== undefined;
    // sauvegardes séparées : on peut avoir une partie libre et un défi en cours en parallèle
    const saveKey = replayDate ? `${code}:replay:${replayDate}` : daily ? `${code}:daily` : code;

    const dailyGame = useDailyGame<Saved, Grid>({
        enabled: challenge,
        gameCode: code,
        saveKey,
        fetchStatus: options.fetchStatus,
        emptySave: options.emptySave,
        start: replayDate ? () => dailyService.replay<Grid>(code, replayDate) : undefined,
        onLoad: options.onLoad,
    });

    const toolbarLabel: ReactNode = daily ? <>Défi du jour <span className="daily-x2">×{DAILY_REWARD_MULTIPLIER}</span></>
        : replayDate ? `Défi du ${formatDailyDate(replayDate)}` : undefined;

    const banner: ReactNode = daily ? (
        <p className="daily-label">
            Défi du jour{dailyGame.date ? ` · ${formatDailyDate(dailyGame.date)}` : ""}
            <span className="daily-x2">XP et crédits ×{DAILY_REWARD_MULTIPLIER}</span>
        </p>
    ) : replayDate ? <p className="daily-label">Défi du {formatDailyDate(replayDate)} · hors classement</p> : null;

    const donePopup: ReactNode = dailyGame.done ? <DailyDonePopup gameCode={code} gameName={gameName} result={dailyGame.done}/> : null;

    // Popup de victoire : après un défi, « Partie libre » (ou les autres défis pour un jour passé)
    const victory = (newGame: () => void) => ({
        onNewGame: replayDate ? () => navigate("/defi") : daily ? () => navigate(`/playgame/${code}`) : newGame,
        newGameLabel: replayDate ? "Autres défis" : daily ? "Partie libre" : undefined,
        back: replayDate ? null : daily ? "daily" as const : "home" as const,
    });

    return {challenge, saveKey, loading: dailyGame.loading, error: dailyGame.error, toolbarLabel, banner, donePopup, victory};
}
