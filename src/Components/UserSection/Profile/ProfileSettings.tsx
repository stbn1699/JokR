import {type FormEvent, useState} from "react";
import {useAuth} from "../../../Context/authContext.ts";
import {userService} from "../../../Services/user.service.ts";
import type {Privacy} from "../../../Models/user.model.ts";
import {ApiError} from "../../../api/api.ts";
import Avatar from "../../Avatar/Avatar.tsx";
import AccountSettings from "./AccountSettings.tsx";

/**
 * Onglet « Paramètres » du profil, rangé par sections :
 * - Icône de profil (ouvre le choix d'icône)
 * - Pseudo (mêmes règles qu'à l'inscription, refusé s'il est déjà pris)
 * - Visibilité de sa page : statistiques, dernières victoires (le pseudo, l'icône et le niveau restent visibles)
 * - Compte : comptes Google / Discord liés, mot de passe, zone de danger (AccountSettings)
 */
type ProfileSettingsProps = {
    // null tant que les réglages ne sont pas chargés
    privacy: Privacy | null;
    onPrivacyChange: (privacy: Privacy) => void;
    onPickAvatar: () => void;
    onLogout: () => void;
};

const USERNAME_REGEX = /^[\p{L}\p{N}_.-]{3,30}$/u;

const PRIVACY_OPTIONS: { key: keyof Privacy; label: string; hint: string }[] = [
    {key: "showStats", label: "Mes statistiques", hint: "Classement, victoires, crédits, défis du jour, stats par jeu, XP et date d'inscription"},
    {key: "showHistory", label: "Mes dernières victoires", hint: "Jeu, grille, temps et date de tes dernières parties gagnées"},
];

type Message = { ok: boolean; text: string } | null;

export default function ProfileSettings({privacy, onPrivacyChange, onPickAvatar, onLogout}: ProfileSettingsProps) {
    const {username, avatar, level, refresh} = useAuth();

    const [newName, setNewName] = useState(username ?? "");
    // Le pseudo arrive après le premier affichage (profil chargé au démarrage) ou change : on remplit le champ
    const [nameFor, setNameFor] = useState(username);
    if (username !== nameFor) {
        setNameFor(username);
        setNewName(username ?? "");
    }
    const [nameMessage, setNameMessage] = useState<Message>(null);
    const [savingName, setSavingName] = useState(false);
    const [privacyMessage, setPrivacyMessage] = useState<Message>(null);
    const [savingPrivacy, setSavingPrivacy] = useState(false);

    const changeName = async (e: FormEvent) => {
        e.preventDefault();
        const name = newName.trim();
        if (name === username) return setNameMessage(null);
        if (!USERNAME_REGEX.test(name)) {
            return setNameMessage({ok: false, text: "Le pseudo doit faire 3 à 30 caractères (lettres, chiffres, _ . -)."});
        }
        setSavingName(true);
        try {
            await userService.changeUsername(name);
            await refresh();
            setNameMessage({ok: true, text: "Pseudo modifié."});
        } catch (err) {
            setNameMessage({ok: false, text: err instanceof ApiError && err.status === 409 ? "Ce pseudo est déjà pris." : (err as Error).message});
        } finally {
            setSavingName(false);
        }
    };

    const togglePrivacy = async (key: keyof Privacy) => {
        if (!privacy) return;
        const next = {...privacy, [key]: !privacy[key]};
        setSavingPrivacy(true);
        setPrivacyMessage(null);
        try {
            await userService.changePrivacy(next);
            onPrivacyChange(next);
            setPrivacyMessage({ok: true, text: "Enregistré."});
        } catch (err) {
            setPrivacyMessage({ok: false, text: (err as Error).message});
        } finally {
            setSavingPrivacy(false);
        }
    };

    const everythingHidden = privacy && !privacy.showStats && !privacy.showHistory;

    return (
        <section className="profile-card profile-settings fade-in">
            <h1>Paramètres</h1>

            <div className="settings-section">
                <h2>Icône de profil</h2>
                <div className="settings-avatar">
                    <Avatar seed={avatar ?? undefined} fallback={username ?? undefined} size={4.5} level={level} showLevel/>
                    <button type="button" className="settings-button" onClick={onPickAvatar}>Changer d'icône</button>
                </div>
            </div>

            <form className="settings-section" onSubmit={changeName}>
                <h2>Pseudo</h2>
                <div className="settings-row">
                    <input value={newName} onChange={e => setNewName(e.target.value)} maxLength={30}
                           autoComplete="username" spellCheck={false} aria-label="Pseudo"/>
                    <button type="submit" className="settings-button" disabled={savingName || newName.trim() === username}>
                        {savingName ? "Enregistrement…" : "Enregistrer"}
                    </button>
                </div>
                <p className="settings-hint">3 à 30 caractères : lettres, chiffres, _ . -</p>
                {nameMessage && <p className={nameMessage.ok ? "account-success" : "account-error"} role="status">{nameMessage.text}</p>}
            </form>

            <div className="settings-section">
                <h2>Ce que les autres voient</h2>
                <p className="settings-hint">
                    Ton pseudo, ton icône et ton niveau restent toujours visibles. Toi, tu vois toujours toute ta page.
                </p>
                {!privacy ? <p className="settings-hint">Chargement…</p> : (
                    <ul className="settings-toggles">
                        {PRIVACY_OPTIONS.map(o => (
                            <li key={o.key}>
                                <label>
                                    <span className="settings-toggle-text">
                                        <strong>{o.label}</strong>
                                        <small>{o.hint}</small>
                                    </span>
                                    <input type="checkbox" role="switch" className="settings-switch" checked={privacy[o.key]}
                                           disabled={savingPrivacy} onChange={() => void togglePrivacy(o.key)}/>
                                </label>
                            </li>
                        ))}
                    </ul>
                )}
                {everythingHidden && <p className="settings-hint">Ta page est privée : les autres voient seulement ton pseudo, ton icône et ton niveau.</p>}
                {privacyMessage && <p className={privacyMessage.ok ? "account-success" : "account-error"} role="status">{privacyMessage.text}</p>}
            </div>

            <AccountSettings onLogout={onLogout}/>
        </section>
    );
}
