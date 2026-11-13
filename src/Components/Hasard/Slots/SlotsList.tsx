/**
 * Machines à sous (/hasard/machines) : une carte par machine (thème, volatilité, plus gros gain d'une ligne).
 * Les machines sont décrites dans backend/src/utils/slots.ts : en ajouter une, c'est ajouter sa fiche et ses images.
 */

import "../Hasard.scss";
import "./Slots.scss";
import {Link} from "react-router-dom";
import {FaChevronLeft} from "react-icons/fa";
import {SLOT_MACHINES, slotTopPays} from "../../../../backend/src/utils/slots.ts";
import GameCard from "../GameCard.tsx";

export default function SlotsList() {
    return (
        <main className="hasard slots-list">
            <div className="slots-list-head">
                <Link to="/hasard" className="slots-back"><FaChevronLeft aria-hidden/> Hasard</Link>
                <h1>Machines à sous</h1>
            </div>
            <div className="hasard-games">
                {SLOT_MACHINES.map(m => (
                    <GameCard key={m.id} to={`/hasard/machines/${m.id}`} icon={m.icon} name={m.name} text={m.tagline} tags={[
                        {text: `jusqu'à ×${slotTopPays(m).toLocaleString("fr-FR")} par ligne`, kind: "gain"},
                        {text: `volatilité ${m.volatility}`, kind: "live"},
                    ]}/>
                ))}
            </div>
        </main>
    );
}
