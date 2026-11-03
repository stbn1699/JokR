import {type InputHTMLAttributes, useState} from "react";
import {FaEye, FaEyeSlash} from "react-icons/fa";

// Champ mot de passe avec un bouton pour l'afficher en clair
export default function PasswordInput(props: Omit<InputHTMLAttributes<HTMLInputElement>, "type">) {
    const [visible, setVisible] = useState(false);
    return (
        <div className="auth-password">
            <input {...props} type={visible ? "text" : "password"}/>
            <button type="button" className="auth-password-toggle" onClick={() => setVisible(v => !v)}
                    aria-label={visible ? "Masquer le mot de passe" : "Afficher le mot de passe"}>
                {visible ? <FaEyeSlash/> : <FaEye/>}
            </button>
        </div>
    );
}
