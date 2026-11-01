/**
 * Composant Header - Barre de navigation principale
 *
 * Affiche en haut de chaque page :
 * - Le logo JokR (cliquable pour retourner à l'accueil)
 * - Connecté : icône de niveau, barre d'XP, accès au profil et déconnexion
 * - Invité : icône pour aller à la page de connexion
 *
 * Les infos viennent de l'AuthContext : le header se met à jour dès qu'elles changent.
 */

import "./Header.scss"
import {FaSignOutAlt, FaUser, FaUserCircle} from "react-icons/fa";
import {useNavigate} from "react-router-dom";
import {useAuth} from "../../Context/authContext.ts";
import {levelIconSrc, xpToNextLevel} from "../../Services/leveling.ts";

export default function Header() {
    const navigate = useNavigate();
    const {isLoggedIn, level, xp, logout} = useAuth();

    const xpNextLevel = xpToNextLevel(level);
    const xpPercent = Math.min(100, (xp / xpNextLevel) * 100);

    const handleLogout = () => {
        logout();
        navigate("/");
    };

    return (
        <div className="header">
            <img
                src="/JokR_Logo_Full.svg"
                alt="logo"
                className="logo"
                onClick={() => navigate("/")} // Redirection vers l'accueil
            />

            <div className="usersection">
                {isLoggedIn ? (
                    <div className="user-section">
                        <img src={levelIconSrc(level)} alt={`Niveau ${level}`} className="level-icon"/>

                        <div className="xp-bar" aria-hidden>
                            <div className="xp-bar-track" title={`${xp} / ${xpNextLevel} xp`}>
                                <div className="xp-bar-fill" style={{width: `${xpPercent}%`}}/>
                            </div>
                        </div>

                        <FaUserCircle title="Mon profil" onClick={() => navigate("/profile")}/>
                        <FaSignOutAlt title="Se déconnecter" onClick={handleLogout}/>
                    </div>
                ) : (
                    <FaUser title="Se connecter" onClick={() => navigate("/login")}/>
                )}
            </div>
        </div>
    )
}
