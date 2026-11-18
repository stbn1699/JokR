import {KENO_BASE_PICKS, KENO_DRAWN, KENO_MAX_PICKS, KENO_NUMBERS, KENO_PAYTABLE, kenoChance} from "../../../../backend/src/utils/keno.ts";

const fr = (n: number) => n.toLocaleString("fr-FR");

// Une chance sur combien (« 1 sur 4 », « 1 sur 850 000 »)
function oneIn(p: number): string {
    const n = 1 / p;
    if (n < 10) return `1 sur ${fr(Math.round(n * 10) / 10)}`;
    const digits = Math.max(0, Math.floor(Math.log10(n)) - 1);
    return `1 sur ${fr(Math.round(n / 10 ** digits) * 10 ** digits)}`;
}

export default function KenoRules() {
    return (
        <>
            <h3>Le principe</h3>
            <p>
                Choisis de 1 à {KENO_BASE_PICKS} numéros entre 1 et {KENO_NUMBERS} (jusqu'à {KENO_MAX_PICKS} avec l'amélioration
                « Numéros cochés » de la boutique), puis lance le tirage : {KENO_DRAWN} numéros
                sortent. Plus tu en trouves, plus tu gagnes. Le tableau dépend du nombre de numéros choisis : avec peu de
                numéros on gagne plus souvent, avec beaucoup on vise les gros gains (jusqu'à ×10 000).
            </p>

            <h3>Les gains (× ta mise)</h3>
            <table>
                <thead><tr><th>Choisis</th><th>Trouvés</th><th>Gain</th></tr></thead>
                <tbody>
                    {Object.entries(KENO_PAYTABLE).flatMap(([picks, row]) => Object.entries(row).reverse().map(([hits, m], i) => (
                        <tr key={`${picks}-${hits}`}>
                            <td>{i === 0 ? picks : ""}</td>
                            <td>{hits} <span className="rules-note">({oneIn(kenoChance(Number(picks), Number(hits)))})</span></td>
                            <td>×{fr(m)}</td>
                        </tr>
                    )))}
                </tbody>
            </table>
            <p className="rules-note">
                Chaque tableau rend environ 95 % des mises sur la durée. Tes mises au Keno te donnent aussi des tickets de loterie.
            </p>
        </>
    );
}
