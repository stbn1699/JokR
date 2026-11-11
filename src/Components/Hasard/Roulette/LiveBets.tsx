/**
 * Mises du tour de roulette en cours, pour toute la table : un petit tapis où les jetons de tout le monde
 * apparaissent, puis qui mise sur quoi et combien, et le total du tour.
 * Les lignes arrivent en glissant, un total qui change rebondit ; une fois la bille posée, chaque ligne
 * affiche le gain (ou « perdu »).
 */

import Avatar from "../../Avatar/Avatar.tsx";
import MiniTable from "./MiniTable.tsx";
import type {RoulettePlayer} from "../../../Services/casino.service.ts";
import {betLabel} from "./betLabels.ts";

type LiveBetsProps = {
    players: RoulettePlayer[];
    // gains affichés une fois la bille posée
    revealed: boolean;
    // numéro sorti, une fois la bille posée
    drawn: number | null;
};

export default function LiveBets({players, revealed, drawn}: LiveBetsProps) {
    const sorted = [...players].sort((a, b) => b.total - a.total);
    const pot = players.reduce((sum, p) => sum + p.total, 0);

    return (
        <section className="live-bets" aria-label="Mises du tour">
            <div className="live-bets-head">
                <strong>Mises du tour</strong>
                <span>
                    {players.length === 0 ? "Personne pour l'instant"
                        : `${players.length} joueur${players.length > 1 ? "s" : ""} · `}
                    {players.length > 0 && <b key={pot} className="live-bets-pot">{pot} crédits</b>}
                </span>
            </div>
            <MiniTable players={players} drawn={drawn}/>
            {sorted.length > 0 && (
                <ul className="live-bets-list">
                    {sorted.map(p => {
                        const net = p.payout === null ? 0 : p.payout - p.total;
                        return (
                            <li key={p.username} className={`live-bet ${p.mine ? "mine" : ""}`}>
                                <Avatar seed={p.avatar} fallback={p.username} size={2} level={p.level}/>
                                <div className="live-bet-main">
                                    <span className="live-bet-name">{p.username}{p.mine && <em> (toi)</em>}</span>
                                    <span className="live-bet-chips">
                                        {p.bets.map(b => <span key={b.key} className="live-bet-chip">{betLabel(b.key)} <b>{b.amount}</b></span>)}
                                    </span>
                                </div>
                                {revealed && p.payout !== null ? (
                                    <span key="result" className={`live-bet-result ${p.payout > 0 ? "win" : "loss"}`}>
                                        {p.payout > 0 ? `+${p.payout}` : "perdu"}
                                        {p.payout > 0 && net !== p.payout && <small>{net >= 0 ? `+${net}` : net} net</small>}
                                    </span>
                                ) : (
                                    <span key={p.total} className="live-bet-total">{p.total}</span>
                                )}
                            </li>
                        );
                    })}
                </ul>
            )}
        </section>
    );
}
