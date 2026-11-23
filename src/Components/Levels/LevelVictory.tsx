/**
 * Mode Niveaux d'un jeu de puzzle (niveaux après le tutoriel guidé) : popup de victoire d'un niveau
 * (« Niveau suivant », ou la carte et une grille aléatoire après le dernier niveau), et progression d'un·e invité·e
 * gardée dans ce navigateur. Le jeu charge la grille avec levelsService.start et la valide comme une partie normale :
 * le serveur enregistre le niveau, et ne donne l'XP qu'à la première réussite.
 */

import {useEffect} from "react";
import {useNavigate} from "react-router-dom";
import {useAuth} from "../../Context/authContext.ts";
import {rememberGuestLevel} from "../../Services/levels.service.ts";
import {SuccessPopup} from "../SuccessPopup/SuccessPopup.tsx";
import type {Victory} from "../PuzzleUI/useGameFlow.ts";
import {levelName, worldOpenedBy} from "./worlds.ts";

// Numéro du niveau joué, et nombre de niveaux / du tutoriel (null tant qu'inconnus)
export type LevelInfo = { count: number | null; tutorial: number | null };

type Props = {
    gameCode: string;
    gameName: string;
    level: number;
    info: LevelInfo | undefined;
    victory: Victory | null;
};

export default function LevelVictory({gameCode, gameName, level, info, victory}: Props) {
    const navigate = useNavigate();
    const {isLoggedIn, adminMode} = useAuth();
    const map = `/niveaux/${gameCode}`;
    const isLast = info?.count !== null && info?.count !== undefined && level >= info.count;
    // dernier niveau d'un monde : pas de « Niveau suivant », on part fêter le nouveau monde sur la carte
    const opened = worldOpenedBy(level, info?.count);

    useEffect(() => {
        if (victory && !isLoggedIn) rememberGuestLevel(gameCode, level);
    }, [victory, isLoggedIn, gameCode, level]);

    if (!victory) return null;
    return (
        <SuccessPopup gameName={gameName} gameCode={gameCode} xpAwarded={victory.xpAwarded} creditsAwarded={victory.creditsAwarded}
                      rewardMultiplier={1} streak={victory.streak} before={victory.before}
                      durationMs={victory.durationMs} personalBest={victory.personalBest}
                      title={`${levelName(level)} réussi !`}
                      subtitle="Bien joué, la grille est résolue."
                      noXpNote={adminMode ? "Mode admin : rien n'est enregistré." : isLoggedIn ? "Niveau déjà réussi : l'XP et les crédits ne sont donnés qu'à la première réussite." : undefined}
                      onNewGame={isLast ? () => navigate(map)
                          : opened !== null ? () => navigate(map, {state: {worldOpened: opened}})
                              : () => navigate(`${map}/${level + 1}`)}
                      newGameLabel={isLast ? "Carte des niveaux" : opened !== null ? "Monde suivant" : "Niveau suivant"}
                      extraAction={isLast ? {label: "Grille aléatoire", onClick: () => navigate(`/playgame/${gameCode}`)} : undefined}
                      back={{to: map, label: "Carte des niveaux", short: "Carte"}}/>
    );
}
