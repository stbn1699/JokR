import {useEffect, useState} from "react";
import {FaShareAlt} from "react-icons/fa";
import {type DailyShare, shareDaily} from "../../Services/share.ts";

/**
 * Bouton « Partager » d'un défi du jour réussi (popup de victoire, défi déjà réussi).
 * Menu de partage du téléphone, ou message copié sur ordinateur (« Copié ! » quelques secondes).
 */
export default function ShareButton({share, className = "modal-button share-button"}: { share: DailyShare; className?: string }) {
    const [status, setStatus] = useState<"idle" | "copied" | "failed">("idle");

    useEffect(() => {
        if (status === "idle") return;
        const timer = window.setTimeout(() => setStatus("idle"), 2500);
        return () => window.clearTimeout(timer);
    }, [status]);

    const onClick = async () => {
        const result = await shareDaily(share);
        setStatus(result === "copied" ? "copied" : result === "failed" ? "failed" : "idle");
    };

    return (
        <button type="button" className={`${className} ${status}`} onClick={() => void onClick()}>
            <FaShareAlt aria-hidden/>
            {status === "copied" ? "Copié !" : status === "failed" ? "Impossible de partager" : "Partager"}
        </button>
    );
}
