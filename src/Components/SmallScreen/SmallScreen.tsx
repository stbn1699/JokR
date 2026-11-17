/**
 * Écran « petit écran » : sur téléphone, tablette ou fenêtre trop étroite, le site entier est remplacé par
 * cette seule page (comme l'écran de mise à jour) : le logo et un petit message.
 * Le site revient tout seul dès que la fenêtre est assez grande (voir Services/useSmallScreen.ts).
 */

import "./SmallScreen.scss";
import {FaDesktop} from "react-icons/fa";
import {isTouchOnly} from "../../Services/useSmallScreen.ts";

export default function SmallScreen() {
    const touch = isTouchOnly();
    return (
        <main className="small-screen" role="status">
            <img src="/JokR_Logo_Full_Outline.png" alt="JokR" className="small-screen-logo"/>
            <p>JokR arrive bientôt sur téléphone et tablette</p>
            <p className="small-screen-sub">En attendant, utilise un ordinateur pour jouer</p>
            <FaDesktop className="small-screen-icon" aria-hidden/>
            {!touch && <p className="small-screen-hint">
                Déjà sur ordinateur ? Agrandis la fenêtre, ou remets le zoom à 100 % (Ctrl + 0)
            </p>}
        </main>
    );
}
