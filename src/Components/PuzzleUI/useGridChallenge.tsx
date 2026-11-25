import {type ReactNode} from "react";
import {Link, useNavigate} from "react-router-dom";
import {useDailyGame} from "./useDailyGame.ts";
import DailyDonePopup from "./DailyDonePopup.tsx";
import {dailyService, formatDailyDate} from "../../Services/daily.service.ts";
import {challengeService} from "../../Services/challenge.service.ts";
import {DAILY_REWARD_MULTIPLIER} from "../../Services/dailyGames.ts";
import {levelsService} from "../../Services/levels.service.ts";
import LevelVictory, {type LevelInfo} from "../Levels/LevelVictory.tsx";
import {LessonTop} from "../Levels/LessonFrame.tsx";
import {levelName} from "../Levels/worlds.ts";
import type {Victory} from "./useGameFlow.ts";

// Props des jeux qui ont des défis : défi du jour, défi d'un jour passé rejoué (AAAA-MM-JJ), défi d'un·e ami·e,
// ou niveau du mode Niveaux (avec le nombre de niveaux et la taille du tutoriel)
export type GridChallengeProps = { daily?: boolean; replayDate?: string; challengeId?: string; level?: number; levelInfo?: LevelInfo };

type GridChallengeOptions<Saved extends { gameId: string }, Grid> = GridChallengeProps & {
    code: string;
    gameName: string;
    fetchStatus: (gameId: string) => Promise<{ grid: Grid; elapsedMs: number }>;
    // sauvegarde d'un défi qui vient de commencer
    emptySave: (gameId: string) => Saved;
    onLoad: (grid: Grid, saved: Saved, elapsedMs: number) => void;
    // titres des leçons du tutoriel guidé (mode Niveaux)
    lessonTitles?: readonly string[];
    // « au Coloria », « aux Tuyaux » : fin du tutoriel (« tu sais maintenant jouer aux Tuyaux »)
    playName?: string;
};

/**
 * Défis des jeux réglés par une taille et un curseur (jeux de grille et de mots ajoutés depuis 3.3) :
 * défi du jour, défi d'un jour passé (hors classement), défi d'un·e ami·e (sa grille, à faire une fois)
 * ou niveau du mode Niveaux (les premiers sont les leçons du tutoriel guidé, voir Lessons/useLessonCoach.tsx).
 * Pas de popup de réglages : la grille arrive toute seule, avec sa propre sauvegarde.
 * Renvoie ce que le jeu affiche autour de sa grille : sous-titre de la barre d'outils, bandeau au-dessus
 * de la grille, popup « déjà réussi » et réglages de la popup de victoire (dont « Défier des ami·e·s ») ;
 * pour un niveau, sa propre popup de victoire (levelVictory).
 * Leçon du tutoriel : comme les tutoriels des jeux d'origine (Levels/LessonFrame.tsx), le bandeau est le haut de la leçon
 * (lien vers la carte, badge « Leçon n/3 · titre ») et `layoutClass` (in-lesson) cache la barre d'outils, les panneaux
 * (chrono, annuler, règles…) et le titre : il ne reste que la grille, la bulle et les commandes que la leçon montre.
 */
export function useGridChallenge<Saved extends { gameId: string }, Grid>(options: GridChallengeOptions<Saved, Grid>) {
    const {code, gameName, daily = false, replayDate, challengeId, level, levelInfo} = options;
    const navigate = useNavigate();
    const challenge = daily || replayDate !== undefined || challengeId !== undefined || level !== undefined;
    // sauvegardes séparées : on peut avoir une partie libre et un défi en cours en parallèle
    const saveKey = level ? `${code}:level:${level}` : challengeId ? `${code}:challenge:${challengeId}`
        : replayDate ? `${code}:replay:${replayDate}` : daily ? `${code}:daily` : code;
    // leçon du tutoriel guidé : « Leçon 2/3 · titre »
    const tutorial = levelInfo?.tutorial ?? null;
    const lesson = level !== undefined && tutorial !== null && level <= tutorial;

    const dailyGame = useDailyGame<Saved, Grid>({
        enabled: challenge,
        gameCode: code,
        saveKey,
        fetchStatus: options.fetchStatus,
        emptySave: options.emptySave,
        start: level ? () => levelsService.start<Grid>(code, level)
            : challengeId ? () => challengeService.start<Grid>(challengeId)
            : replayDate ? () => dailyService.replay<Grid>(code, replayDate) : undefined,
        onLoad: options.onLoad,
    });

    const toolbarLabel: ReactNode = level !== undefined ? (lesson ? `Leçon ${level}/${tutorial}` : levelName(level)) : daily ? <>Défi du jour <span className="daily-x2">×{DAILY_REWARD_MULTIPLIER}</span></>
        : replayDate ? `Défi du ${formatDailyDate(replayDate)}` : challengeId ? "Défi d'un·e ami·e" : undefined;

    const banner: ReactNode = lesson ? (
        <LessonTop gameCode={code} level={level} tutorial={tutorial} title={options.lessonTitles?.[level - 1] ?? ""}/>
    ) : level !== undefined ? (
        <p className="daily-label level-label"><Link to={`/niveaux/${code}`}>Niveaux</Link> · {levelName(level)}</p>
    ) : daily ? (
        <p className="daily-label">
            Défi du jour{dailyGame.date ? ` · ${formatDailyDate(dailyGame.date)}` : ""}
            <span className="daily-x2">XP et crédits ×{DAILY_REWARD_MULTIPLIER}</span>
        </p>
    ) : replayDate ? <p className="daily-label">Défi du {formatDailyDate(replayDate)} · hors classement</p>
        : challengeId ? <p className="daily-label">Défi d'un·e ami·e · la même grille, à toi de jouer</p> : null;

    const donePopup: ReactNode = dailyGame.done && level === undefined ? <DailyDonePopup gameCode={code} gameName={gameName} result={dailyGame.done}/> : null;

    // Popup de victoire : après un défi, « Partie libre » (ou les autres défis pour un jour passé) ;
    // défier des ami·e·s après une partie libre ou le défi du jour ; résultat du défi d'un·e ami·e
    const victory = (newGame: () => void) => ({
        onNewGame: replayDate ? () => navigate("/defi") : daily || challengeId ? () => navigate(`/playgame/${code}`) : newGame,
        newGameLabel: replayDate ? "Autres défis" : daily || challengeId ? "Partie libre" : undefined,
        back: replayDate ? null : daily ? "daily" as const : "home" as const,
        defy: replayDate || challengeId ? undefined : daily ? "daily" as const : "free" as const,
        challengeId,
    });

    // Niveau réussi : popup du mode Niveaux (« Leçon suivante », « Niveau suivant »…) à la place de la victoire habituelle
    const levelVictory = (won: Victory | null): ReactNode =>
        level !== undefined ? <LevelVictory gameCode={code} gameName={gameName} playName={options.playName} level={level} info={levelInfo} victory={won}/> : null;

    return {
        challenge, saveKey, loading: dailyGame.loading, error: dailyGame.error, toolbarLabel, banner, donePopup, victory,
        level, levelInfo, lesson, levelVictory, layoutClass: lesson ? "in-lesson" : "",
        loadingLabel: lesson ? "Chargement de la leçon…" : "Chargement du défi…",
    };
}
