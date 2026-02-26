/**
 * Composant Header - Barre de navigation principale
 *
 * Affiche en haut de chaque page :
 * - Le logo JokR (cliquable pour retourner à l'accueil)
 * - L'icône utilisateur (cliquable pour aller à la page de connexion)
 */

import "./Header.scss"
import {FaUser} from "react-icons/fa";
import {useNavigate} from "react-router-dom";

/**
 * Rendu du header avec logo et section utilisateur
 * @returns JSX du composant Header
 */
export default function Header() {
    const navigate = useNavigate();

    return (
        <div className="header">
            {/* Logo cliquable qui redirige vers la page d'accueil */}
            <img
                src="/JokR_Logo_Full.svg"
                alt="logo"
                onClick={() => navigate("/")} // Redirection vers l'accueil
            />

            {/* Section utilisateur avec icône de profil */}
            <div className="usersection">
                {/* Icône utilisateur qui redirige vers la page de login */}
                <FaUser onClick={() => navigate("/login")}/>
            </div>
        </div>
    )
}