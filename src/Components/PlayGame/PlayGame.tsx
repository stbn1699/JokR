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
import Header from "../Header/Header.tsx";
import Sudoku from "../Sudoku/Sudoku.tsx";

/**
 * Type définissant les paramètres de route attendus
 * gameCode : identifiant du jeu (ex: "SUDOKU", "CHESS", etc.)
 */
type RouteParams = {
    gameCode?: string
}

/**
 * Composant qui affiche le jeu correspondant au code passé dans l'URL
 * @returns JSX du jeu sélectionné avec le header
 */
export default function PlayGame() {
    // Extraction du code du jeu depuis l'URL (ex: /playgame/SUDOKU → gameCode = "SUDOKU")
    const {gameCode} = useParams<RouteParams>()

    /**
     * Fonction qui retourne le composant du jeu correspondant au code
     * @returns Le composant React du jeu ou null si le code est invalide
     */
    const renderGame = () => {
        switch (gameCode) {
            case "SUDOKU":
                // Affiche le jeu Sudoku avec son code
                return <Sudoku gameCode={gameCode}/>;
            default:
                // Si le code ne correspond à aucun jeu, on n'affiche rien
                return null;
        }
    }

    return (
        <>
            {/* Header présent sur toutes les pages de jeu */}
            <Header/>

            {/* Rendu dynamique du jeu sélectionné */}
            {renderGame()}
        </>
    )
}