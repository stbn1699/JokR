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
export default function PlayGame({daily = false}: { daily?: boolean }) {
    // Extraction du code du jeu depuis l'URL (ex: /playgame/SUDOKU → gameCode = "SUDOKU")
    const {gameCode, date} = useParams<RouteParams>()
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
                return <Sudoku daily={daily && !date} replayDate={date}/>;
            case "BINERO":
                return <Binero daily={daily && !date} replayDate={date}/>;
            case "RIKUDO":
                return <Rikudo daily={daily && !date} replayDate={date}/>;
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