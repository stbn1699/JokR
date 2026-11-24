import {type FormEvent, useState} from "react";
import {FaPen} from "react-icons/fa";
import {userService} from "../../../Services/user.service.ts";
import {joinPronouns, MAX_PRONOUNS, PRONOUN_GROUPS, PRONOUNS_MAX, splitPronouns} from "../../../Services/pronouns.ts";

/**
 * Section « Pronoms » des paramètres : affichés sous le pseudo, sur sa page (/joueur/:pseudo et onglet Profil).
 * - Choix dans la liste (jusqu'à MAX_PRONOUNS, combinés : elle/iel, she/her, they/them)
 * - Ou « Écrire les miens » : texte libre
 * - « Retirer » : plus rien d'affiché
 */
type PronounsFieldProps = {
    // undefined tant que le profil n'est pas chargé
    pronouns: string | null | undefined;
    onChange: (pronouns: string | null) => void;
};

type Message = { ok: boolean; text: string } | null;

export default function PronounsField({pronouns, onChange}: PronounsFieldProps) {
    const saved = pronouns ?? "";
    const [draft, setDraft] = useState(saved);
    // Texte écrit à la main (pas seulement des pronoms de la liste)
    const [custom, setCustom] = useState(splitPronouns(saved) === null);
    // Les pronoms arrivent après le premier affichage : on remplit le brouillon
    const [loadedFor, setLoadedFor] = useState(pronouns);
    if (pronouns !== loadedFor) {
        setLoadedFor(pronouns);
        setDraft(saved);
        setCustom(splitPronouns(saved) === null);
    }
    const [message, setMessage] = useState<Message>(null);
    const [saving, setSaving] = useState(false);

    const selected = custom ? [] : splitPronouns(draft) ?? [];
    const text = draft.replace(/\s+/g, " ").trim();

    const toggle = (item: string) => {
        setMessage(null);
        if (selected.includes(item)) return setDraft(joinPronouns(selected.filter(p => p !== item)));
        if (selected.length >= MAX_PRONOUNS) {
            return setMessage({ok: false, text: `${MAX_PRONOUNS} pronoms au plus : retires-en un, ou écris les tiens.`});
        }
        setDraft(joinPronouns([...selected, item]));
    };

    const writeOwn = () => {
        setMessage(null);
        setCustom(true);
    };

    // Retour à la liste : un texte écrit à la main qu'elle ne sait pas montrer est vidé
    const backToList = () => {
        setMessage(null);
        if (splitPronouns(text) === null) setDraft("");
        else setDraft(text);
        setCustom(false);
    };

    const save = async (value: string | null) => {
        setSaving(true);
        setMessage(null);
        try {
            await userService.changePronouns(value);
            onChange(value);
            setMessage({ok: true, text: value ? "Pronoms enregistrés." : "Pronoms retirés."});
        } catch (err) {
            setMessage({ok: false, text: (err as Error).message});
        } finally {
            setSaving(false);
        }
    };

    const submit = (e: FormEvent) => {
        e.preventDefault();
        void save(text || null);
    };

    if (pronouns === undefined) {
        return (
            <div className="settings-section">
                <h2>Pronoms</h2>
                <p className="settings-hint">Chargement…</p>
            </div>
        );
    }

    return (
        <form className="settings-section settings-pronouns" onSubmit={submit}>
            <h2>Pronoms</h2>
            <p className="settings-hint">Affichés sous ton pseudo, sur ta page. Choisis-en jusqu'à {MAX_PRONOUNS}, ou écris les tiens.</p>

            {PRONOUN_GROUPS.map(g => (
                <div key={g.id} className="pronoun-group" role="group" aria-label={g.label}>
                    <h3>{g.label}</h3>
                    <div className="pronoun-chips">
                        {g.items.map(item => (
                            <button key={item} type="button" className="pronoun-chip" aria-pressed={selected.includes(item)}
                                    disabled={custom} onClick={() => toggle(item)}>
                                {item}
                            </button>
                        ))}
                    </div>
                </div>
            ))}

            <div className="pronoun-chips">
                <button type="button" className="pronoun-chip pronoun-chip-own" aria-pressed={custom}
                        onClick={custom ? backToList : writeOwn}>
                    <FaPen aria-hidden/> Écrire les miens
                </button>
            </div>

            {custom && (
                <div className="settings-row">
                    <input value={draft} onChange={e => setDraft(e.target.value)} maxLength={PRONOUNS_MAX} autoFocus
                           placeholder="ex. elle/iel, ul/ellui, any/all…" aria-label="Mes pronoms" spellCheck={false}/>
                </div>
            )}

            <p className="pronoun-preview">
                {text ? <>Affiché : <strong>{text}</strong></> : "Aucun pronom affiché."}
            </p>

            <div className="settings-row pronoun-actions">
                <button type="submit" className="settings-button" disabled={saving || text === saved}>
                    {saving ? "Enregistrement…" : "Enregistrer"}
                </button>
                {saved && (
                    <button type="button" className="settings-button settings-button-secondary" disabled={saving}
                            onClick={() => {
                                setDraft("");
                                setCustom(false);
                                void save(null);
                            }}>
                        Retirer
                    </button>
                )}
            </div>
            {message && <p className={message.ok ? "account-success" : "account-error"} role="status">{message.text}</p>}
        </form>
    );
}
