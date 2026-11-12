import {LOTTERY_PERCENT, LOTTERY_TICKET_CREDITS} from "../../../../backend/src/utils/lottery.ts";

export default function LotteryRules() {
    return (
        <>
            <h3>Le principe</h3>
            <p>
                Trois loteries tournent en même temps : une du jour, une de la semaine et une du mois. Tu n'as rien à
                acheter : tes mises au Plinko et à la roulette te donnent des tickets.
            </p>
            <ul>
                <li>Chaque tranche de {LOTTERY_TICKET_CREDITS} crédits misés sur la période te donne un ticket, dans les trois loteries à la fois.</li>
                <li>Au tirage, un ticket gagnant est tiré au sort parmi tous ceux de la période : plus tu as de tickets, plus tu as de chances.</li>
                <li>
                    Le gagnant remporte la cagnotte : {LOTTERY_PERCENT.day} % de tous les crédits misés par tout le monde
                    sur la période (jour, semaine ou mois). Il est prévenu par une notification.
                </li>
            </ul>

            <h3>Les tirages</h3>
            <ul>
                <li><strong>Jour</strong> : chaque soir à 23 h 59.</li>
                <li><strong>Semaine</strong> : le dimanche à 23 h 59.</li>
                <li><strong>Mois</strong> : le dernier jour du mois à 23 h 59.</li>
            </ul>
            <p>Après un tirage, tout repart de zéro : les mises suivantes comptent pour la période d'après.</p>
        </>
    );
}
