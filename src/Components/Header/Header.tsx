/**
 * Composant Header - Barre de navigation principale
 *
 * Affiche en haut de chaque page :
 * - Le logo JokR (cliquable pour retourner à l'accueil)
 * - Les onglets Daily (défis du jour, en orange), Puzzle (accueil : Sudoku, Binero, Rikudo…),
 *   Hasard (jeux de hasard, à venir) et Classement
 * - Connecté : icône de niveau, barre d'XP, crédits, accès au profil et déconnexion
 *   (et aux statistiques pour l'administrateur)
 * - Invité : icône pour aller à la page de connexion
 *
 * Les infos viennent de l'AuthContext : le header se met à jour dès qu'elles changent.
 */

import "./Header.scss"
import {FaChartBar, FaCoins, FaSignOutAlt, FaUser, FaUserCircle} from "react-icons/fa";
import {Link, useLocation, useNavigate} from "react-router-dom";
import {useAuth} from "../../Context/authContext.ts";
import {levelIconSrc, xpToNextLevel} from "../../Services/leveling.ts";
import {isGameRoute} from "../../Services/routes.ts";

// Onglets du header ; `match` dit si une adresse appartient à l'onglet, `highlight` le met en orange
const TABS = [
    {label: "Daily", to: "/defi", match: (path: string) => path.startsWith("/defi"), highlight: true},
    {label: "Puzzle", to: "/", match: (path: string) => path === "/" || path.startsWith("/playgame")},
    {label: "Hasard", to: "/hasard", match: (path: string) => path.startsWith("/hasard")},
    {label: "Classement", to: "/classements", match: (path: string) => path.startsWith("/classements")},
];

export default function Header() {
    const navigate = useNavigate();
    const {pathname} = useLocation();
    const {isLoggedIn, isAdmin, level, xp, credits, logout} = useAuth();

    const xpNextLevel = xpToNextLevel(level);
    const xpPercent = Math.min(100, (xp / xpNextLevel) * 100);

    const handleLogout = () => {
        logout();
        navigate("/");
    };

    return (
        <div className={`header ${isGameRoute(pathname) ? "in-game" : ""}`}>
            <img
                src="/JokR_Logo_Full.svg"
                alt="logo"
                className="logo"
                onClick={() => navigate("/")} // Redirection vers l'accueil
            />

            <nav className="header-tabs" aria-label="Catégories de jeux">
                {TABS.map(tab => {
                    const active = tab.match(pathname);
                    return (
                        <Link key={tab.to} to={tab.to}
                              className={`header-tab ${active ? "active" : ""} ${"highlight" in tab && tab.highlight ? "highlight" : ""}`}
                              aria-current={active ? "page" : undefined}>
                            {tab.label}
                        </Link>
                    );
                })}
            </nav>

            <div className="usersection">
                {isLoggedIn ? (
                    <div className="user-section">
                        <img src={levelIconSrc(level)} alt={`Niveau ${level}`} className="level-icon"/>

                        <div className="xp-bar" aria-hidden>
                            <div className="xp-bar-track" title={`${xp} / ${xpNextLevel} xp`}>
                                <div className="xp-bar-fill" style={{width: `${xpPercent}%`}}/>
                            </div>
                        </div>

                        <span className="credits" title="Crédits (à miser sur les jeux de hasard)">
                            <FaCoins aria-hidden/>
                            <span>{credits}</span>
                        </span>

                        {isAdmin && <FaChartBar title="Statistiques" onClick={() => navigate("/stats")}/>}
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
