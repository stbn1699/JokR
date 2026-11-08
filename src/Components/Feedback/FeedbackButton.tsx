/**
 * Bouton « Un bug ? Une idée ? » en bas à droite (joueurs connectés seulement) :
 * ouvre la page de retour en retenant la page d'où l'on vient (jointe au message).
 */

import "./Feedback.scss";
import {Link, useLocation} from "react-router-dom";
import {FaCommentDots} from "react-icons/fa";
import {useAuth} from "../../Context/authContext.ts";
import {isGameRoute} from "../../Services/routes.ts";

export default function FeedbackButton() {
    const {isLoggedIn} = useAuth();
    const {pathname, search} = useLocation();
    if (!isLoggedIn || pathname === "/retour") return null;

    return (
        <Link to="/retour" state={{from: pathname + search}}
              className={`feedback-button ${isGameRoute(pathname) ? "in-game" : ""}`}
              title="Signaler un bug ou suggérer une amélioration" aria-label="Signaler un bug ou suggérer une amélioration">
            <FaCommentDots aria-hidden/>
            <span>Un bug ? Une idée ?</span>
        </Link>
    );
}
