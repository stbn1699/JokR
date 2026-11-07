/**
 * Stylo du header (à côté des notifications) : les personnalisations que le joueur a,
 * à appliquer d'un clic. Pour l'instant le fond du site : fond par défaut, couleurs de niveau
 * débloquées et dégradés achetés. Un lien mène à la boutique pour en avoir d'autres.
 */

import "./Customize.scss";
import {useEffect, useRef, useState} from "react";
import {Link} from "react-router-dom";
import {FaCheck, FaPen, FaTimes} from "react-icons/fa";
import {useAuth} from "../../Context/authContext.ts";
import {ApiError} from "../../api/api.ts";
import {shopService} from "../../Services/shop.service.ts";
import {DEFAULT_BACKGROUND, gradientCss, usableBackgrounds} from "../../Services/shopCatalog.ts";

export default function CustomizeButton() {
    const auth = useAuth();
    const [open, setOpen] = useState(false);
    const [owned, setOwned] = useState<string[]>([]);
    const [pending, setPending] = useState<string | null | undefined>(undefined);
    const [error, setError] = useState<string | null>(null);
    const rootRef = useRef<HTMLDivElement>(null);

    // Objets possédés, relus à chaque ouverture (un achat a pu se faire entre-temps)
    useEffect(() => {
        if (!open) return;
        const controller = new AbortController();
        shopService.state(controller.signal).then(s => setOwned(s.owned)).catch(() => undefined);

        const onClick = (e: MouseEvent) => {
            if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
        };
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") setOpen(false);
        };
        document.addEventListener("mousedown", onClick);
        document.addEventListener("keydown", onKey);
        return () => {
            controller.abort();
            document.removeEventListener("mousedown", onClick);
            document.removeEventListener("keydown", onKey);
        };
    }, [open]);

    async function apply(id: string | null) {
        if (id === auth.background || pending !== undefined) return;
        setPending(id);
        setError(null);
        try {
            await shopService.setBackground(id);
            auth.setBackground(id);
        } catch (err) {
            setError(err instanceof ApiError ? err.message : "Une erreur est survenue, réessaie.");
        } finally {
            setPending(undefined);
        }
    }

    const backgrounds = usableBackgrounds(owned, auth.level);

    return (
        <div className="notifications customize" ref={rootRef}>
            <button type="button" className="notif-bell" aria-label="Personnalisation" title="Personnalisation"
                    aria-expanded={open} onClick={() => setOpen(o => !o)}>
                <FaPen aria-hidden/>
            </button>

            {open && (
                <div className="notif-panel customize-panel" role="dialog" aria-label="Personnalisation">
                    <div className="notif-panel-head">
                        <strong>Personnalisation</strong>
                        <button type="button" className="notif-close" aria-label="Fermer" onClick={() => setOpen(false)}>
                            <FaTimes aria-hidden/>
                        </button>
                    </div>

                    <div className="customize-body">
                        <h3>Fond du site</h3>
                        <div className="customize-swatches">
                            {backgrounds.map(gr => {
                                const id = gr === DEFAULT_BACKGROUND ? null : gr.id;
                                const worn = id === auth.background;
                                return (
                                    <button key={gr.id} type="button" title={gr.name} aria-pressed={worn}
                                            className={`customize-swatch ${worn ? "worn" : ""} ${pending === id ? "pending" : ""}`}
                                            onClick={() => apply(id)}>
                                        <span className="customize-swatch-color" style={{background: gradientCss(gr)}}>
                                            {worn && <FaCheck aria-hidden/>}
                                        </span>
                                        <span>{gr.name}</span>
                                    </button>
                                );
                            })}
                        </div>
                        {error && <p className="customize-error" role="alert">{error}</p>}
                        <Link to="/boutique/fonds/degrades" className="customize-shop" onClick={() => setOpen(false)}>
                            Plus de fonds dans la boutique
                        </Link>
                    </div>
                </div>
            )}
        </div>
    );
}
