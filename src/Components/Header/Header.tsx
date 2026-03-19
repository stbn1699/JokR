/**
 * Composant Header - Barre de navigation principale
 *
 * Affiche en haut de chaque page :
 * - Le logo JokR (cliquable pour retourner à l'accueil)
 * - L'icône utilisateur (cliquable pour aller à la page de connexion)
 */

import "./Header.scss"
import {FaUser, FaUserCircle} from "react-icons/fa";
import {useNavigate} from "react-router-dom";

/**
 * Rendu du header avec logo et section utilisateur
 * @returns JSX du composant Header
 */
export default function Header() {
    const navigate = useNavigate();

    const userLevel: number = Number(localStorage.getItem('userLevel')) || 1;
    const userXp: number = Number(localStorage.getItem('userXp')) || 0;
    const xpNextLevel: number = Math.ceil(120 * Math.pow(userLevel, 1.4))
    const xpPercent: number = Math.min(100, (Number(userXp) / xpNextLevel) * 100);

    return (
        <div className="header">
            <img
                src="/JokR_Logo_Full.svg"
                alt="logo"
                className="logo"
                onClick={() => navigate("/")} // Redirection vers l'accueil
            />

            <div className="usersection">
                {localStorage.getItem('userId') ? (
                    <div className="user-section">
                        <img src={`/Icons/level_${userLevel}.png`} alt="levelIcon" className="level-icon"/>

                        <div className="xp-bar" aria-hidden>
                            <div className="xp-bar-track" title={`${userXp} / ${xpNextLevel} xp`}>
                                <div className="xp-bar-fill" style={{width: `${xpPercent}%`}}/>
                            </div>
                        </div>

                        <FaUserCircle onClick={() => navigate("/profile")}/>
                    </div>
                ) : (
                    <FaUser onClick={() => navigate("/login")}/>
                )}
            </div>
        </div>
    )
}