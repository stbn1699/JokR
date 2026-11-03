import {type FormEvent, type ReactNode, useCallback, useEffect, useState} from "react";
import {useLocation} from "react-router-dom";
import {FcGoogle} from "react-icons/fc";
import {FaDiscord} from "react-icons/fa";
import {userService} from "../../../Services/user.service.ts";
import {oauthService, type Provider, PROVIDER_NAMES} from "../../../Services/oauth.service.ts";
import type {User} from "../../../Models/user.model.ts";

/**
 * Section "Mon compte" du profil :
 * - comptes Google / Discord liés (lier, retirer)
 * - changement de mot de passe (mot de passe actuel requis), ou création pour un compte Google / Discord
 * - suppression définitive du compte (mot de passe, ou pseudo s'il n'y en a pas ; avertissement clair)
 */
type AccountSettingsProps = {
    // Compte supprimé : le profil ferme la session et renvoie à l'accueil
    onDeleted: () => void;
};

const ICONS: Record<Provider, ReactNode> = {google: <FcGoogle/>, discord: <FaDiscord/>};

export default function AccountSettings({onDeleted}: AccountSettingsProps) {
    const [me, setMe] = useState<User | null>(null);
    const [providers, setProviders] = useState<Provider[]>([]);
    // Message affiché en revenant de Google / Discord après une liaison
    const notice = (useLocation().state as { notice?: string } | null)?.notice;
    const [linkMessage, setLinkMessage] = useState<{ ok: boolean; text: string } | null>(
        notice ? {ok: true, text: notice} : null);
    const [linkBusy, setLinkBusy] = useState<Provider | null>(null);

    const [current, setCurrent] = useState("");
    const [next, setNext] = useState("");
    const [confirm, setConfirm] = useState("");
    const [passwordMessage, setPasswordMessage] = useState<{ ok: boolean; text: string } | null>(null);
    const [saving, setSaving] = useState(false);

    const [deleteOpen, setDeleteOpen] = useState(false);
    const [deleteConfirm, setDeleteConfirm] = useState("");
    const [deleteError, setDeleteError] = useState<string | null>(null);
    const [deleting, setDeleting] = useState(false);

    const reload = useCallback(() => userService.getMe().then(setMe).catch(() => undefined), []);

    useEffect(() => {
        void reload();
        oauthService.providers().then(setProviders).catch(() => undefined);
    }, [reload]);

    // Tant que le profil n'est pas chargé, on suppose un compte classique (cas le plus courant)
    const hasPassword = me?.hasPassword !== false;
    const linked = me?.linkedAccounts ?? [];
    // Fournisseurs à afficher : ceux configurés, plus ceux déjà liés (pour pouvoir les retirer)
    const shown = [...new Set<Provider>([...providers, ...linked.map(l => l.provider as Provider)])]
        .filter(p => p in PROVIDER_NAMES);

    const link = async (provider: Provider) => {
        setLinkMessage(null);
        setLinkBusy(provider);
        try {
            await oauthService.start(provider, "link");
        } catch (err) {
            setLinkMessage({ok: false, text: (err as Error).message});
            setLinkBusy(null);
        }
    };

    const unlink = async (provider: Provider) => {
        setLinkMessage(null);
        setLinkBusy(provider);
        try {
            await oauthService.unlink(provider);
            await reload();
            setLinkMessage({ok: true, text: `Compte ${PROVIDER_NAMES[provider]} retiré.`});
        } catch (err) {
            setLinkMessage({ok: false, text: (err as Error).message});
        } finally {
            setLinkBusy(null);
        }
    };

    const changePassword = async (e: FormEvent) => {
        e.preventDefault();
        if ((hasPassword && !current) || !next) return setPasswordMessage({ok: false, text: "Tous les champs sont requis."});
        if (next.length < 8) return setPasswordMessage({ok: false, text: "Le mot de passe doit faire au moins 8 caractères."});
        if (next !== confirm) return setPasswordMessage({ok: false, text: "Les nouveaux mots de passe ne correspondent pas."});
        setSaving(true);
        try {
            await userService.changePassword(hasPassword ? current : null, next);
            setCurrent("");
            setNext("");
            setConfirm("");
            setPasswordMessage({ok: true, text: hasPassword ? "Mot de passe modifié." : "Mot de passe créé."});
            await reload();
        } catch (err) {
            setPasswordMessage({ok: false, text: (err as Error).message});
        } finally {
            setSaving(false);
        }
    };

    const deleteAccount = async (e: FormEvent) => {
        e.preventDefault();
        if (!deleteConfirm) return setDeleteError(hasPassword ? "Mot de passe requis." : "Pseudo requis.");
        setDeleting(true);
        try {
            await userService.deleteAccount(hasPassword ? {password: deleteConfirm} : {username: deleteConfirm});
            onDeleted();
        } catch (err) {
            setDeleteError((err as Error).message);
            setDeleting(false);
        }
    };

    return (
        <div className="account-settings">
            <h2>Mon compte</h2>

            {shown.length > 0 && (
                <div className="account-linked">
                    <h3>Comptes liés</h3>
                    <p className="account-hint">Connecte-toi en un clic avec ces comptes.</p>
                    <ul>
                        {shown.map(p => {
                            const account = linked.find(l => l.provider === p);
                            return (
                                <li key={p}>
                                    <span className={`account-provider-icon ${p}`} aria-hidden="true">{ICONS[p]}</span>
                                    <span className="account-provider-name">
                                        {PROVIDER_NAMES[p]}
                                        <small>{account ? account.displayName ?? "Lié" : "Non lié"}</small>
                                    </span>
                                    {account ? (
                                        <button type="button" className="secondary" disabled={linkBusy !== null}
                                                onClick={() => void unlink(p)}>
                                            Retirer
                                        </button>
                                    ) : providers.includes(p) && (
                                        <button type="button" disabled={linkBusy !== null} onClick={() => void link(p)}>
                                            {linkBusy === p ? "Redirection…" : "Lier"}
                                        </button>
                                    )}
                                </li>
                            );
                        })}
                    </ul>
                    {linkMessage && (
                        <p className={linkMessage.ok ? "account-success" : "account-error"} role="status">
                            {linkMessage.text}
                        </p>
                    )}
                </div>
            )}

            <form className="account-form" onSubmit={changePassword}>
                <h3>{hasPassword ? "Changer de mot de passe" : "Créer un mot de passe"}</h3>
                {!hasPassword && (
                    <p className="account-hint">
                        Tu te connectes avec Google ou Discord. Un mot de passe te permet aussi de te connecter
                        avec ton pseudo.
                    </p>
                )}
                {hasPassword && (
                    <input type="password" placeholder="Mot de passe actuel" autoComplete="current-password"
                           value={current} onChange={e => setCurrent(e.target.value)}/>
                )}
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
                        {hasPassword ? (
                            <input type="password" placeholder="Ton mot de passe pour confirmer"
                                   autoComplete="current-password"
                                   value={deleteConfirm} onChange={e => setDeleteConfirm(e.target.value)}/>
                        ) : (
                            <input placeholder={`Tape ton pseudo (${me?.username ?? ""}) pour confirmer`}
                                   autoCapitalize="none" spellCheck={false}
                                   value={deleteConfirm} onChange={e => setDeleteConfirm(e.target.value)}/>
                        )}
                        <div className="account-buttons">
                            <button type="button" className="secondary" onClick={() => {
                                setDeleteOpen(false);
                                setDeleteConfirm("");
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
