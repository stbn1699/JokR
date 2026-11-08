/**
 * Boutique (/boutique) : objets à acheter avec ses crédits, rangés par rubrique.
 * - Fonds : les dégradés (20 couleurs, 15 crédits chacune), et les fonds en images (drapeaux… lus dans public/backgrounds)
 * - Plinko : une carte par série de billes (lues dans public/plinko_ball), avec un aperçu de la série
 * - Jetons : une carte par jeu de jetons (lus dans public/chips), les classiques offerts
 */

import {formatCredits} from "../../Services/credits.ts";
import "./Shop.scss";
import {useEffect, useState} from "react";
import {Link} from "react-router-dom";
import {FaCoins, FaLock} from "react-icons/fa";
import {useAuth} from "../../Context/authContext.ts";
import {shopService} from "../../Services/shop.service.ts";
import {GRADIENT_PRICE, GRADIENTS, gradientCss} from "../../Services/shopCatalog.ts";
import {DEFAULT_BALL_ID, usePlinkoBalls} from "../../Services/plinkoBalls.ts";
import {CHIP_VALUES} from "../../Services/chips.ts";
import {useChipSets, useMyChipSet} from "../../Services/chipSets.ts";
import PlinkoPreview from "./PlinkoPreview.tsx";
import {imageCss, useImageBackgrounds} from "../../Services/imageBackgrounds.ts";

export default function ShopPage() {
    const {isLoggedIn, credits} = useAuth();
    const [owned, setOwned] = useState<string[] | null>(null);
    const balls = usePlinkoBalls();
    const imageSets = useImageBackgrounds();
    const chipSets = useChipSets();
    const myChips = useMyChipSet();

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
                    {isLoggedIn && <span className="shop-credits"><FaCoins aria-hidden/> {formatCredits(credits)} crédit{credits > 1 ? "s" : ""}</span>}
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

                    {imageSets?.map(set => {
                        const mine = set.backgrounds.filter(b => owned?.includes(b.id)).length;
                        return (
                            <Link key={set.set} to={`/boutique/fonds/${set.set}`} className="shop-item">
                                {/* quatre fonds de la série en mosaïque */}
                                <span className="shop-item-mosaic" aria-hidden>
                                    {set.backgrounds.slice(0, 4).map(b => <span key={b.id} style={{background: imageCss(b.file)}}/>)}
                                </span>
                                <span className="shop-item-info">
                                    <strong>{set.name}</strong>
                                    <span>{set.backgrounds.length} fonds · <FaCoins aria-hidden/> {set.price} chacun</span>
                                    {isLoggedIn && owned && <small>{mine} / {set.backgrounds.length} possédé{mine > 1 ? "s" : ""}</small>}
                                </span>
                            </Link>
                        );
                    })}

                    <div className="shop-item soon" aria-disabled>
                        <span className="shop-item-mosaic patterns" aria-hidden><span/><span/><span/><span/></span>
                        <span className="shop-item-info">
                            <strong>Motifs</strong>
                            <span><FaLock aria-hidden/> Bientôt : quadrillés, rayés…</span>
                        </span>
                    </div>
                </div>

                <h2>Plinko</h2>
                <div className="shop-items">
                    {!balls && <p className="shop-sub">Chargement des billes…</p>}
                    {balls?.sets.map(set => {
                        const mine = set.balls.filter(b => b.id === DEFAULT_BALL_ID || owned?.includes(b.id)).length;
                        const forSale = set.balls.filter(b => b.price > 0);
                        return (
                            <Link key={set.set} to={`/boutique/plinko/${set.set}`} className="shop-item">
                                {/* toute la série, mélangée sur un petit plateau */}
                                <span className="shop-item-preview" aria-hidden>
                                    <PlinkoPreview balls={set.balls.map(b => b.file)}/>
                                </span>
                                <span className="shop-item-info">
                                    <strong>Billes {set.name.toLowerCase()}</strong>
                                    <span>{set.balls.length} couleur{set.balls.length > 1 ? "s" : ""}
                                        {forSale.length > 0 && <> · <FaCoins aria-hidden/> {set.price} chacune</>}</span>
                                    {isLoggedIn && owned && <small>{mine} / {set.balls.length} possédée{mine > 1 ? "s" : ""}</small>}
                                </span>
                            </Link>
                        );
                    })}
                </div>

                <h2>Jetons</h2>
                <div className="shop-items">
                    {!chipSets && <p className="shop-sub">Chargement des jetons…</p>}
                    {chipSets?.sets.map(set => {
                        const has = set.price === 0 || owned?.includes(set.id);
                        return (
                            <Link key={set.id} to={`/boutique/jetons/${set.set}`} className="shop-item">
                                <span className="shop-item-chips" aria-hidden>
                                    {CHIP_VALUES.map(v => <img key={v} src={set.chips[String(v)]} alt=""/>)}
                                </span>
                                <span className="shop-item-info">
                                    <strong>Jetons {set.name.toLowerCase()}</strong>
                                    <span>{set.price === 0 ? "Offerts à tout le monde" : <><FaCoins aria-hidden/> {set.price} le jeu de six</>}</span>
                                    {isLoggedIn && <small>{myChips === set.id ? "Utilisés" : has ? "Possédés" : "\u00a0"}</small>}
                                </span>
                            </Link>
                        );
                    })}
                </div>
            </section>
        </main>
    );
}
