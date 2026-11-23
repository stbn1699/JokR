import "./StreakFlame.scss";
import {FaFire} from "react-icons/fa";

// Couleur de la flamme selon la série : orange, puis rouge (7 jours), violette (30), bleue (100)
const tier = (days: number) => (days >= 100 ? "blue" : days >= 30 ? "violet" : days >= 7 ? "red" : "orange");

/**
 * Petite flamme à côté d'un pseudo : nombre de jours de suite avec au moins une grille réussie.
 * Rien sans série en cours. `dim` : pas encore de grille aujourd'hui (la flamme attend d'être ravivée).
 */
export default function StreakFlame({days, dim = false, className = ""}: { days: number | null | undefined; dim?: boolean; className?: string }) {
    if (!days || days <= 0) return null;
    const label = `Flamme : ${days.toLocaleString("fr-FR")} jour${days > 1 ? "s" : ""} de suite`;
    return (
        <span className={`streak-flame ${tier(days)} ${dim ? "dim" : ""} ${className}`} title={label} aria-label={label} role="img">
            <FaFire aria-hidden/>
            <span aria-hidden>{days.toLocaleString("fr-FR")}</span>
        </span>
    );
}
