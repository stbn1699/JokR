import {PLINKO_BETS, PLINKO_ODDS, PLINKO_RISKS, PLINKO_ROWS, PLINKO_TABLES} from "../../../../backend/src/utils/plinko.ts";
import {RISK_LABELS} from "./plinkoRisks.ts";

// Chance d'arriver dans chaque case, du bord vers le centre
const ODDS = PLINKO_ODDS.slice(0, 7).map(p => `${String(p).replace(".", ",")} %`);
const decimal = (n: number) => String(n).replace(".", ",");

export default function PlinkoRules() {
    return (
        <>
            <h3>Le principe</h3>
            <p>
                Choisis ta mise et lâche une bille en haut du plateau. Elle rebondit sur les {PLINKO_ROWS} rangées de clous
                et tombe dans une des cases du bas : le multiplicateur de la case donne ton gain.
            </p>
            <ul>
                <li>Exemple : avec 50 crédits misés, une case ×2 te rend 100 crédits, une case ×0,5 t'en rend 25.</li>
                <li>Mises possibles : {PLINKO_BETS.join(", ")} crédits.</li>
                <li>Tu peux lâcher plusieurs billes à la suite, elles tombent en même temps.</li>
            </ul>

            <h3>Les tableaux</h3>
            <p>Trois tableaux de gains au choix, sur le même plateau : la bille tombe pareil, seuls les multiplicateurs changent.</p>
            <ul>
                <li><strong>{RISK_LABELS.low.name}</strong> : petits multiplicateurs, une bille sur deux rapporte un peu plus que sa mise.</li>
                <li><strong>{RISK_LABELS.medium.name}</strong> : jusqu'à ×{decimal(PLINKO_TABLES.medium[0]!)} sur les bords.</li>
                <li><strong>{RISK_LABELS.high.name}</strong> : ×{decimal(PLINKO_TABLES.high[0]!)} sur les bords mais ×{decimal(PLINKO_TABLES.high[6]!)} au centre : pour gagner, il faut viser les bords.</li>
            </ul>

            <h3>Les cases</h3>
            <p>Plus une case est au bord, plus elle est rare. Le plateau est symétrique.</p>
            <table>
                <thead>
                <tr><th>Case</th>{PLINKO_RISKS.map(r => <th key={r}>{RISK_LABELS[r].name}</th>)}<th>Chance</th></tr>
                </thead>
                <tbody>
                {ODDS.map((odds, i) => (
                    <tr key={i}>
                        <td>{i === 0 ? "Bords" : i === ODDS.length - 1 ? "Centre" : `${i + 1}e depuis le bord`}</td>
                        {PLINKO_RISKS.map(r => <td key={r}>×{decimal(PLINKO_TABLES[r][i]!)}</td>)}
                        <td>{odds}{i < ODDS.length - 1 ? " de chaque côté" : ""}</td>
                    </tr>
                ))}
                </tbody>
            </table>

            <h3>Le hasard</h3>
            <p>
                Chaque chute est une vraie simulation physique : gravité, rebonds et frottements sur les clous. Le serveur tire la
                chute au moment où tu lâches la bille, l'écran la rejoue telle quelle : personne ne peut la prévoir ni la changer.
            </p>
            <p className="rules-note">Sur la durée, chaque tableau rend en moyenne environ 96 % des crédits misés.</p>
        </>
    );
}
