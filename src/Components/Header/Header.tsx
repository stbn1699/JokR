/**
 * Composant Header - Barre de navigation principale
 *
 * Affiche en haut de chaque page :
 * - Le logo JokR (cliquable pour retourner à l'accueil)
 * - Les onglets Daily (défis du jour, en orange), Puzzle (accueil : Sudoku, Binero, Rikudo, Tectonic, Galaxies, Shikaku, Queens…),
 *   Hasard (jeux de hasard, à venir), Classement, et Stats pour l'administrateur
 * - Connecté : niveau (étoile bleue + petite barre d'XP), crédits, puis icône de profil (contour selon le niveau)
 *   vers le profil (la déconnexion est dans le profil)
 * - Invité : icône pour aller à la page de connexion
 *
 * Les infos viennent de l'AuthContext : le header se met à jour dès qu'elles changent.
 */

import "./Header.scss"
import {FaCoins, FaStar, FaUser} from "react-icons/fa";
import Avatar from "../Avatar/Avatar.tsx";
import {Link, useLocation, useNavigate} from "react-router-dom";
import {useAuth} from "../../Context/authContext.ts";
import {xpToNextLevel} from "../../Services/leveling.ts";
import {isGameRoute} from "../../Services/routes.ts";
import {useHeaderProgress} from "./useHeaderProgress.ts";

// Onglets du header ; `match` dit si une adresse appartient à l'onglet, `highlight` le met en orange
const TABS = [
    {label: "Daily", to: "/defi", match: (path: string) => path.startsWith("/defi"), highlight: true},
    {label: "Puzzle", to: "/", match: (path: string) => path === "/" || path.startsWith("/playgame")},
    {label: "Hasard", to: "/hasard", match: (path: string) => path.startsWith("/hasard")},
    {label: "Classement", to: "/classements", match: (path: string) => path.startsWith("/classements")},
    {label: "Stats", to: "/stats", match: (path: string) => path.startsWith("/stats"), adminOnly: true},
];

export default function Header() {
    const navigate = useNavigate();
    const {pathname} = useLocation();
    const auth = useAuth();
    const {isLoggedIn, isAdmin} = auth;
    // Après une victoire : valeurs d'avant jusqu'à l'arrivée des particules, puis changement animé
    const shown = useHeaderProgress({level: auth.level, xp: auth.xp, credits: auth.credits});
    const {level, xp, credits} = shown;

    const xpNextLevel = xpToNextLevel(level);
    const xpPercent = Math.min(100, (xp / xpNextLevel) * 100);

    return (
        <div className={`header ${isGameRoute(pathname) ? "in-game" : ""}`}>
            <img
                src="/JokR_Logo_Full.svg"
                alt="logo"
                className="logo"
                onClick={() => navigate("/")} // Redirection vers l'accueil
            />

            <nav className="header-tabs" aria-label="Catégories de jeux">
                {TABS.filter(tab => !("adminOnly" in tab) || isAdmin).map(tab => {
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
                        {/* Niveau : étoile bleue à gauche, puis le numéro avec une petite barre d'XP dessous */}
                        <span className={`level-badge ${shown.levelPop ? "level-pop" : ""}`}
                              title={`Niveau ${level} · ${xp} / ${xpNextLevel} XP`}>
                            <FaStar className="level-badge-star" aria-hidden/>
                            <span className="level-badge-stack">
                                <span className="level-badge-value">{level}</span>
                                <span className="level-progress" aria-hidden>
                                    <span className={`level-progress-fill ${shown.instant ? "instant" : ""}`}
                                          style={{width: `${xpPercent}%`}}/>
                                </span>
                            </span>
                        </span>

                        <span className="user-divider" aria-hidden/>

                        <span className={`credits ${shown.creditsBump ? "bump" : ""}`}
                              title="Crédits (à miser sur les jeux de hasard)">
                            <FaCoins aria-hidden/>
                            <span>{credits}</span>
                        </span>

                        <button type="button" className="header-avatar" title="Mon profil" onClick={() => navigate("/profile")}>
                            <Avatar seed={auth.avatar} fallback={auth.username ?? auth.userId ?? undefined} size={2.5}
                                    level={level} title="Mon profil"/>
                        </button>
                    </div>
                ) : (
                    <FaUser title="Se connecter" onClick={() => navigate("/login")}/>
                )}
            </div>
        </div>
    )
}
