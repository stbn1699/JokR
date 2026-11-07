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

/**
 * Composant principal qui gère le routing de l'application
 * @returns JSX du composant App avec toutes les routes définies
 */
function App() {
    // Pages de jeu : sur téléphone, l'app occupe exactement l'écran (pas de défilement pendant une partie)
    const {pathname} = useLocation();
    const inGame = isGameRoute(pathname);

    // Nouvelle page : on repart du haut (sinon on garde la position de la page précédente, ex. le lien
    // Nouveautés tout en bas sur téléphone). Retour arrière / avant : le navigateur garde sa position.
    const navigationType = useNavigationType();
    useEffect(() => {
        if (navigationType !== "POP") window.scrollTo(0, 0);
    }, [pathname, navigationType]);

    return (
        <div className={`app-root ${inGame ? "in-game" : ""}`}>
            <Header/>
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
                <Route path="/stats" element={<Stats/>}/>
                {/* Profil public d'un joueur (depuis les classements) */}
                <Route path="/joueur/:username" element={<PlayerProfile/>}/>
                {/* Défi d'un·e ami·e : sa grille, à faire à son tour */}
                <Route path="/defi-ami/:id" element={<FriendChallengePage/>}/>
                <Route path="*" element={<NotFound/>}/>
            </Routes>
            <AppFooter/>
        </div>
    );
}

export default App;
