import {PLINKO_BETS, PLINKO_MULTIPLIERS, PLINKO_ODDS, PLINKO_ROWS} from "../../../../backend/src/utils/plinko.ts";

// Chance d'arriver dans chaque case, du bord vers le centre
const ODDS = PLINKO_ODDS.slice(0, 7).map(p => `${String(p).replace(".", ",")} %`);

export default function PlinkoRules() {
    // une moitié du plateau suffit : il est symétrique
    const half = PLINKO_MULTIPLIERS.slice(0, ODDS.length);
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

            <h3>Les cases</h3>
            <p>Plus une case est au bord, plus elle rapporte, et plus elle est rare. Le plateau est symétrique.</p>
            <table>
                <thead>
                <tr><th>Case</th><th>Gain</th><th>Chance</th></tr>
                </thead>
                <tbody>
                {half.map((m, i) => (
                    <tr key={i}>
                        <td>{i === 0 ? "Bords" : i === half.length - 1 ? "Centre" : `${i + 1}e depuis le bord`}</td>
                        <td>×{String(m).replace(".", ",")}</td>
                        <td>{ODDS[i]}{i < half.length - 1 ? " de chaque côté" : ""}</td>
                    </tr>
                ))}
                </tbody>
            </table>

            <h3>Le hasard</h3>
            <p>
                Chaque chute est une vraie simulation physique : gravité, rebonds et frottements sur les clous. Le serveur tire la
                chute au moment où tu lâches la bille, l'écran la rejoue telle quelle : personne ne peut la prévoir ni la changer.
            </p>
            <p className="rules-note">Sur la durée, le Plinko rend en moyenne environ 96 % des crédits misés.</p>
        </>
    );
}
