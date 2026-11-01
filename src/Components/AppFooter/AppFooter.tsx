import "./AppFooter.scss";
import {Link} from "react-router-dom";

/**
 * Numéro de version et lien vers les nouveautés :
 * dans le coin en bas à droite sur ordinateur, en bas de page sur téléphone.
 */
export default function AppFooter() {
    return (
        <footer className="app-footer">
            <Link to="/nouveautes" title="Voir les nouveautés">
                v{__APP_VERSION__} · Nouveautés
            </Link>
        </footer>
    );
}
