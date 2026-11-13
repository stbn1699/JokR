/**
 * Composant racine de l'application JokR
 *
 * Ce composant définit toutes les routes de l'application :
 * - / : Page d'accueil avec la liste des jeux disponibles
 * - /playgame/:gameCode : Page de jeu (dynamique selon le code du jeu)
 * - /login : Page de connexion
 * - /register : Page d'inscription
 * - /auth/callback/:provider : Retour de Google / Discord (connexion, choix du pseudo, liaison)
 * - /profile : Profil du joueur connecté
 * - /hasard : Onglet des jeux de hasard (à venir)
 * - /nouveautes : Nouveautés (CHANGELOG.md) ; le numéro de version est en bas à droite
 * - * : Page 404 pour les routes inexistantes
 */

import "./App.css";
import GameList from "./Components/GameList/GameList.tsx";
import {Route, Routes, useLocation, useNavigationType} from "react-router-dom";
import {useEffect} from "react";
import MaintenanceScreen from "./Components/Maintenance/MaintenanceScreen.tsx";
import {markSent, showsUpdateScreen, useMaintenance} from "./Services/maintenance.ts";
import UpdateNotice from "./Components/Maintenance/UpdateNotice.tsx";
import {useAuth} from "./Context/authContext.ts";
import {isGameRoute} from "./Services/routes.ts";
import PlayGame from "./Components/PlayGame/PlayGame.tsx";
import Login from "./Components/UserSection/Login/Login.tsx";
import Register from "./Components/UserSection/Register/Register.tsx";
import OAuthCallback from "./Components/UserSection/OAuthCallback/OAuthCallback.tsx";
import Header from "./Components/Header/Header.tsx";
import Profile from "./Components/UserSection/Profile/Profile.tsx";
import NotFound from "./Components/NotFound/NotFound.tsx";
import Leaderboard from "./Components/Leaderboard/Leaderboard.tsx";
import DailyHistory from "./Components/DailyHistory/DailyHistory.tsx";
import Changelog from "./Components/Changelog/Changelog.tsx";
import Hasard from "./Components/Hasard/Hasard.tsx";
import AppFooter from "./Components/AppFooter/AppFooter.tsx";
import Stats from "./Components/Stats/Stats.tsx";
import PlayerProfile from "./Components/PlayerProfile/PlayerProfile.tsx";
import FriendChallengePage from "./Components/FriendChallenge/FriendChallengePage.tsx";
import ShopPage from "./Components/Shop/ShopPage.tsx";
import GradientsPage from "./Components/Shop/GradientsPage.tsx";
import PlinkoBallsPage from "./Components/Shop/PlinkoBallsPage.tsx";
import ChipSetPage from "./Components/Shop/ChipSetPage.tsx";
import ImageBackgroundsPage from "./Components/Shop/ImageBackgroundsPage.tsx";
import SiteBackground from "./Components/Shop/SiteBackground.tsx";
import FeedbackButton from "./Components/Feedback/FeedbackButton.tsx";
import FeedbackPage from "./Components/Feedback/FeedbackPage.tsx";
import PlinkoPage from "./Components/Hasard/Plinko/PlinkoPage.tsx";
import RoulettePage from "./Components/Hasard/Roulette/RoulettePage.tsx";
import LotteryPage from "./Components/Hasard/Lottery/LotteryPage.tsx";
import SlotsList from "./Components/Hasard/Slots/SlotsList.tsx";
import SlotMachinePage from "./Components/Hasard/Slots/SlotMachinePage.tsx";

/**
 * Composant principal qui gère le routing de l'application
 * @returns JSX du composant App avec toutes les routes définies
 */
function App() {
    // Pages de jeu : sur téléphone, l'app occupe exactement l'écran (pas de défilement pendant une partie)
    const {pathname} = useLocation();
    // Mise à jour activée (ou serveur qui redémarre) : le site entier est remplacé par l'écran de mise à jour,
    // une fois la partie en cours finie (voir Services/maintenance.ts). Exception : un administrateur sur /stats
    // (adresse tapée à la main), pour pouvoir rouvrir.
    const site = useMaintenance();
    const {isAdmin, isLoggedIn, username} = useAuth();
    // sur /stats, on attend le profil (sinon on ne sait pas encore si le joueur est administrateur)
    const profileLoading = isLoggedIn && username === null;
    // la connexion reste ouverte (un administrateur déconnecté doit pouvoir revenir sur /stats)
    const loginPage = pathname === "/login" || pathname.startsWith("/auth/callback");
    const updateScreen = showsUpdateScreen(site, loginPage || (pathname.startsWith("/stats") && (isAdmin || profileLoading)));
    useEffect(() => {
        if (updateScreen && site.on) markSent();
    }, [updateScreen, site.on]);
    const inGame = isGameRoute(pathname);

    // Nouvelle page : on repart du haut (sinon on garde la position de la page précédente, ex. le lien
    // Nouveautés tout en bas sur téléphone). Retour arrière / avant : le navigateur garde sa position.
    const navigationType = useNavigationType();
    useEffect(() => {
        if (navigationType !== "POP") window.scrollTo(0, 0);
    }, [pathname, navigationType]);

    if (updateScreen) return <MaintenanceScreen/>;

    return (
        <div className={`app-root ${inGame ? "in-game" : ""}`}>
            <SiteBackground/>
            <Header/>
            <UpdateNotice site={site}/>
            <Routes>
                <Route path="/" element={<GameList/>}/>
                <Route path="/playgame/:gameCode" element={<PlayGame/>}/>
                {/* key : changer de défi (Sudoku → Binero) remonte une page neuve */}
                <Route path="/defi" element={<DailyHistory/>}/>
                <Route path="/defi/:gameCode" element={<PlayGame daily key="defi"/>}/>
                {/* Défi d'un jour passé, rejoué hors classement */}
                <Route path="/defi/:gameCode/:date" element={<PlayGame daily key="defi-rejoue"/>}/>
                <Route path="/login" element={<Login/>}/>
                <Route path="/register" element={<Register/>}/>
                <Route path="/auth/callback/:provider" element={<OAuthCallback/>}/>
                <Route path="/profile" element={<Profile/>}/>
                <Route path="/classements" element={<Leaderboard/>}/>
                <Route path="/nouveautes" element={<Changelog/>}/>
                <Route path="/hasard" element={<Hasard/>}/>
                <Route path="/hasard/plinko" element={<PlinkoPage/>}/>
                <Route path="/hasard/roulette" element={<RoulettePage/>}/>
                <Route path="/hasard/loterie" element={<LotteryPage/>}/>
                <Route path="/hasard/machines" element={<SlotsList/>}/>
                <Route path="/hasard/machines/:id" element={<SlotMachinePage/>}/>
                <Route path="/boutique" element={<ShopPage/>}/>
                <Route path="/retour" element={<FeedbackPage/>}/>
                <Route path="/boutique/fonds/degrades" element={<GradientsPage/>}/>
                <Route path="/boutique/fonds/:set" element={<ImageBackgroundsPage/>}/>
                <Route path="/boutique/plinko/:set" element={<PlinkoBallsPage/>}/>
                <Route path="/boutique/jetons/:set" element={<ChipSetPage/>}/>
                <Route path="/stats" element={<Stats/>}/>
                {/* Profil public d'un joueur (depuis les classements) */}
                <Route path="/joueur/:username" element={<PlayerProfile/>}/>
                {/* Défi d'un·e ami·e : sa grille, à faire à son tour */}
                <Route path="/defi-ami/:id" element={<FriendChallengePage/>}/>
                <Route path="*" element={<NotFound/>}/>
            </Routes>
            <FeedbackButton/>
            <AppFooter/>
        </div>
    );
}

export default App;
