/**
 * Point d'entrée principal de l'application React
 *
 * Ce fichier initialise l'application en :
 * - Créant la racine React dans l'élément DOM #root
 * - Enveloppant l'app dans BrowserRouter pour la navigation côté client
 * - Fournissant la session utilisateur (AuthProvider, qui a besoin du router)
 * - Chargeant les styles globaux (index.css)
 * - Installant le service worker (site en ligne) : page « Mise à jour en cours » quand le serveur est coupé
 */

import {createRoot} from "react-dom/client";
import {BrowserRouter} from "react-router-dom";
import App from "./App.tsx";
import {AuthProvider} from "./Context/AuthProvider.tsx";
import "./index.css";

// Page « Mise à jour en cours » gardée par le navigateur (voir public/sw.js) ; pas en développement
if (import.meta.env.PROD && "serviceWorker" in navigator) {
    window.addEventListener("load", () => {
        navigator.serviceWorker.register("/sw.js").catch(() => undefined);
    });
}

// Récupère l'élément HTML racine où React va s'injecter
const container = document.getElementById("root")!;

// Crée la racine React 18 (mode concurrent)
const root = createRoot(container);

// Rend l'application complète avec le router pour gérer les routes
root.render(
    <BrowserRouter>
        <AuthProvider>
            <App/>
        </AuthProvider>
    </BrowserRouter>
);