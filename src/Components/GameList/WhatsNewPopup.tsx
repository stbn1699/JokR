import {useEffect, useRef} from "react";
import {useNavigate} from "react-router-dom";
import "../SuccessPopup/SuccessPopup.scss";
import "./WhatsNewPopup.scss";
import type {ChangelogVersion} from "../Changelog/parseChangelog.ts";
import {APP_VERSION} from "../../Services/version.ts";

type WhatsNewPopupProps = {
    // Versions sorties depuis la dernière visite, la plus récente d'abord
    versions: ChangelogVersion[];
    onClose: () => void;
};

// Au-delà, la popup renvoie vers la page Nouveautés pour le reste
const MAX_VERSIONS = 3;

/**
 * Popup « Quoi de neuf ? » sur l'accueil, à la première visite après une nouvelle version :
 * les nouveautés de chaque version sortie depuis (rubriques du changelog), puis lien vers la page Nouveautés.
 * Se ferme avec le bouton, Échap ou un clic à côté.
 */
export default function WhatsNewPopup({versions, onClose}: WhatsNewPopupProps) {
    const navigate = useNavigate();
    const modalRef = useRef<HTMLDivElement>(null);
    const shown = versions.slice(0, MAX_VERSIONS);
    const more = versions.length - shown.length;

    useEffect(() => {
        modalRef.current?.focus();
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose();
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [onClose]);

    return (
        <div className="modal-overlay success-overlay whats-new-overlay" role="dialog" aria-modal="true"
             aria-labelledby="whats-new-title" onClick={e => e.target === e.currentTarget && onClose()}>
            <div className="modal success-modal whats-new" ref={modalRef} tabIndex={-1}>
                <p className="whats-new-badge">Version {APP_VERSION}</p>
                <h2 id="whats-new-title">Quoi de neuf ?</h2>

                <div className="whats-new-body">
                    {shown.map(v => (
                        <article key={v.version} className="whats-new-version">
                            {versions.length > 1 && <h3>Version {v.version}</h3>}
                            {v.intro.map((p, i) => <p key={i} className="whats-new-intro">{p}</p>)}
                            {v.sections.map((s, i) => (
                                <div key={i} className="whats-new-section">
                                    {s.title && <h4>{s.title}</h4>}
                                    <ul>{s.items.map((item, j) => <li key={j}>{item}</li>)}</ul>
                                </div>
                            ))}
                        </article>
                    ))}
                    {more > 0 && <p className="whats-new-more">… et {more} version{more > 1 ? "s" : ""} de plus.</p>}
                </div>

                <div className="modal-buttons">
                    <button type="button" className="modal-button" onClick={onClose}>C'est parti !</button>
                    <button type="button" className="modal-button secondary" onClick={() => {
                        onClose();
                        navigate("/nouveautes");
                    }}>
                        Toutes les nouveautés
                    </button>
                </div>
            </div>
        </div>
    );
}
