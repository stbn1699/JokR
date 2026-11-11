/**
 * Bulle « mes mises de ce tour » : s'affiche au survol d'un numéro entouré d'or de l'historique
 * (au doigt : un appui l'ouvre, un autre la ferme). Un petit tapis montre mes jetons là où je les avais posés
 * (le numéro sorti s'allume, les mises gagnantes aussi), puis le détail par mise, le total misé et le gain.
 * Placée sous le numéro, dans l'écran ; elle ne capte pas la souris.
 */

import type {CSSProperties} from "react";
import {createPortal} from "react-dom";
import {FaCoins} from "react-icons/fa";
import type {RouletteMyRound} from "../../../Services/casino.service.ts";
import {rouletteColor, rouletteRule} from "../../../../backend/src/utils/roulette.ts";
import MiniTable from "./MiniTable.tsx";
import {betLabel} from "./betLabels.ts";

const COLOR_NAMES = {red: "rouge", black: "noir", green: "vert"} as const;

// largeur de la bulle (px) et marge avec les bords de l'écran
const WIDTH = 520;
const MARGIN = 8;

type RoundDetailProps = {
    round: RouletteMyRound;
    // position du numéro survolé dans l'écran
    anchor: DOMRect;
};

export default function RoundDetail({round, anchor}: RoundDetailProps) {
    const bets = round.bets ?? [];
    const width = Math.min(WIDTH, window.innerWidth - 2 * MARGIN);
    const left = Math.max(MARGIN, Math.min(anchor.left + anchor.width / 2 - width / 2, window.innerWidth - width - MARGIN));

    return createPortal(
        <div className="round-detail" role="tooltip" style={{top: anchor.bottom + MARGIN, left, width} as CSSProperties}>
            <p className="round-detail-title">
                Tes mises · le <span className={`round-detail-number ${rouletteColor(round.number)}`}>{round.number}</span>
                {" "}{COLOR_NAMES[rouletteColor(round.number)]} est sorti
            </p>
            <MiniTable players={[{username: "", avatar: "", level: 0, mine: true, total: round.bet, payout: round.payout, bets}]}
                       drawn={round.number}/>
            <div className="round-detail-bets">
                {bets.map(b => (
                    <span key={b.key} className={rouletteRule(b.key)?.wins(round.number) ? "win" : ""}>
                        {betLabel(b.key)} <b>{b.amount}</b>
                    </span>
                ))}
            </div>
            <p className="round-detail-sum">
                <span>Mise <b><FaCoins aria-hidden/> {round.bet}</b></span>
                <span className={round.payout > 0 ? "win" : "loss"}>{round.payout > 0 ? `Gain +${round.payout}` : "Perdu"}</span>
            </p>
        </div>,
        document.body,
    );
}
