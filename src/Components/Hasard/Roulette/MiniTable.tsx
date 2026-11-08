/**
 * Petit tapis des mises de toute la table (panneau « Mises du tour ») : les jetons de tous les joueurs,
 * additionnés par mise, apparaissent à mesure que les gens misent (y compris à cheval et en carré).
 * Mes jetons sont entourés d'or ; une fois la bille posée, le numéro sorti et les mises gagnantes s'allument.
 * Toujours à l'horizontale, en lecture seule.
 */

import type {CSSProperties} from "react";
import type {RoulettePlayer} from "../../../Services/casino.service.ts";
import {rouletteRule} from "../../../../backend/src/utils/roulette.ts";
import {anchorOf, CELLS, type Dir, markerStyle, numberOf} from "./rouletteLayout.ts";
import ChipStack from "./ChipStack.tsx";

type MiniTableProps = {
    players: RoulettePlayer[];
    // numéro sorti, une fois la bille posée
    drawn: number | null;
};

const GAP = 2;

export default function MiniTable({players, drawn}: MiniTableProps) {
    // jetons de toute la table, empilés par mise
    const totals = new Map<string, { chips: number[]; mine: boolean }>();
    for (const p of players) {
        for (const b of p.bets) {
            const t = totals.get(b.key) ?? {chips: [], mine: false};
            totals.set(b.key, {chips: [...t.chips, ...b.chips ?? [b.amount]], mine: t.mine || p.mine});
        }
    }
    // rangés par case d'ancrage (une mise à cheval ou en carré se dessine sur le bord ou le coin d'une case)
    const markers = new Map<string, { key: string; dir: Dir; chips: number[]; mine: boolean }[]>();
    for (const [key, t] of totals) {
        const {cell, dir} = anchorOf(key, false);
        markers.set(cell, [...markers.get(cell) ?? [], {key, dir, ...t}]);
    }

    return (
        <div className="mini-table" aria-hidden>
            {CELLS.map(({key, label, className, place}) => (
                <div key={key} className={`mt-cell ${className} ${drawn !== null && numberOf(key) === drawn ? "drawn" : ""}`}
                     style={{"--hr": place.hr, "--hc": place.hc} as CSSProperties}>
                    <span>{label}</span>
                    {markers.get(key)?.map(m => {
                        const win = drawn !== null && rouletteRule(m.key)?.wins(drawn);
                        return (
                            <ChipStack key={m.key} chips={m.chips} style={markerStyle(m.dir, GAP)}
                                       className={`mt-stack ${m.mine ? "mine" : ""} ${win ? "win" : ""} ${drawn !== null && !win ? "lost" : ""}`}/>
                        );
                    })}
                </div>
            ))}
        </div>
    );
}
