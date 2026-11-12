import "./Hasard.scss";
import {Link} from "react-router-dom";
import {PLINKO_MAX_MULTIPLIER} from "../../../backend/src/utils/plinko.ts";
import LotteryBanner from "./Lottery/LotteryBanner.tsx";

/**
 * Onglet « Hasard » (/hasard) : les jeux où l'on mise ses crédits.
 * Le Plinko et la roulette ; blackjack, machine à sous… viendront ensuite.
 * En haut, le bandeau des loteries : pas un jeu à choisir, tout le monde y participe en misant.
 */
export default function Hasard() {
    return (
        <main className="hasard">
            <LotteryBanner/>

            <div className="hasard-games">
                <Link to="/hasard/plinko" className="hasard-game">
                    <strong>Plinko</strong>
                    <span>Lâche une bille sur les clous : jusqu'à ×{PLINKO_MAX_MULTIPLIER} ta mise.</span>
                </Link>
                <Link to="/hasard/roulette" className="hasard-game">
                    <strong>Roulette</strong>
                    <span>Roulette européenne : un numéro rapporte 35 fois ta mise.</span>
                </Link>
                <div className="hasard-game soon" aria-disabled>
                    <strong>Et bientôt…</strong>
                    <span>Blackjack, machine à sous…</span>
                </div>
            </div>
        </main>
    );
}
