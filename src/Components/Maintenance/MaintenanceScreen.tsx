/**
 * Écran de mise à jour : tant que la mise à jour est activée (ou que le serveur redémarre), le site entier est
 * remplacé par cette seule page, sans header ni bouton : le logo et un petit message.
 * Le site revient tout seul sur l'accueil dès que c'est fini (voir Services/maintenance.ts).
 * Même page que public/offline.html (montrée par le navigateur quand le serveur est coupé).
 */

import "./Maintenance.scss";
import {FaHeart} from "react-icons/fa";

export default function MaintenanceScreen() {
    return (
        <main className="maintenance-screen" role="status">
            <img src="/JokR_Logo_Full_Outline.png" alt="JokR" className="maintenance-logo"/>
            <p>Mise à jour en cours, nous revenons dans quelques minutes</p>
            <FaHeart className="maintenance-heart" aria-hidden/>
        </main>
    );
}
