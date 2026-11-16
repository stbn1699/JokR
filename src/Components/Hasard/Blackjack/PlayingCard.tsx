import {useState} from "react";
import {type Card, cardBackImage, cardImage} from "../../../../backend/src/utils/blackjack.ts";

/**
 * Une carte à jouer : son image (public/cards/front/<style>/<couleur>-<valeur>.svg), ou le dos
 * (public/cards/back/<style>.svg) pour la carte cachée du croupier.
 * Image absente : une carte simple dessinée (valeur et symbole), pour que la partie reste lisible.
 */

const SYMBOLS: Record<Card["suit"], string> = {coeur: "♥", carreau: "♦", pique: "♠", trefle: "♣"};
const RED = new Set<Card["suit"]>(["coeur", "carreau"]);
const NAMES: Record<Card["rank"], string> = {A: "As", J: "Valet", Q: "Dame", K: "Roi", "2": "2", "3": "3", "4": "4", "5": "5", "6": "6", "7": "7", "8": "8", "9": "9", "10": "10"};

const cardLabel = (card: Card) => `${NAMES[card.rank]} de ${card.suit}`;

export default function PlayingCard({card, index}: { card: Card | null; index: number }) {
    const src = card ? cardImage(card) : cardBackImage();
    const [failed, setFailed] = useState<string | null>(null);
    const broken = failed === src;
    const style = {animationDelay: `${index * 0.12}s`};

    if (broken) {
        return card ? (
            <span className={`bj-card drawn ${RED.has(card.suit) ? "red" : ""}`} style={style} role="img" aria-label={cardLabel(card)}>
                <span className="bj-card-corner">{card.rank}<br/>{SYMBOLS[card.suit]}</span>
                <span className="bj-card-middle">{SYMBOLS[card.suit]}</span>
            </span>
        ) : <span className="bj-card drawn back" style={style} role="img" aria-label="Carte cachée"/>;
    }
    return <img className="bj-card" style={style} src={src} alt={card ? cardLabel(card) : "Carte cachée"} draggable={false}
                onError={() => setFailed(src)}/>;
}
