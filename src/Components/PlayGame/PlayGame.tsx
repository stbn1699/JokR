/**
 * Composant PlayGame - Page de jeu dynamique
 *
 * Ce composant sert de router pour afficher le bon jeu en fonction du code passé dans l'URL.
 * Par exemple: /playgame/SUDOKU affichera le composant Sudoku
 *
 * Architecture extensible : pour ajouter un nouveau jeu, il suffit d'ajouter un case dans renderGame()
 */

import "./PlayGame.scss"
import {useParams} from "react-router-dom"
import Sudoku from "../Sudoku/Sudoku.tsx";
import Binero from "../Binero/Binero.tsx";
import Rikudo from "../Rikudo/Rikudo.tsx";
import Tectonic from "../Tectonic/Tectonic.tsx";
import Galaxies from "../Galaxies/Galaxies.tsx";
import Shikaku from "../Shikaku/Shikaku.tsx";
import Queens from "../Queens/Queens.tsx";
import DailyLoginRequired from "../PuzzleUI/DailyLoginRequired.tsx";
import {useAuth} from "../../Context/authContext.ts";

/**
 * Type définissant les paramètres de route attendus
 * gameCode : identifiant du jeu (ex: "SUDOKU", "CHESS", etc.)
 */
type RouteParams = {
    gameCode?: string
    // Défi d'un jour passé (AAAA-MM-JJ), sur /defi/:gameCode/:date
    date?: string
}

/**
 * Composant qui affiche le jeu correspondant au code passé dans l'URL
 * @returns JSX du jeu sélectionné avec le header
 */
// challengeId : défi d'un·e ami·e (/defi-ami/:id), le jeu est donné par le défi
export default function PlayGame({daily = false, challengeGame, challengeId}: { daily?: boolean; challengeGame?: string; challengeId?: string }) {
    // Extraction du code du jeu depuis l'URL (ex: /playgame/SUDOKU → gameCode = "SUDOKU")
    const params = useParams<RouteParams>()
    const gameCode = challengeGame ?? params.gameCode
    const date = params.date
    const {isLoggedIn} = useAuth()

    /**
     * Fonction qui retourne le composant du jeu correspondant au code
     * @returns Le composant React du jeu ou null si le code est invalide
     */
    const renderGame = () => {
        // Défis (du jour ou rejoués) réservés aux joueurs connectés
        if (daily && !isLoggedIn) return <DailyLoginRequired/>;
        switch (gameCode) {
            case "SUDOKU":
                // Affiche le jeu Sudoku avec son code
                return <Sudoku daily={daily && !date} replayDate={date} challengeId={challengeId}/>;
            case "BINERO":
                return <Binero daily={daily && !date} replayDate={date} challengeId={challengeId}/>;
            case "RIKUDO":
                return <Rikudo daily={daily && !date} replayDate={date} challengeId={challengeId}/>;
            case "TECTONIC":
                return <Tectonic daily={daily && !date} replayDate={date} challengeId={challengeId}/>;
            case "GALAXIES":
                return <Galaxies daily={daily && !date} replayDate={date} challengeId={challengeId}/>;
            case "SHIKAKU":
                return <Shikaku daily={daily && !date} replayDate={date} challengeId={challengeId}/>;
            case "QUEENS":
                return <Queens daily={daily && !date} replayDate={date} challengeId={challengeId}/>;
            default:
                // Si le code ne correspond à aucun jeu, on n'affiche rien
                return null;
        }
    }

    return (
        <>
            {renderGame()}
        </>
    )
}