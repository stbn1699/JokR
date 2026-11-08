import {
    ROULETTE_BETTING_MS,
    ROULETTE_CHIPS,
    ROULETTE_MAX_PER_BET,
    ROULETTE_MAX_TOTAL,
    ROULETTE_ROUND_MS,
} from "../../../../backend/src/utils/roulette.ts";

const BETS = [
    {name: "Un numéro (0 à 36)", covers: "1 numéro", pays: "35 fois la mise"},
    {name: "À cheval (entre 2 numéros)", covers: "2 numéros", pays: "17 fois la mise"},
    {name: "Carré (au coin de 4 numéros)", covers: "4 numéros", pays: "8 fois la mise"},
    {name: "Douzaine (1-12, 13-24, 25-36)", covers: "12 numéros", pays: "2 fois la mise"},
    {name: "Colonne (2:1)", covers: "12 numéros", pays: "2 fois la mise"},
    {name: "Rouge ou noir", covers: "18 numéros", pays: "1 fois la mise"},
    {name: "Pair ou impair", covers: "18 numéros", pays: "1 fois la mise"},
    {name: "1-18 ou 19-36", covers: "18 numéros", pays: "1 fois la mise"},
];

export default function RouletteRules() {
    return (
        <>
            <h3>Le principe</h3>
            <p>
                La roulette est en direct : une seule table pour tout le monde, qui tourne toutes
                les {ROULETTE_ROUND_MS / 1000} secondes, même quand personne ne joue. Pendant les {ROULETTE_BETTING_MS / 1000} premières
                secondes de chaque tour, pose tes jetons sur le tapis ; puis la roue est lancée et la bille s'arrête sur un numéro :
                chaque mise qui couvre ce numéro est gagnante, les autres sont perdues.
            </p>
            <ul>
                <li>Jetons : {ROULETTE_CHIPS.join(", ")} crédits. Plusieurs jetons sur la même mise s'additionnent.
                    Un jeton grisé est plus cher que ce qu'il te reste.</li>
                <li>
                    Clique sur le bord entre deux numéros pour miser à cheval sur les deux, ou sur le coin entre quatre numéros
                    pour un carré. Au survol, un rond gris montre où le jeton sera posé et les numéros couverts s'allument.
                </li>
                <li>Chaque jeton est misé tout de suite : les crédits sont retirés et ta mise apparaît dans « Mises du tour »,
                    visible par toute la table.</li>
                <li>« Retirer mes jetons » te rend tous tes jetons du tour, tant que les mises sont ouvertes. « Reproduire ma mise »
                    repose les mêmes jetons qu'à ton dernier tour joué.</li>
                <li>Tes gains sont crédités à la fin du tour, même si tu as quitté la page.</li>
            </ul>

            <h3>Les mises</h3>
            <table>
                <thead>
                <tr><th>Mise</th><th>Couvre</th><th>Gain</th></tr>
                </thead>
                <tbody>
                {BETS.map(b => <tr key={b.name}><td>{b.name}</td><td>{b.covers}</td><td>{b.pays}</td></tr>)}
                </tbody>
            </table>
            <p>Une mise gagnante te rend aussi ta mise : 10 crédits sur le 17 qui sort, c'est 350 de gain plus tes 10 crédits.</p>

            <h3>Le zéro</h3>
            <p>
                La roue est européenne : 37 cases, de 0 à 36. Le zéro (vert) n'est ni rouge ni noir, ni pair ni impair :
                quand il sort, toutes les mises sont perdues sauf celles qui couvrent le 0 (le 0 seul, ou à cheval avec le 1, le 2 ou le 3).
            </p>

            <h3>Limites</h3>
            <ul>
                <li>{ROULETTE_MAX_PER_BET.toLocaleString("fr-FR")} crédits au plus sur une même case.</li>
                <li>{ROULETTE_MAX_TOTAL.toLocaleString("fr-FR")} crédits au plus par tour.</li>
            </ul>
            <p className="rules-note">
                Le numéro est tiré par le serveur à la fermeture des mises, le même pour tout le monde. Sur la durée, la roulette rend en moyenne 97,3 % des crédits misés
                (36 sur 37), quelle que soit la mise.
            </p>
        </>
    );
}
