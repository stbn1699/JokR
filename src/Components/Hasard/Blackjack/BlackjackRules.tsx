import {BLACKJACK_DECKS} from "../../../../backend/src/utils/blackjack.ts";

export default function BlackjackRules() {
    return (
        <>
            <h3>Le but</h3>
            <p>
                Battre le croupier : faire plus que lui sans dépasser 21. Les cartes de 2 à 10 valent leur chiffre, le valet,
                la dame et le roi valent 10, et l'as vaut 11 ou 1 (ce qui t'arrange).
            </p>

            <h3>Les gains</h3>
            <table>
                <thead><tr><th>Résultat</th><th>Tu reçois</th></tr></thead>
                <tbody>
                    <tr><td>Blackjack (as + une carte de valeur 10, d'entrée)</td><td>2,5 × ta mise</td></tr>
                    <tr><td>Main gagnée</td><td>2 × ta mise</td></tr>
                    <tr><td>Égalité</td><td>ta mise</td></tr>
                    <tr><td>Main perdue, ou plus de 21</td><td>rien</td></tr>
                </tbody>
            </table>

            <h3>Tes coups</h3>
            <ul>
                <li><strong>Tirer</strong> : une carte de plus.</li>
                <li><strong>Rester</strong> : tu gardes ta main, au croupier de jouer.</li>
                <li><strong>Doubler</strong> : sur tes deux premières cartes, tu doubles ta mise et reçois une seule carte.</li>
                <li>
                    <strong>Séparer</strong> : avec deux cartes de même valeur, tu en fais deux mains (même mise sur la deuxième).
                    Une seule fois par partie ; deux as séparés reçoivent une carte chacun, et 21 après une séparation
                    n'est pas un blackjack.
                </li>
            </ul>

            <h3>Le croupier</h3>
            <ul>
                <li>Il tire jusqu'à 17 et s'arrête sur tous les 17.</li>
                <li>
                    Quand il montre un as ou une carte de valeur 10, il regarde sa carte cachée : s'il a blackjack, la partie
                    s'arrête tout de suite et tu ne perds que ta mise de départ.
                </li>
            </ul>
            <p className="rules-note">
                {BLACKJACK_DECKS} jeux de 52 cartes, mélangés à chaque partie. En jouant parfaitement, on récupère environ
                99,5 % de ses mises sur la durée. Tes mises au blackjack te donnent aussi des tickets de loterie.
            </p>
        </>
    );
}
