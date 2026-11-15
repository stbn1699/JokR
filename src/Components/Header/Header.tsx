/**
 * Composant Header - Barre de navigation principale
 *
 * Affiche en haut de chaque page :
 * - Le logo JokR (cliquable pour retourner à l'accueil)
 * - Au centre, les catégories de jeux seulement : Puzzle (accueil, défis du jour compris) et Hasard.
 *   Un point orange sur Puzzle tant que le joueur n'a pas fini les défis du jour.
 * - Connecté : niveau (étoile bleue + petite barre d'XP), crédits (vers la boutique), Classement et Boutique en
 *   icônes (et Stats pour les administrateurs), cloche des notifications, puis l'icône de profil (contour selon le niveau) qui ouvre le menu du
 *   compte (profil, personnaliser, nouveautés, retours, mode admin et stats ; voir ProfileMenu)
 * - Invité : icône pour aller à la page de connexion
 *
 * Les infos viennent de l'AuthContext : le header se met à jour dès qu'elles changent.
 */

import "./Header.scss"
import {FaChartBar, FaCoins, FaShoppingBag, FaStar, FaTrophy, FaUser} from "react-icons/fa";
import NotificationBell from "../Notifications/NotificationBell.tsx";
import {Link, useLocation, useNavigate} from "react-router-dom";
import {useAuth} from "../../Context/authContext.ts";
import {xpToNextLevel} from "../../Services/leveling.ts";
import {isGameRoute} from "../../Services/routes.ts";
import {useHeaderProgress} from "./useHeaderProgress.ts";
import {createPortal} from "react-dom";
import {useTierUp} from "../Avatar/useTierUp.ts";
import TierUpPopup from "../Avatar/TierUpPopup.tsx";
import LevelBubble from "../Avatar/LevelBubble.tsx";
import CustomizePanel from "../Shop/CustomizePanel.tsx";
import ProfileMenu from "./ProfileMenu.tsx";
import {useEffect, useState} from "react";
import {dailyService} from "../../Services/daily.service.ts";
import {formatCredits} from "../../Services/credits.ts";

// Catégories de jeux (au centre du header) ; `match` dit si une adresse appartient à l'onglet
// Les défis du jour (/defi) font partie des puzzles
const TABS = [
    {label: "Puzzle", to: "/", match: (path: string) => path === "/" || path.startsWith("/playgame") || path.startsWith("/defi")},
    {label: "Hasard", to: "/hasard", match: (path: string) => path.startsWith("/hasard")},
];

// Défis du jour pas encore tous réussis (point orange sur l'onglet Puzzle) ; relu à chaque changement de page
function useDailyPending(enabled: boolean, pathname: string): boolean {
    const [pending, setPending] = useState(false);
    useEffect(() => {
        if (!enabled) return;
        const controller = new AbortController();
        dailyService.overview(controller.signal)
            .then(o => setPending(o.ready && o.games.some(g => g.result === null)))
            .catch(() => undefined);
        return () => controller.abort();
    }, [enabled, pathname]);
    return enabled && pending;
}

export default function Header() {
    const navigate = useNavigate();
    const {pathname} = useLocation();
    const auth = useAuth();
    const {isLoggedIn, adminMode} = auth;
    const [customizing, setCustomizing] = useState(false);
    const dailyPending = useDailyPending(isLoggedIn, pathname);
    // Après une victoire : valeurs d'avant jusqu'à l'arrivée des particules, puis changement animé
    // les animations suivent le vrai compte ; en mode admin, on affiche niveau 100 et crédits illimités
    const shown = useHeaderProgress(auth.account);
    const {level, xp, credits} = adminMode ? {level: 100, xp: 0, credits: auth.credits} : shown;
    // Nouveau palier de couleur atteint (niveau affiché) : popup « Nouvelle couleur »
    // pas de popup « Nouvelle couleur » en entrant dans le mode admin (niveau 100 affiché)
    const tierUp = useTierUp(auth.userId, level, isLoggedIn && auth.username !== null && !adminMode);
    // Bulle « où j'en suis » (clic sur le niveau) : position sous le header
    const [bubbleTop, setBubbleTop] = useState<number | null>(null);
    const toggleBubble = (badge: HTMLElement) => {
        if (bubbleTop !== null) return setBubbleTop(null);
        const header = badge.closest(".header")?.getBoundingClientRect();
        setBubbleTop((header?.bottom ?? 72) + 8);
    };

    const xpNextLevel = xpToNextLevel(level);
    const xpPercent = Math.min(100, (xp / xpNextLevel) * 100);

    return (
        <>
        {adminMode && createPortal(<div className="admin-mode-frame" aria-hidden><span>Mode admin</span></div>, document.body)}
        <div className={`header ${isGameRoute(pathname) ? "in-game" : ""}`}>
            <img
                src="/JokR_Logo_Full.svg"
                alt="logo"
                className="logo"
                onClick={() => navigate("/")} // Redirection vers l'accueil
            />

            <nav className="header-tabs" aria-label="Catégories de jeux">
                <div className="header-tabs-track">
                    {TABS.map(tab => {
                        const active = tab.match(pathname);
                        const dot = tab.to === "/" && dailyPending;
                        return (
                            <Link key={tab.to} to={tab.to} className={`header-tab ${active ? "active" : ""}`}
                                  aria-current={active ? "page" : undefined}>
                                {tab.label}
                                {dot && <span className="header-tab-dot" title="Défis du jour à faire" aria-label="(défis du jour à faire)"/>}
                            </Link>
                        );
                    })}
                </div>
            </nav>

            {/* Au niveau de la page : jamais enfermée dans le header */}
            {tierUp.popup && createPortal(
                <TierUpPopup seed={auth.avatar ?? undefined} fallback={auth.username ?? undefined} level={tierUp.popup.level}
                             fromIndex={tierUp.popup.fromIndex} toIndex={tierUp.popup.toIndex} onClose={tierUp.close}/>,
                document.body,
            )}

            <div className="usersection">
                {isLoggedIn ? (
                    <div className="user-section">
                        {/* Niveau : étoile bleue à gauche, puis le numéro avec une petite barre d'XP dessous ;
                            un clic ouvre la bulle « où j'en suis » (couleur de contour, prochaine couleur) */}
                        <button type="button" className={`level-badge ${shown.levelPop ? "level-pop" : ""}`}
                                aria-expanded={bubbleTop !== null}
                                title={`Niveau ${level} · ${xp} / ${xpNextLevel} XP`}
                                onClick={e => toggleBubble(e.currentTarget)}>
                            <FaStar className="level-badge-star" aria-hidden/>
                            <span className="level-badge-stack">
                                <span className="level-badge-value">{level}</span>
                                <span className="level-progress" aria-hidden>
                                    <span className={`level-progress-fill ${shown.instant ? "instant" : ""}`}
                                          style={{width: `${xpPercent}%`}}/>
                                </span>
                            </span>
                        </button>
                        {bubbleTop !== null && (
                            <LevelBubble level={level} xp={xp} seed={auth.avatar ?? undefined} fallback={auth.username ?? undefined}
                                         top={bubbleTop} onClose={() => setBubbleTop(null)}/>
                        )}

                        <span className="user-divider" aria-hidden/>

                        {/* crédits : un clic mène à la boutique */}
                        <Link to="/boutique" className={`credits ${shown.creditsBump ? "bump" : ""}`}
                              title="Crédits (à miser sur les jeux de hasard, à dépenser dans la boutique)">
                            <FaCoins aria-hidden/>
                            <span>{formatCredits(credits)}</span>
                        </Link>

                        <Link to="/classements" className={`header-icon ${pathname.startsWith("/classements") ? "active" : ""}`}
                              title="Classements" aria-label="Classements">
                            <FaTrophy aria-hidden/>
                        </Link>
                        <Link to="/boutique" className={`header-icon ${pathname.startsWith("/boutique") ? "active" : ""}`}
                              title="Boutique" aria-label="Boutique">
                            <FaShoppingBag aria-hidden/>
                        </Link>
                        {/* administrateurs : statistiques du site, avec ou sans le mode admin */}
                        {auth.isAdmin && (
                            <Link to="/stats" className={`header-icon ${pathname.startsWith("/stats") ? "active" : ""}`}
                                  title="Stats" aria-label="Stats">
                                <FaChartBar aria-hidden/>
                            </Link>
                        )}
                        <CustomizePanel open={customizing} onClose={() => setCustomizing(false)}/>
                        <NotificationBell enabled={isLoggedIn}/>
                        <ProfileMenu level={level} xp={xp} xpNextLevel={xpNextLevel} onCustomize={() => setCustomizing(true)}/>
                    </div>
                ) : (
                    <FaUser title="Se connecter" onClick={() => navigate("/login")}/>
                )}
            </div>
        </div>
        </>
    )
}
