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
import {Route, Routes} from "react-router-dom";
import PlayGame from "./Components/PlayGame/PlayGame.tsx";
import Login from "./Components/UserSection/Login/Login.tsx";
import Register from "./Components/UserSection/Register/Register.tsx";

/**
 * Composant principal qui gère le routing de l'application
 * @returns JSX du composant App avec toutes les routes définies
 */
function App() {
    return (
        <div className="app-root">
            {/* Configuration des routes React Router */}
            <Routes>
                {/* Page d'accueil : liste des jeux */}
                <Route path="/" element={<GameList/>}/>

                {/* Page de jeu dynamique (ex: /playgame/SUDOKU) */}
                <Route path="/playgame/:gameCode" element={<PlayGame/>}/>

                {/* Page de connexion utilisateur */}
                <Route path="/login" element={<Login/>}/>

                {/* Page d'inscription utilisateur */}
                <Route path="/register" element={<Register/>}/>

                {/* Fallback 404 pour toutes les autres routes */}
                <Route path="*" element={<div>404<br/>Page non trouvée</div>}/>
            </Routes>
        </div>
    );
}

export default App;
