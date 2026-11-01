/**
 * Composant racine de l'application JokR
 *
 * Ce composant définit toutes les routes de l'application :
 * - / : Page d'accueil avec la liste des jeux disponibles
 * - /playgame/:gameCode : Page de jeu (dynamique selon le code du jeu)
 * - /login : Page de connexion
 * - /register : Page d'inscription
 * - /profile : Profil du joueur connecté
 * - * : Page 404 pour les routes inexistantes
 */

import "./App.css";
import GameList from "./Components/GameList/GameList.tsx";
import {Route, Routes} from "react-router-dom";
import PlayGame from "./Components/PlayGame/PlayGame.tsx";
import Login from "./Components/UserSection/Login/Login.tsx";
import Register from "./Components/UserSection/Register/Register.tsx";
import Header from "./Components/Header/Header.tsx";
import Profile from "./Components/UserSection/Profile/Profile.tsx";
import NotFound from "./Components/NotFound/NotFound.tsx";
import Leaderboard from "./Components/Leaderboard/Leaderboard.tsx";
import DailyHistory from "./Components/DailyHistory/DailyHistory.tsx";

/**
 * Composant principal qui gère le routing de l'application
 * @returns JSX du composant App avec toutes les routes définies
 */
function App() {
    return (
        <div className="app-root">
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
                <Route path="/profile" element={<Profile/>}/>
                <Route path="/classements" element={<Leaderboard/>}/>
                <Route path="*" element={<NotFound/>}/>
            </Routes>
        </div>
    );
}

export default App;
