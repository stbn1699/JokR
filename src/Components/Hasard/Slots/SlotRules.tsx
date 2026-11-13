import {SLOT_PATTERNS, SLOT_ROWS, type SlotMachine, slotPaytable} from "../../../../backend/src/utils/slots.ts";
import {LINE_COLORS} from "./slotColors.ts";

const VOLATILITY: Record<SlotMachine["volatility"], string> = {
    faible: "souvent de petits gains",
    moyenne: "un peu des deux",
    forte: "des gains plus rares mais bien plus gros",
};

const pays = (n: number) => `×${n.toLocaleString("fr-FR")}`;

// Petit schéma d'une ligne de gain : la grille et le tracé (en couleur si la ligne est jouée)
function LineDiagram({index, reels, played}: { index: number; reels: number; played: boolean }) {
    const rows = SLOT_PATTERNS[index]!.slice(0, reels);
    return (
        <figure className={`slot-line-diagram ${played ? "played" : ""}`}>
            <svg viewBox={`0 0 ${reels * 20} ${SLOT_ROWS * 20}`} aria-hidden>
                {rows.map((_, reel) => Array.from({length: SLOT_ROWS}, (__, row) => (
                    <rect key={`${reel}-${row}`} x={reel * 20 + 1} y={row * 20 + 1} width="18" height="18" rx="3"
                          className={rows[reel] === row ? "on" : ""} style={rows[reel] === row && played ? {fill: LINE_COLORS[index]} : undefined}/>
                )))}
            </svg>
            <figcaption>{index + 1}</figcaption>
        </figure>
    );
}

export default function SlotRules({machine, reels, lines}: { machine: SlotMachine; reels: number; lines: number }) {
    const table = slotPaytable(machine, reels);
    const wild = machine.symbols.find(s => s.wild);
    const counts = Array.from({length: reels - 2}, (_, i) => i + 3);
    return (
        <>
            <h3>Le principe</h3>
            <p>
                Choisis ta mise, le nombre de colonnes (3, 4 ou 5 rouleaux) et le nombre de lignes de gain, puis lance.
                Ta mise est partagée entre les lignes jouées.
            </p>
            <ul>
                <li>Une ligne gagne avec au moins 3 symboles identiques à la suite, en partant de la colonne de gauche.
                    Avec 4 ou 5 colonnes, 4 ou 5 identiques paient beaucoup plus.</li>
                <li>Le gain d'une ligne est son multiplicateur fois sa part de la mise. Plusieurs lignes peuvent gagner
                    sur le même lancer : leurs gains s'additionnent.</li>
                {wild && <li><strong>{wild.name}</strong> remplace n'importe quel symbole. Une ligne entière de jokers
                    paie {pays(table[wild.id]![0]!)}.</li>}
            </ul>

            <h3>Combien de lignes ?</h3>
            <ul>
                <li><strong>1 ligne</strong> : toute ta mise est sur elle. Tu gagnes rarement, mais gros quand ça tombe.</li>
                <li><strong>10 lignes</strong> : ta mise est répartie, tu gagnes souvent, mais de petites sommes.</li>
                <li>En moyenne, ça revient au même : seul le rythme des gains change.</li>
            </ul>

            <h3>Les lignes de gain ({reels} colonnes)</h3>
            <p>Les lignes jouées ({lines}) sont en couleur ; ce sont toujours les premières de la liste.</p>
            <div className="slot-line-diagrams">
                {SLOT_PATTERNS.map((_, i) => <LineDiagram key={i} index={i} reels={reels} played={i < lines}/>)}
            </div>

            <h3>Les gains de la machine {machine.name} ({reels} colonnes)</h3>
            <table className="slot-paytable">
                <thead>
                <tr>
                    <th>Symbole</th>
                    {counts.map(k => <th key={k}>{k} identiques</th>)}
                </tr>
                </thead>
                <tbody>
                {[...machine.symbols].sort((a, b) => b.base - a.base).map(s => (
                    <tr key={s.id}>
                        <td><img src={s.image} alt="" draggable={false}/> {s.name}</td>
                        {s.wild
                            ? <td colSpan={counts.length}>{pays(table[s.id]![0]!)} (toute la ligne)</td>
                            : counts.map((k, i) => <td key={k}>{pays(table[s.id]![i]!)}</td>)}
                    </tr>
                ))}
                </tbody>
            </table>

            <h3>Bon à savoir</h3>
            <ul>
                <li>Volatilité {machine.volatility} : {VOLATILITY[machine.volatility]}.</li>
                <li>Quels que soient les colonnes et les lignes, la machine rend en moyenne environ 96 % des mises,
                    sur un grand nombre de lancers.</li>
                <li>Tes mises comptent pour les loteries : 10 crédits misés = 1 ticket.</li>
            </ul>
        </>
    );
}
