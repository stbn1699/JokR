/**
 * Pile de jetons posée sur le tapis : les vrais jetons posés (images de public/chips), dans l'ordre où ils ont
 * été posés, empilés de bas en haut avec un léger décalage, et le total dans une étiquette au-dessus.
 * Dix jetons de 10 font une haute pile, un jeton de 100 un seul jeton.
 * Placée au point voulu (milieu, bord ou coin d'une case) par `style` ; elle ne capte pas la souris.
 */

import type {CSSProperties} from "react";
import {CHIP_VALUES, chipStack} from "../../../Services/chips.ts";
import {useChipImage} from "../../../Services/chipSets.ts";

type ChipStackProps = {
    // jetons posés, du premier (en bas) au dernier (en haut)
    chips: number[];
    className?: string;
    style?: CSSProperties;
    // jeu de jetons à dessiner (par défaut : celui choisi par le joueur)
    set?: string;
};

// Au-delà, la pile montre les derniers posés (le total reste juste)
const MAX_SHOWN = 12;

const label = (amount: number) => (amount >= 1000 ? `${Math.round(amount / 100) / 10}k` : String(amount));

export default function ChipStack({chips, className = "", style, set}: ChipStackProps) {
    const chipImage = useChipImage(set);
    // un montant qui n'est pas un jeton (ancienne mise) est montré en jetons équivalents
    const real = chips.flatMap(c => (CHIP_VALUES.includes(c as typeof CHIP_VALUES[number]) ? [c] : chipStack(c)));
    const shown = real.slice(-MAX_SHOWN);
    const total = chips.reduce((sum, c) => sum + c, 0);
    return (
        <span className={`chip-stack ${className}`} style={{...style, "--chips": shown.length} as CSSProperties}>
            {shown.map((value, i) => (
                <img key={i} src={chipImage(value)} alt="" draggable={false} style={{"--i": i} as CSSProperties}/>
            ))}
            <span className="chip-stack-total">{label(total)}</span>
        </span>
    );
}
