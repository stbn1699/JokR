/**
 * Bouton « Obtenir plus de crédits » : ouvre la popup des pubs récompensées (regarder une pub rapporte des
 * crédits, quelques fois par jour, voir Services/ads.service.ts). Dans la bulle des crédits du header et en haut
 * de la boutique. Pubs indisponibles sur ce serveur : rien n'est affiché.
 */

import "./AdRewardButton.scss";
import {useEffect, useState} from "react";
import {createPortal} from "react-dom";
import {FaPlayCircle} from "react-icons/fa";
import {adsService, type AdRewardStatus} from "../../Services/ads.service.ts";
import AdRewardPopup from "./AdRewardPopup.tsx";

export default function AdRewardButton() {
    const [status, setStatus] = useState<AdRewardStatus | null>(null);
    const [open, setOpen] = useState(false);

    useEffect(() => {
        const controller = new AbortController();
        adsService.status(controller.signal).then(setStatus).catch(() => undefined);
        return () => controller.abort();
    }, []);

    if (!status?.enabled) return null;

    return (
        <>
            <button type="button" className="ad-reward-button" onClick={() => setOpen(true)}>
                <FaPlayCircle aria-hidden/>
                Obtenir plus de crédits
            </button>
            {open && createPortal(
                <AdRewardPopup status={status} onStatus={setStatus} onClose={() => setOpen(false)}/>,
                document.body,
            )}
        </>
    );
}
