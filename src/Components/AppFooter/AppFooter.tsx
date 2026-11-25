import "./AppFooter.scss";
import {Link, useLocation} from "react-router-dom";
import {isGameRoute} from "../../Services/routes.ts";

/**
 * Numéro de version, lien vers les nouveautés et la page Confidentialité :
 * dans le coin en bas à droite sur ordinateur, en bas de page sur téléphone.
 */
export default function AppFooter() {
    const inGame = isGameRoute(useLocation().pathname);
    return (
        <footer className={`app-footer ${inGame ? "in-game" : ""}`}>
            <Link to="/nouveautes" title="Voir les nouveautés">
                v{__APP_VERSION__} · Nouveautés
            </Link>
            <Link to="/confidentialite">Confidentialité</Link>
        </footer>
    );
}
