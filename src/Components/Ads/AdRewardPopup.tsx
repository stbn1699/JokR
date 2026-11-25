/**
 * Popup « Obtenir plus de crédits » : vérifie d'abord qu'aucun bloqueur de pubs n'est actif, puis propose de
 * regarder une pub (+perAd crédits, perDay fois par jour). Pub regardée : le gain s'affiche, et à la fermeture
 * les pièces volent jusqu'aux crédits du header (qui reste sur l'ancien solde jusque-là).
 */

import "../SuccessPopup/SuccessPopup.scss";
import "../Notifications/DailyRewardPopup.scss";
import {useEffect, useRef, useState} from "react";
import {FaCoins, FaPlayCircle} from "react-icons/fa";
import {useAuth} from "../../Context/authContext.ts";
import {adsService, detectAdBlock, type AdOutcome, type AdRewardStatus} from "../../Services/ads.service.ts";
import {rewardFx} from "../../Services/rewardFx.ts";
import {ApiError} from "../../api/api.ts";

const OUTCOME_MESSAGE: Record<Exclude<AdOutcome, "viewed">, string> = {
    dismissed: "Pub fermée avant la fin : pas de crédits cette fois.",
    unavailable: "Pas de pub disponible pour l'instant, réessaie un peu plus tard.",
    blocked: "Ton bloqueur de pubs empêche la pub de s'afficher.",
};

type Phase = "checking" | "blocked" | "ready" | "watching" | "won";

type AdRewardPopupProps = {
    status: AdRewardStatus;
    onStatus: (status: AdRewardStatus) => void;
    onClose: () => void;
};

export default function AdRewardPopup({status, onStatus, onClose}: AdRewardPopupProps) {
    const auth = useAuth();
    const [phase, setPhase] = useState<Phase>("checking");
    const [message, setMessage] = useState<string | null>(null);
    const [won, setWon] = useState(0);
    const wonRef = useRef<HTMLSpanElement>(null);
    // header figé sur l'ancien solde, en attendant que les pièces volent
    const heldRef = useRef(false);

    // « Vérifier à nouveau » (après avoir coupé le bloqueur)
    const check = async () => {
        setPhase("checking");
        setMessage(null);
        setPhase(await detectAdBlock() ? "blocked" : "ready");
    };

    useEffect(() => {
        let alive = true;
        detectAdBlock().then(blocked => alive && setPhase(blocked ? "blocked" : "ready"));
        // Fermée sans faire voler les pièces : le header reprend ses vraies valeurs
        return () => {
            alive = false;
            if (heldRef.current) rewardFx.release();
        };
    }, []);

    const close = () => {
        if (heldRef.current) {
            heldRef.current = false;
            rewardFx.fly(null, wonRef.current);
        }
        onClose();
    };

    const watch = async () => {
        setPhase("watching");
        setMessage(null);
        try {
            const {ticket} = await adsService.start();
            const outcome = await adsService.show(status);
            if (outcome !== "viewed") {
                setMessage(OUTCOME_MESSAGE[outcome]);
                setPhase(outcome === "blocked" ? "blocked" : "ready");
                return;
            }
            const claim = await adsService.claim(ticket);
            onStatus({...status, left: claim.left});
            if (claim.creditsWon > 0 && !heldRef.current) {
                rewardFx.hold({...auth.account});
                heldRef.current = true;
            }
            auth.setCredits(claim.credits);
            setWon(n => n + claim.creditsWon);
            setPhase("won");
        } catch (e) {
            setMessage(e instanceof ApiError ? e.message : "La pub n'a pas pu se lancer.");
            if (e instanceof ApiError && e.status === 409) onStatus({...status, left: 0});
            setPhase("ready");
        }
    };

    const none = status.left <= 0;
    const s = status.left > 1 ? "s" : "";

    return (
        <div className="modal-overlay success-overlay" role="dialog" aria-modal="true" aria-labelledby="ad-reward-title"
             onClick={e => e.target === e.currentTarget && phase !== "watching" && close()}>
            <div className="modal success-modal daily-reward welcome ad-reward-popup">
                <h2 id="ad-reward-title">Obtenir plus de crédits</h2>

                {won > 0 ? (
                    <p className="daily-reward-total welcome-total">
                        <span ref={wonRef}><FaCoins aria-hidden/> +{won} crédits</span>
                    </p>
                ) : (
                    <p className="daily-reward-sub">
                        Regarde une pub jusqu'au bout et gagne <b>{status.perAd} crédits</b>.
                    </p>
                )}

                <p className="ad-reward-left">
                    {none ? "Plus de pub aujourd'hui, reviens demain !"
                        : `Encore ${status.left} pub${s} possible${s} aujourd'hui (sur ${status.perDay})`}
                </p>

                {phase === "blocked" && (
                    <p className="ad-reward-alert" role="alert">
                        Un bloqueur de pubs est activé. Désactive-le pour JokR (ou ajoute le site à sa liste
                        blanche), puis vérifie à nouveau.
                    </p>
                )}
                {message && phase !== "blocked" && <p className="ad-reward-alert" role="alert">{message}</p>}

                <div className="modal-buttons">
                    {phase === "blocked" ? (
                        <button type="button" className="modal-button" onClick={() => void check()}>Vérifier à nouveau</button>
                    ) : !none && (
                        <button type="button" className="modal-button" disabled={phase === "checking" || phase === "watching"}
                                onClick={() => void watch()}>
                            <FaPlayCircle aria-hidden/>{" "}
                            {phase === "checking" ? "Vérification…" : phase === "watching" ? "Pub en cours…"
                                : won > 0 ? "Encore une pub" : "Regarder une pub"}
                        </button>
                    )}
                    <button type="button" className="modal-button secondary" disabled={phase === "watching"} onClick={close}>
                        {won > 0 ? "Récupérer" : "Fermer"}
                    </button>
                </div>
            </div>
        </div>
    );
}
