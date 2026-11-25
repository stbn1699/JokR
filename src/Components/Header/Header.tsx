/**
 * Composant Header - Barre de navigation principale
 *
 * Affiche en haut de chaque page :
 * - Le logo JokR (cliquable pour retourner à l'accueil)
 * - Au centre, les catégories de jeux seulement : Puzzle (accueil, défis du jour compris) et Hasard.
 *   Un point orange sur Puzzle tant que le joueur n'a pas fini les défis du jour, et sur Hasard tant qu'il n'a pas
 *   lancé la roue du jour. Sur Social, tant qu'un message d'ami·e n'est pas lu.
 * - Connecté : niveau (étoile bleue + petite barre d'XP), crédits (vers la boutique ; au survol, « Obtenir plus de
 *   crédits » contre une pub), Classement et Boutique en
 *   icônes (et Stats pour les administrateurs), cloche des notifications, puis l'icône de profil (contour selon le niveau) qui ouvre le menu du
 *   compte (profil, personnaliser, nouveautés, retours, mode admin et stats ; voir ProfileMenu)
 * - Invité : icône pour aller à la page de connexion
 *
 * Hors des pages Puzzle (/) et Hasard (/hasard), il s'efface quand on descend dans la page et revient dès qu'on
 * remonte (voir useHideOnScroll).
 *
 * Les infos viennent de l'AuthContext : le header se met à jour dès qu'elles changent.
 */

import "./Header.scss"
import {FaChartBar, FaCoins, FaShoppingBag, FaStar, FaTrophy, FaUser} from "react-icons/fa";
import NotificationBell from "../Notifications/NotificationBell.tsx";
import {Link, useLocation, useNavigate} from "react-router-dom";
import {useAuth} from "../../Context/authContext.ts";
import {xpToNextLevel} from "../../Services/leveling.ts";
import {isCasinoGameRoute, isGameRoute} from "../../Services/routes.ts";
import {useHeaderProgress} from "./useHeaderProgress.ts";
import {useHideOnScroll} from "./useHideOnScroll.ts";
import {createPortal} from "react-dom";
import {useTierUp} from "../Avatar/useTierUp.ts";
import TierUpPopup from "../Avatar/TierUpPopup.tsx";
import LevelBubble from "../Avatar/LevelBubble.tsx";
import ProfileMenu from "./ProfileMenu.tsx";
import AdRewardButton from "../Ads/AdRewardButton.tsx";
import StreakFlame from "../Streak/StreakFlame.tsx";
import {useEffect, useRef, useState} from "react";
import {dailyService} from "../../Services/daily.service.ts";
import {casinoService, WHEEL_SPUN_EVENT} from "../../Services/casino.service.ts";
import {formatCredits, fullCredits} from "../../Services/credits.ts";
import {SOCIAL_READ_EVENT, socialService} from "../../Services/social.service.ts";

// Catégories de jeux (au centre du header) ; `match` dit si une adresse appartient à l'onglet
// Les défis du jour (/defi) font partie des puzzles
const TABS = [
    {label: "Puzzle", to: "/", match: (path: string) => path === "/" || path.startsWith("/playgame") || path.startsWith("/defi")},
    {label: "Hasard", to: "/hasard", match: (path: string) => path.startsWith("/hasard")},
    {label: "Social", to: "/social", match: (path: string) => path.startsWith("/social")},
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

// Roue du jour pas encore lancée aujourd'hui (point orange sur l'onglet Hasard) ; relu à chaque changement de page
// et juste après un lancer
function useWheelPending(enabled: boolean, pathname: string): boolean {
    const [pending, setPending] = useState(false);
    const [spins, setSpins] = useState(0);
    useEffect(() => {
        const onSpun = () => setSpins(n => n + 1);
        window.addEventListener(WHEEL_SPUN_EVENT, onSpun);
        return () => window.removeEventListener(WHEEL_SPUN_EVENT, onSpun);
    }, []);
    useEffect(() => {
        if (!enabled) return;
        const controller = new AbortController();
        casinoService.wheel(controller.signal).then(w => setPending(w.available)).catch(() => undefined);
        return () => controller.abort();
    }, [enabled, pathname, spins]);
    return enabled && pending;
}

// Messages d'ami·e·s pas encore lus (point orange sur l'onglet Social) : relu à chaque changement de page,
// toutes les 30 secondes, et dès qu'une discussion est lue
function useSocialUnread(enabled: boolean, pathname: string): boolean {
    const [unread, setUnread] = useState(0);
    const [reads, setReads] = useState(0);
    useEffect(() => {
        const onRead = () => setReads(n => n + 1);
        window.addEventListener(SOCIAL_READ_EVENT, onRead);
        return () => window.removeEventListener(SOCIAL_READ_EVENT, onRead);
    }, []);
    useEffect(() => {
        if (!enabled) return;
        const controller = new AbortController();
        const load = () => socialService.unread(controller.signal).then(setUnread).catch(() => undefined);
        void load();
        const timer = setInterval(load, 30_000);
        return () => {
            clearInterval(timer);
            controller.abort();
        };
    }, [enabled, pathname, reads]);
    return enabled && unread > 0;
}

export default function Header() {
    const navigate = useNavigate();
    const {pathname} = useLocation();
    const auth = useAuth();
    const {isLoggedIn, adminMode} = auth;
    const dailyPending = useDailyPending(isLoggedIn, pathname);
    const wheelPending = useWheelPending(isLoggedIn, pathname);
    const socialUnread = useSocialUnread(isLoggedIn, pathname);
    // Hors des deux pages d'accueil (Puzzle et Hasard) : caché quand on descend, de retour dès qu'on remonte
    const autoHide = pathname !== "/" && pathname !== "/hasard";
    const autoHidden = useHideOnScroll(autoHide, pathname);
    // Place occupée en haut de l'écran par le header collé (0 quand il est caché), en variable CSS --header-space :
    // ce qui se fixe en haut de la page (ex. l'encart compact des niveaux) se cale dessous
    const headerRef = useRef<HTMLDivElement>(null);
    useEffect(() => {
        const header = headerRef.current;
        if (!header) return;
        const update = () => {
            const space = autoHidden ? 0 : (parseFloat(getComputedStyle(header).top) || 0) + header.offsetHeight;
            document.documentElement.style.setProperty("--header-space", `${space}px`);
        };
        update();
        const observer = new ResizeObserver(update);
        observer.observe(header);
        return () => observer.disconnect();
    }, [autoHidden, pathname]);
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
        <div ref={headerRef} className={`header ${isGameRoute(pathname) || isCasinoGameRoute(pathname) ? "in-game" : ""} ${autoHide ? "auto-hide" : ""} ${autoHidden ? "scrolled-away" : ""}`}>
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
                        const dot = tab.to === "/" ? dailyPending && "Défis du jour à faire"
                            : tab.to === "/hasard" ? wheelPending && "Roue du jour à lancer"
                            : socialUnread && "Messages non lus";
                        return (
                            <Link key={tab.to} to={tab.to} className={`header-tab ${active ? "active" : ""}`}
                                  aria-current={active ? "page" : undefined}>
                                {tab.label}
                                {dot && <span className="header-tab-dot" title={dot} aria-label={`(${dot.toLowerCase()})`}/>}
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

                        {/* Flamme : grisée tant que la grille du jour n'est pas faite ; un clic mène à son classement */}
                        {!adminMode && auth.streak && auth.streak.days > 0 && (
                            <>
                                <span className="user-divider" aria-hidden/>
                                <Link to="/classements?onglet=flamme" className="header-streak"
                                      title={`${auth.streak.playedToday ? "Flamme du jour gardée" : "Fais une grille aujourd'hui pour garder ta flamme"} · prochain bonus +${auth.streak.percent.toLocaleString("fr-FR")} %`}>
                                    <StreakFlame days={auth.streak.days} dim={!auth.streak.playedToday}/>
                                </Link>
                            </>
                        )}

                        <span className="user-divider" aria-hidden/>

                        {/* crédits : un clic mène à la boutique */}
                        {/* au survol : le solde exact (l'écriture est courte à partir de 10 000 : 12,3k) et le bouton
                            « Obtenir plus de crédits » (une pub contre des crédits) */}
                        <span className="credits-wrap">
                            <Link to="/boutique" className={`credits ${shown.creditsBump ? "bump" : ""}`}
                                  aria-label={`${fullCredits(credits)} crédits, ouvrir la boutique`}>
                                <FaCoins aria-hidden/>
                                <span aria-hidden>{formatCredits(credits)}</span>
                            </Link>
                            <span className="credits-tip">
                                <span aria-hidden><b>{fullCredits(credits)}</b> crédits</span>
                                <small aria-hidden>À miser au Hasard, à dépenser dans la boutique</small>
                                {!adminMode && <AdRewardButton/>}
                            </span>
                        </span>

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
                        <NotificationBell enabled={isLoggedIn}/>
                        <ProfileMenu level={level} xp={xp} xpNextLevel={xpNextLevel}/>
                    </div>
                ) : (
                    <FaUser title="Se connecter" onClick={() => navigate("/login")}/>
                )}
            </div>
        </div>
        </>
    )
}
