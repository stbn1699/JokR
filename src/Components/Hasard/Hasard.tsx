import "./Hasard.scss";
import {Link} from "react-router-dom";
import {PLINKO_MULTIPLIERS} from "../../../backend/src/utils/plinko.ts";

/**
 * Onglet « Hasard » (/hasard) : les jeux où l'on mise ses crédits.
 * Pour l'instant le Plinko et la roulette ; poker, blackjack, machine à sous… viendront ensuite.
 */
export default function Hasard() {
    return (
        <main className="hasard">
            <h1>Hasard</h1>
            <p>Mise tes crédits et tente ta chance.</p>

            <div className="hasard-games">
                <Link to="/hasard/plinko" className="hasard-game">
                    <strong>Plinko</strong>
                    <span>Lâche une bille sur les clous : jusqu'à ×{Math.max(...PLINKO_MULTIPLIERS)} ta mise.</span>
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
