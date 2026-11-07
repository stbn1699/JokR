/**
 * Popup « XP gagnée aux défis » : à la première visite après la clôture des défis (minuit), si le joueur
 * a fini dans les 50 premiers d'au moins un défi. Détail par jeu (place, XP), total qui défile,
 * puis à la fermeture les boules d'XP partent remplir la barre du header, comme après une victoire.
 *
 * L'XP est déjà ajoutée par le serveur : le header est figé sur la progression d'avant (rewardFx.hold)
 * le temps de la popup, puis s'anime à l'arrivée des boules.
 */

import "./DailyRewardPopup.scss";
import "../SuccessPopup/SuccessPopup.scss";
import {useEffect, useRef} from "react";
import {FaMedal} from "react-icons/fa";
import {useAuth} from "../../Context/authContext.ts";
import {rewardFx} from "../../Services/rewardFx.ts";
import {xpBefore} from "../../Services/leveling.ts";
import type {DailyResultsNotification} from "../../Services/notification.service.ts";
import {confetti} from "../Confetti/Confetti.tsx";
import CountUp from "../SuccessPopup/CountUp.tsx";

type DailyRewardPopupProps = {
    // Résultats non vus qui rapportent de l'XP (souvent un seul jour)
    rewards: DailyResultsNotification[];
    onClose: () => void;
};

const ordinal = (rank: number) => <>{rank}<sup>{rank === 1 ? "er" : "e"}</sup></>;
const dayLabel = (date: string) =>
    new Date(`${date}T12:00:00`).toLocaleDateString("fr-FR", {weekday: "long", day: "numeric", month: "long"});

export default function DailyRewardPopup({rewards, onClose}: DailyRewardPopupProps) {
    const {level, xp, credits} = useAuth();
    const total = rewards.reduce((n, r) => n + (r.data.xp ?? 0), 0);
    const totalRef = useRef<HTMLSpanElement>(null);
    const flewRef = useRef(false);
    const podium = rewards.some(r => r.data.games.some(g => g.rank <= 3));

    // Le header montre la progression d'avant ce gain jusqu'à l'arrivée des boules
    useEffect(() => {
        rewardFx.hold({...xpBefore(level, xp, total), credits});
        if (podium) confetti();
        return () => {
            // Fermée autrement (déconnexion...) : le header reprend ses vraies valeurs
            if (!flewRef.current) rewardFx.release();
        };
        // Une seule fois, à l'ouverture
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const collect = () => {
        flewRef.current = true;
        rewardFx.fly(totalRef.current, null);
        onClose();
    };

    return (
        <div className="modal-overlay success-overlay" role="dialog" aria-modal="true" aria-labelledby="daily-reward-title">
            <div className="modal success-modal daily-reward">
                <h2 id="daily-reward-title">Classements des défis</h2>
                <p className="daily-reward-sub">Ta place finale te rapporte de l'XP !</p>

                {rewards.map(r => (
                    <section key={r.id} className="daily-reward-day">
                        <h3>{dayLabel(r.data.date)}</h3>
                        <ul>
                            {r.data.games.map(g => (
                                <li key={g.code} className={(g.xp ?? 0) === 0 ? "no-xp" : ""}>
                                    <span className={`daily-reward-rank ${g.rank <= 3 ? `podium-${g.rank}` : ""}`}>
                                        {g.rank <= 3 && <FaMedal aria-hidden/>}{ordinal(g.rank)}
                                    </span>
                                    <span className="daily-reward-game">{g.name}<small> · sur {g.total}</small></span>
                                    <span className="daily-reward-xp">{(g.xp ?? 0) > 0 ? `+${g.xp} XP` : "–"}</span>
                                </li>
                            ))}
                        </ul>
                    </section>
                ))}

                <p className="daily-reward-total">
                    <span ref={totalRef}>+<CountUp value={total} delay={350} duration={1100}/> XP</span>
                </p>

                <div className="modal-buttons">
                    <button type="button" className="modal-button" onClick={collect}>Récupérer mes XP</button>
                </div>
            </div>
        </div>
    );
}
