import {POKER_PAYTABLE} from "../../../../backend/src/utils/poker.ts";

const EXAMPLES: Record<string, string> = {
    royal: "10, valet, dame, roi, as de la même couleur",
    straightFlush: "5 cartes qui se suivent, de la même couleur",
    fourKind: "4 cartes de même valeur",
    fullHouse: "un brelan et une paire",
    flush: "5 cartes de la même couleur",
    straight: "5 cartes qui se suivent (l'as compte aussi pour 1 : as-2-3-4-5)",
    threeKind: "3 cartes de même valeur",
    twoPair: "deux paires",
    jacksOrBetter: "une paire de valets, de dames, de rois ou d'as",
};

export default function PokerRules() {
    return (
        <>
            <h3>Le principe</h3>
            <p>
                Mise, puis reçois 5 cartes d'un jeu de 52. Clique celles que tu veux garder (ou tape 1 à 5), puis tire :
                les autres sont remplacées une seule fois. Ta main finale est payée selon sa combinaison.
            </p>

            <h3>Les gains (× ta mise)</h3>
            <table>
                <thead><tr><th>Combinaison</th><th>Gain</th></tr></thead>
                <tbody>
                    {POKER_PAYTABLE.map(p => (
                        <tr key={p.hand}>
                            <td>{p.name}<br/><span className="rules-note">{EXAMPLES[p.hand]}</span></td>
                            <td>×{p.pays.toLocaleString("fr-FR")}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
            <p className="rules-note">
                Une paire de 10 ou moins ne rapporte rien. En jouant parfaitement, on récupère environ 96 % de ses mises sur
                la durée. Tes mises au poker te donnent aussi des tickets de loterie.
            </p>
        </>
    );
}
