/**
 * Composant racine de l'application JokR
 *
 * Ce composant définit toutes les routes de l'application :
 * - / : Page d'accueil avec la liste des jeux disponibles
 * - /playgame/:gameCode : Page de jeu (dynamique selon le code du jeu)
 * - /login : Page de connexion
 * - /register : Page d'inscription
 * - * : Page 404 pour les routes inexistantes
 */

import "./App.css";
import GameList from "./Components/GameList/GameList.tsx";
import {Route, Routes, useLocation} from "react-router-dom";
import PlayGame from "./Components/PlayGame/PlayGame.tsx";
import Login from "./Components/UserSection/Login/Login.tsx";
import Register from "./Components/UserSection/Register/Register.tsx";
import Header from "./Components/Header/Header.tsx";
import {useEffect} from "react";
import sounds from "./Services/sounds";

/**
 * Composant principal qui gère le routing de l'application
 * @returns JSX du composant App avec toutes les routes définies
 */
function App() {
    const location = useLocation();

    useEffect(() => {
        // Play a subtle woosh sound on every route change (initial load + navigations)
        try {
            sounds.woosh();
        } catch (e) {
            // Silently ignore if audio cannot be played (e.g. in test environments)
            console.debug("sounds.woosh() failed:", e);
        }
    }, [location.pathname]);

    return (
        <div className="app-root">
            <Header/>
            <Routes>
                <Route path="/" element={<GameList/>}/>
                <Route path="/playgame/:gameCode" element={<PlayGame/>}/>
                <Route path="/login" element={<Login/>}/>
                <Route path="/register" element={<Register/>}/>
                <Route path="*" element={<div>404<br/>Page non trouvée</div>}/>
            </Routes>
        </div>
    );
}

export default App;
