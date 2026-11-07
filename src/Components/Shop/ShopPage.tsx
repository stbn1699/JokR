/**
 * Boutique (/boutique) : objets à acheter avec ses crédits, rangés par rubrique.
 * Pour l'instant une seule rubrique, « Fonds », avec les dégradés (20 couleurs, 15 crédits chacune).
 * Les fonds à motifs viendront s'ajouter à cette rubrique.
 */

import "./Shop.scss";
import {useEffect, useState} from "react";
import {Link} from "react-router-dom";
import {FaCoins, FaLock} from "react-icons/fa";
import {useAuth} from "../../Context/authContext.ts";
import {shopService} from "../../Services/shop.service.ts";
import {GRADIENT_PRICE, GRADIENTS, gradientCss} from "../../Services/shopCatalog.ts";

export default function ShopPage() {
    const {isLoggedIn, credits} = useAuth();
    const [owned, setOwned] = useState<string[] | null>(null);

    useEffect(() => {
        if (!isLoggedIn) return;
        const controller = new AbortController();
        shopService.state(controller.signal).then(s => setOwned(s.owned)).catch(() => undefined);
        return () => controller.abort();
    }, [isLoggedIn]);

    const ownedGradients = owned?.filter(id => id.startsWith("gradient-")).length ?? 0;

    return (
        <main className="shop">
            <section className="shop-card">
                <div className="shop-head">
                    <h1>Boutique</h1>
                    {isLoggedIn && <span className="shop-credits"><FaCoins aria-hidden/> {credits} crédit{credits > 1 ? "s" : ""}</span>}
                </div>
                <p className="shop-sub">Dépense tes crédits pour personnaliser JokR. Tu gagnes des crédits en finissant des puzzles.</p>

                <h2>Fonds</h2>
                <div className="shop-items">
                    <Link to="/boutique/fonds/degrades" className="shop-item">
                        {/* quatre dégradés en mosaïque */}
                        <span className="shop-item-mosaic" aria-hidden>
                            {GRADIENTS.slice(0, 4).map(gr => <span key={gr.id} style={{background: gradientCss(gr)}}/>)}
                        </span>
                        <span className="shop-item-info">
                            <strong>Dégradés</strong>
                            <span>{GRADIENTS.length} couleurs · <FaCoins aria-hidden/> {GRADIENT_PRICE} chacune</span>
                            {isLoggedIn && owned && <small>{ownedGradients} / {GRADIENTS.length} possédés</small>}
                        </span>
                    </Link>

                    <div className="shop-item soon" aria-disabled>
                        <span className="shop-item-mosaic patterns" aria-hidden><span/><span/><span/><span/></span>
                        <span className="shop-item-info">
                            <strong>Motifs</strong>
                            <span><FaLock aria-hidden/> Bientôt : quadrillés, rayés…</span>
                        </span>
                    </div>
                </div>
            </section>
        </main>
    );
}
