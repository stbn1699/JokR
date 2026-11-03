import {useState} from "react";
import Avatar from "./Avatar.tsx";
import AvatarPicker from "./AvatarPicker.tsx";

/**
 * Icône de profil dans un formulaire d'inscription : l'icône choisie et un bouton pour en changer.
 */
type AvatarFieldProps = {
    value: string;
    onChange: (seed: string) => void;
};

export default function AvatarField({value, onChange}: AvatarFieldProps) {
    const [open, setOpen] = useState(false);
    return (
        <div className="avatar-field">
            <button type="button" className="avatar-field-preview" onClick={() => setOpen(true)}
                    title="Changer d'icône">
                <Avatar seed={value} size={4}/>
            </button>
            <div className="avatar-field-text">
                <span>Ton icône</span>
                <button type="button" className="avatar-field-change" onClick={() => setOpen(true)}>
                    Changer d'icône
                </button>
            </div>
            {open && <AvatarPicker value={value} onConfirm={onChange} onClose={() => setOpen(false)}/>}
        </div>
    );
}
