import {useEffect, useRef, useState} from "react";
import {FaDice} from "react-icons/fa";
import Avatar from "./Avatar.tsx";
import {randomAvatarSeed} from "../../Services/avatar.ts";
import "../SuccessPopup/SuccessPopup.scss"; // .modal-overlay / .modal
import "./Avatar.scss";

/**
 * Popup de choix de l'icône de profil : l'icône actuelle et des propositions tirées au hasard,
 * avec un bouton pour en tirer d'autres.
 * - onConfirm : graine choisie (peut être asynchrone : enregistrement depuis le profil)
 */
type AvatarPickerProps = {
    value: string;
    onConfirm: (seed: string) => void | Promise<void>;
    onClose: () => void;
};

const COUNT = 11;
const draw = () => Array.from({length: COUNT}, randomAvatarSeed);

export default function AvatarPicker({value, onConfirm, onClose}: AvatarPickerProps) {
    const [options, setOptions] = useState(() => [value, ...draw()]);
    const [selected, setSelected] = useState(value);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    // nouvelle série : l'animation d'apparition des icônes repart
    const [round, setRound] = useState(0);
    const modalRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        modalRef.current?.focus();
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose();
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [onClose]);

    // Autres propositions, en gardant celle qui est choisie en premier
    const reroll = () => {
        setOptions([selected, ...draw()]);
        setRound(r => r + 1);
    };

    const confirm = async () => {
        setError(null);
        setSaving(true);
        try {
            await onConfirm(selected);
            onClose();
        } catch (err) {
            setError((err as Error).message);
            setSaving(false);
        }
    };

    return (
        <div className="modal-overlay avatar-picker-overlay" role="dialog" aria-modal="true"
             aria-labelledby="avatar-picker-title" onClick={e => e.target === e.currentTarget && onClose()}>
            <div ref={modalRef} className="modal avatar-picker" tabIndex={-1}>
                <h2 id="avatar-picker-title">Ton icône</h2>

                <div className="avatar-picker-preview" key={selected}>
                    <Avatar seed={selected} size={6.5}/>
                </div>

                <div className="avatar-picker-grid" role="radiogroup" aria-label="Icônes proposées">
                    {options.map((seed, i) => (
                        <button key={`${round}-${seed}`} type="button" role="radio" aria-checked={seed === selected}
                                className={`avatar-picker-option ${seed === selected ? "selected" : ""}`}
                                style={{animationDelay: `${i * 25}ms`}}
                                onClick={() => setSelected(seed)}>
                            <Avatar seed={seed} size={3.4}/>
                        </button>
                    ))}
                </div>

                <button type="button" className="avatar-picker-reroll" onClick={reroll}>
                    <FaDice aria-hidden/> Autres icônes
                </button>

                {error && <p className="avatar-picker-error" role="alert">{error}</p>}

                <div className="modal-buttons">
                    <button type="button" className="modal-button" onClick={() => void confirm()} disabled={saving}>
                        {saving ? "Enregistrement…" : "Choisir"}
                    </button>
                    <button type="button" className="modal-button secondary" onClick={onClose}>Annuler</button>
                </div>
            </div>
        </div>
    );
}
