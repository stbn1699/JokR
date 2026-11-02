import {FaChevronLeft, FaChevronRight} from "react-icons/fa";
import {monthLabel, monthsBetween, shiftMonth} from "./calendar.ts";
import "./MonthPicker.scss";

type MonthPickerProps = {
    month: string;
    // Premier mois qui a des défis et mois courant : bornes du sélecteur (flèches grisées au-delà)
    firstMonth: string;
    currentMonth: string;
    onChange: (month: string) => void;
};

/**
 * Choix du mois (AAAA-MM) : liste déroulante « Novembre 2026 », avec une flèche de chaque côté
 * pour passer au mois précédent / suivant. Utilisé par la page des défis et le classement du défi.
 */
export default function MonthPicker({month, firstMonth, currentMonth, onChange}: MonthPickerProps) {
    const months = monthsBetween(firstMonth, currentMonth);
    // Mois affiché hors des bornes (adresse modifiée à la main) : on l'ajoute pour que la liste reste juste
    if (!months.includes(month)) months.push(month);

    return (
        <div className="month-picker">
            <button type="button" className="month-arrow" disabled={month <= firstMonth}
                    onClick={() => onChange(shiftMonth(month, -1))} aria-label="Mois précédent">
                <FaChevronLeft aria-hidden/>
            </button>
            <select value={month} onChange={e => onChange(e.target.value)} aria-label="Mois">
                {months.map(m => <option key={m} value={m}>{monthLabel(m)}</option>)}
            </select>
            <button type="button" className="month-arrow" disabled={month >= currentMonth}
                    onClick={() => onChange(shiftMonth(month, 1))} aria-label="Mois suivant">
                <FaChevronRight aria-hidden/>
            </button>
        </div>
    );
}
