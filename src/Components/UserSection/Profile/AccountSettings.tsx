import {type FormEvent, useState} from "react";
import {userService} from "../../../Services/user.service.ts";

/**
 * Section "Mon compte" du profil :
 * - changement de mot de passe (mot de passe actuel requis)
 * - suppression définitive du compte (mot de passe requis, avertissement clair)
 */
type AccountSettingsProps = {
    // Compte supprimé : le profil ferme la session et renvoie à l'accueil
    onDeleted: () => void;
};

export default function AccountSettings({onDeleted}: AccountSettingsProps) {
    const [current, setCurrent] = useState("");
    const [next, setNext] = useState("");
    const [confirm, setConfirm] = useState("");
    const [passwordMessage, setPasswordMessage] = useState<{ ok: boolean; text: string } | null>(null);
    const [saving, setSaving] = useState(false);

    const [deleteOpen, setDeleteOpen] = useState(false);
    const [deletePassword, setDeletePassword] = useState("");
    const [deleteError, setDeleteError] = useState<string | null>(null);
    const [deleting, setDeleting] = useState(false);

    const changePassword = async (e: FormEvent) => {
        e.preventDefault();
        if (!current || !next) return setPasswordMessage({ok: false, text: "Tous les champs sont requis."});
        if (next !== confirm) return setPasswordMessage({ok: false, text: "Les nouveaux mots de passe ne correspondent pas."});
        setSaving(true);
        try {
            await userService.changePassword(current, next);
            setCurrent("");
            setNext("");
            setConfirm("");
            setPasswordMessage({ok: true, text: "Mot de passe modifié."});
        } catch (err) {
            setPasswordMessage({ok: false, text: (err as Error).message});
        } finally {
            setSaving(false);
        }
    };

    const deleteAccount = async (e: FormEvent) => {
        e.preventDefault();
        if (!deletePassword) return setDeleteError("Mot de passe requis.");
        setDeleting(true);
        try {
            await userService.deleteAccount(deletePassword);
            onDeleted();
        } catch (err) {
            setDeleteError((err as Error).message);
            setDeleting(false);
        }
    };

    return (
        <div className="account-settings">
            <h2>Mon compte</h2>

            <form className="account-form" onSubmit={changePassword}>
                <h3>Changer de mot de passe</h3>
                <input type="password" placeholder="Mot de passe actuel" autoComplete="current-password"
                       value={current} onChange={e => setCurrent(e.target.value)}/>
                <input type="password" placeholder="Nouveau mot de passe" autoComplete="new-password"
                       value={next} onChange={e => setNext(e.target.value)}/>
                <input type="password" placeholder="Confirmation du nouveau mot de passe" autoComplete="new-password"
                       value={confirm} onChange={e => setConfirm(e.target.value)}/>
                <button type="submit" disabled={saving}>{saving ? "Enregistrement…" : "Enregistrer"}</button>
                {passwordMessage && (
                    <p className={passwordMessage.ok ? "account-success" : "account-error"} role="status">
                        {passwordMessage.text}
                    </p>
                )}
            </form>

            <div className="account-danger">
                <h3>Zone de danger</h3>
                {!deleteOpen ? (
                    <button type="button" className="danger" onClick={() => setDeleteOpen(true)}>
                        Supprimer mon compte
                    </button>
                ) : (
                    <form className="account-form" onSubmit={deleteAccount}>
                        <p className="account-warning">
                            Ton compte, ton niveau, tes statistiques et ton historique seront <strong>supprimés
                            définitivement</strong>. Cette action est irréversible.
                        </p>
                        <input type="password" placeholder="Ton mot de passe pour confirmer" autoComplete="current-password"
                               value={deletePassword} onChange={e => setDeletePassword(e.target.value)}/>
                        <div className="account-buttons">
                            <button type="button" className="secondary" onClick={() => {
                                setDeleteOpen(false);
                                setDeletePassword("");
                                setDeleteError(null);
                            }}>
                                Annuler
                            </button>
                            <button type="submit" className="danger" disabled={deleting}>
                                {deleting ? "Suppression…" : "Supprimer définitivement"}
                            </button>
                        </div>
                        {deleteError && <p className="account-error" role="alert">{deleteError}</p>}
                    </form>
                )}
            </div>
        </div>
    );
}
