import {FaSlidersH} from "react-icons/fa";

/** Bouton « Réglages » des jeux du Hasard : visible sur téléphone seulement, il déplie les réglages rares (CasinoMobile.scss) */
export default function SettingsToggle({open, onToggle}: { open: boolean; onToggle: () => void }) {
    return (
        <button type="button" className="casino-settings-toggle" aria-expanded={open} onClick={onToggle}>
            <FaSlidersH aria-hidden/> Réglages
        </button>
    );
}
