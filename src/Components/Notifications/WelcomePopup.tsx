/**
 * Popup « Bienvenue » : à la première connexion d'un nouveau compte, elle annonce le cadeau de bienvenue
 * (crédits déjà ajoutés par le serveur à la création du compte, voir la notification « welcome »).
 * Le header reste sur l'ancien solde (rewardFx.hold) le temps de la popup ; à « Récupérer », les particules
 * partent vers les crédits du header, comme après une victoire.
 */

import "./DailyRewardPopup.scss";
import "../SuccessPopup/SuccessPopup.scss";
import {useEffect, useRef} from "react";
import {FaCoins, FaGift} from "react-icons/fa";
import {useAuth} from "../../Context/authContext.ts";
import {rewardFx} from "../../Services/rewardFx.ts";
import {confetti} from "../Confetti/Confetti.tsx";
import CountUp from "../SuccessPopup/CountUp.tsx";

type WelcomePopupProps = {
    credits: number;
    onClose: () => void;
};

export default function WelcomePopup({credits, onClose}: WelcomePopupProps) {
    const auth = useAuth();
    const totalRef = useRef<HTMLSpanElement>(null);
    const flewRef = useRef(false);

    // Le header montre le solde d'avant le cadeau jusqu'à l'arrivée des particules
    useEffect(() => {
        rewardFx.hold({level: auth.level, xp: auth.xp, credits: Math.max(0, auth.credits - credits)});
        confetti();
        return () => {
            if (!flewRef.current) rewardFx.release();
        };
        // Une seule fois, à l'ouverture
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const collect = () => {
        flewRef.current = true;
        rewardFx.fly(null, totalRef.current);
        onClose();
    };

    return (
        <div className="modal-overlay success-overlay" role="dialog" aria-modal="true" aria-labelledby="welcome-title">
            <div className="modal success-modal daily-reward welcome">
                <FaGift className="welcome-gift" aria-hidden/>
                <h2 id="welcome-title">Bienvenue{auth.username ? `, ${auth.username}` : ""} !</h2>
                <p className="daily-reward-sub">Voici un cadeau de bienvenue à dépenser comme tu veux : jeux de hasard, boutique…</p>

                <p className="daily-reward-total welcome-total">
                    <span ref={totalRef}><FaCoins aria-hidden/> +<CountUp value={credits} delay={300} duration={1100}/> crédits</span>
                </p>

                <div className="modal-buttons">
                    <button type="button" className="modal-button" onClick={collect}>Récupérer mes crédits</button>
                </div>
            </div>
        </div>
    );
}
