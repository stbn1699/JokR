/**
 * Boutique › Fonds › une série de fonds en images (/boutique/fonds/:set, ex. lgbt pour les drapeaux des fiertés) :
 * choix du fond, aperçus à faire défiler (accueil, une grille, le profil), achat et mise en place.
 * Les fonds viennent des images de public/backgrounds/<série>/<format>/ (voir backend/src/utils/backgroundSets.ts).
 */

import "./Shop.scss";
import {useEffect, useState} from "react";
import {Link, useParams} from "react-router-dom";
import {FaCheck, FaChevronLeft, FaCoins} from "react-icons/fa";
import {useAuth} from "../../Context/authContext.ts";
import {ApiError} from "../../api/api.ts";
import {shopService} from "../../Services/shop.service.ts";
import {formatCredits} from "../../Services/credits.ts";
import {imageCss, useImageBackgrounds} from "../../Services/imageBackgrounds.ts";
import {Previews} from "./GradientsPage.tsx";
import {IMAGE_VEIL} from "./SiteBackground.tsx";
import Loader from "../Loader/Loader.tsx";

export default function ImageBackgroundsPage() {
    const {set: setName} = useParams();
    const auth = useAuth();
    const catalog = useImageBackgrounds();
    const set = catalog?.find(s => s.set === setName);
    const [owned, setOwned] = useState<string[]>([]);
    const [picked, setPicked] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!auth.isLoggedIn) return;
        const controller = new AbortController();
        shopService.state(controller.signal).then(s => setOwned(s.owned)).catch(() => undefined);
        return () => controller.abort();
    }, [auth.isLoggedIn]);

    if (!catalog) return <main className="shop"><Loader label="Chargement des fonds…"/></main>;
    if (!set) {
        return (
            <main className="shop">
                <section className="shop-card">
                    <Link to="/boutique" className="shop-back"><FaChevronLeft aria-hidden/> Boutique</Link>
                    <p>Ces fonds n'existent pas.</p>
                </section>
            </main>
        );
    }

    // fond regardé : celui choisi, sinon le fond porté s'il est de cette série, sinon le premier
    const selected = set.backgrounds.find(b => b.id === picked) ?? set.backgrounds.find(b => b.id === auth.background) ?? set.backgrounds[0]!;
    const isOwned = owned.includes(selected.id);
    const isWorn = auth.background === selected.id;
    const canAfford = auth.credits >= selected.price;
    const ownedCount = set.backgrounds.filter(b => owned.includes(b.id)).length;

    async function run(action: () => Promise<void>) {
        setBusy(true);
        setError(null);
        try {
            await action();
        } catch (err) {
            setError(err instanceof ApiError ? err.message : "Une erreur est survenue, réessaie.");
        } finally {
            setBusy(false);
        }
    }

    const buy = () => run(async () => {
        auth.setCredits(await shopService.buy(selected.id));
        setOwned(o => [...o, selected.id]);
    });

    const wear = () => run(async () => {
        await shopService.setBackground(selected.id);
        auth.setBackground(selected.id);
    });

    return (
        <main className="shop">
            <section className="shop-card">
                <Link to="/boutique" className="shop-back"><FaChevronLeft aria-hidden/> Boutique</Link>
                <div className="shop-head">
                    <h1>{set.name}</h1>
                    {auth.isLoggedIn && <span className="shop-credits"><FaCoins aria-hidden/> {formatCredits(auth.credits)}</span>}
                </div>
                <p className="shop-sub">{set.backgrounds.length} fonds · {ownedCount} / {set.backgrounds.length} possédé{ownedCount > 1 ? "s" : ""}</p>

                <Previews background={`${IMAGE_VEIL}, ${imageCss(selected.file)}`}/>

                <div className="shop-choice">
                    <strong>{selected.name}</strong>
                    {isOwned
                        ? <span className="shop-tag owned">{isWorn ? "Utilisé" : "Possédé"}</span>
                        : <span className="shop-tag"><FaCoins aria-hidden/> {selected.price}</span>}
                </div>

                <div className="shop-actions">
                    {!auth.isLoggedIn ? (
                        <Link to="/login" className="shop-button">Connecte-toi pour acheter</Link>
                    ) : !isOwned ? (
                        <button type="button" className="shop-button buy" disabled={busy || !canAfford} onClick={() => void buy()}>
                            {canAfford ? <>Acheter · <FaCoins aria-hidden/> {selected.price}</>
                                : `Il te manque ${selected.price - auth.credits} crédit${selected.price - auth.credits > 1 ? "s" : ""}`}
                        </button>
                    ) : isWorn ? (
                        <button type="button" className="shop-button" disabled><FaCheck aria-hidden/> Fond actuel</button>
                    ) : (
                        <button type="button" className="shop-button wear" disabled={busy} onClick={() => void wear()}>Utiliser ce fond</button>
                    )}
                </div>
                {error && <p className="shop-error" role="alert">{error}</p>}

                <div className="shop-swatches flags" role="listbox" aria-label="Fonds">
                    {set.backgrounds.map(b => (
                        <button key={b.id} type="button" role="option" aria-selected={selected.id === b.id} title={b.name}
                                className={`shop-swatch ${selected.id === b.id ? "selected" : ""}`} onClick={() => setPicked(b.id)}>
                            <span className="shop-swatch-color shop-flag" style={{background: imageCss(b.file)}}>
                                {b.id === auth.background && <FaCheck aria-label="Utilisé"/>}
                            </span>
                            <span className="shop-swatch-name">{b.name}</span>
                            {owned.includes(b.id)
                                ? <span className="shop-swatch-price free">Possédé</span>
                                : <span className="shop-swatch-price"><FaCoins aria-hidden/> {b.price}</span>}
                        </button>
                    ))}
                </div>
            </section>
        </main>
    );
}
