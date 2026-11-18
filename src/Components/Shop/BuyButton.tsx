import {FaCoins} from "react-icons/fa";

// Bouton d'achat de la boutique : le prix, ou ce qui manque pour acheter
export default function BuyButton({label = "Acheter", price, credits, busy, onBuy}: {
    label?: string;
    price: number;
    credits: number;
    busy: boolean;
    onBuy: () => void;
}) {
    const missing = price - credits;
    if (missing > 0) {
        return <button type="button" className="shop-button buy" disabled>Il te manque {missing} crédit{missing > 1 ? "s" : ""}</button>;
    }
    return (
        <button type="button" className="shop-button buy" disabled={busy} onClick={onBuy}>
            {label} <span className="shop-button-price"><FaCoins aria-hidden/> {price}</span>
        </button>
    );
}
