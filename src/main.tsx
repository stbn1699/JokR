/**
 * Point d'entrée principal de l'application React
 *
 * Ce fichier initialise l'application en :
 * - Créant la racine React dans l'élément DOM #root
 * - Enveloppant l'app dans BrowserRouter pour la navigation côté client
 * - Chargeant les styles globaux (index.css)
 */

import {createRoot} from "react-dom/client";
import {BrowserRouter} from "react-router-dom";
import App from "./App.tsx";
import "./index.css";

// Récupère l'élément HTML racine où React va s'injecter
const container = document.getElementById("root")!;

// Crée la racine React 18 (mode concurrent)
const root = createRoot(container);

// Rend l'application complète avec le router pour gérer les routes
root.render(
    <BrowserRouter>
        <App/>
    </BrowserRouter>
);