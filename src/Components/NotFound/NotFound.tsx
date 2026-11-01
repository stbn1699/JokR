import {Link} from "react-router-dom";
import "./NotFound.scss";

// Page affichée pour une adresse qui n'existe pas
export default function NotFound() {
    return (
        <main className="not-found">
            <p className="not-found-code">404</p>
            <h1>Page introuvable</h1>
            <p>Cette page n'existe pas ou a été déplacée.</p>
            <Link to="/" className="not-found-link">Retour à l'accueil</Link>
        </main>
    );
}
