/**
 * Écran « fenêtre trop petite » : sur un ordinateur dont la fenêtre est trop étroite, le site entier est remplacé
 * par cette seule page (les téléphones et tablettes ont la page d'installation : InstallApp).
 * Le site revient tout seul dès que la fenêtre est assez grande (voir Services/useSmallScreen.ts).
 */

import "./SmallScreen.scss";
import {FaDesktop} from "react-icons/fa";

export default function SmallScreen() {
    return (
        <main className="small-screen" role="status">
            <img src="/JokR_Logo_Full_Outline.png" alt="JokR" className="small-screen-logo"/>
            <p>Cette fenêtre est trop petite pour JokR</p>
            <FaDesktop className="small-screen-icon" aria-hidden/>
            <p className="small-screen-hint">
                Déjà sur ordinateur ? Agrandis la fenêtre, ou remets le zoom à 100 % (Ctrl + 0)
            </p>
        </main>
    );
}
