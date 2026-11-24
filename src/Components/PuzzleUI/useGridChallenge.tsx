import {type ReactNode} from "react";
import {useNavigate} from "react-router-dom";
import {useDailyGame} from "./useDailyGame.ts";
import DailyDonePopup from "./DailyDonePopup.tsx";
import {dailyService, formatDailyDate} from "../../Services/daily.service.ts";
import {challengeService} from "../../Services/challenge.service.ts";
import {DAILY_REWARD_MULTIPLIER} from "../../Services/dailyGames.ts";

// Props des jeux qui ont des défis : défi du jour, défi d'un jour passé rejoué (AAAA-MM-JJ), défi d'un·e ami·e
export type GridChallengeProps = { daily?: boolean; replayDate?: string; challengeId?: string };

type GridChallengeOptions<Saved extends { gameId: string }, Grid> = GridChallengeProps & {
    code: string;
    gameName: string;
    fetchStatus: (gameId: string) => Promise<{ grid: Grid; elapsedMs: number }>;
    // sauvegarde d'un défi qui vient de commencer
    emptySave: (gameId: string) => Saved;
    onLoad: (grid: Grid, saved: Saved, elapsedMs: number) => void;
};

/**
 * Défis des jeux réglés par une taille et un curseur (jeux de grille et de mots ajoutés depuis 3.3) :
 * défi du jour, défi d'un jour passé (hors classement) ou défi d'un·e ami·e (sa grille, à faire une fois).
 * Pas de popup de réglages : la grille arrive toute seule, avec sa propre sauvegarde.
 * Renvoie ce que le jeu affiche autour de sa grille : sous-titre de la barre d'outils, bandeau au-dessus
 * de la grille, popup « déjà réussi » et réglages de la popup de victoire (dont « Défier des ami·e·s »).
 */
export function useGridChallenge<Saved extends { gameId: string }, Grid>(options: GridChallengeOptions<Saved, Grid>) {
    const {code, gameName, daily = false, replayDate, challengeId} = options;
    const navigate = useNavigate();
    const challenge = daily || replayDate !== undefined || challengeId !== undefined;
    // sauvegardes séparées : on peut avoir une partie libre et un défi en cours en parallèle
    const saveKey = challengeId ? `${code}:challenge:${challengeId}` : replayDate ? `${code}:replay:${replayDate}` : daily ? `${code}:daily` : code;

    const dailyGame = useDailyGame<Saved, Grid>({
        enabled: challenge,
        gameCode: code,
        saveKey,
        fetchStatus: options.fetchStatus,
        emptySave: options.emptySave,
        start: challengeId ? () => challengeService.start<Grid>(challengeId)
            : replayDate ? () => dailyService.replay<Grid>(code, replayDate) : undefined,
        onLoad: options.onLoad,
    });

    const toolbarLabel: ReactNode = daily ? <>Défi du jour <span className="daily-x2">×{DAILY_REWARD_MULTIPLIER}</span></>
        : replayDate ? `Défi du ${formatDailyDate(replayDate)}` : challengeId ? "Défi d'un·e ami·e" : undefined;

    const banner: ReactNode = daily ? (
        <p className="daily-label">
            Défi du jour{dailyGame.date ? ` · ${formatDailyDate(dailyGame.date)}` : ""}
            <span className="daily-x2">XP et crédits ×{DAILY_REWARD_MULTIPLIER}</span>
        </p>
    ) : replayDate ? <p className="daily-label">Défi du {formatDailyDate(replayDate)} · hors classement</p>
        : challengeId ? <p className="daily-label">Défi d'un·e ami·e · la même grille, à toi de jouer</p> : null;

    const donePopup: ReactNode = dailyGame.done ? <DailyDonePopup gameCode={code} gameName={gameName} result={dailyGame.done}/> : null;

    // Popup de victoire : après un défi, « Partie libre » (ou les autres défis pour un jour passé) ;
    // défier des ami·e·s après une partie libre ou le défi du jour ; résultat du défi d'un·e ami·e
    const victory = (newGame: () => void) => ({
        onNewGame: replayDate ? () => navigate("/defi") : daily || challengeId ? () => navigate(`/playgame/${code}`) : newGame,
        newGameLabel: replayDate ? "Autres défis" : daily || challengeId ? "Partie libre" : undefined,
        back: replayDate ? null : daily ? "daily" as const : "home" as const,
        defy: replayDate || challengeId ? undefined : daily ? "daily" as const : "free" as const,
        challengeId,
    });

    return {challenge, saveKey, loading: dailyGame.loading, error: dailyGame.error, toolbarLabel, banner, donePopup, victory};
}
