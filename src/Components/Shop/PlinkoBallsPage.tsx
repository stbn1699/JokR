/**
 * Boutique › Plinko › une série de billes (/boutique/plinko/:set, ex. rainbow) : choix d'une couleur, aperçu
 * sur un petit plateau (billes qui tournent), achat et choix de la bille utilisée au Plinko.
 * Les couleurs viennent des images de public/plinko_ball/<série>/ (voir backend/src/utils/plinkoBalls.ts).
 */

import "./Shop.scss";
import {useEffect, useState} from "react";
import {Link, useParams} from "react-router-dom";
import {FaCheck, FaChevronLeft, FaCoins} from "react-icons/fa";
import {useAuth} from "../../Context/authContext.ts";
import {ApiError} from "../../api/api.ts";
import {shopService} from "../../Services/shop.service.ts";
import {DEFAULT_BALL_ID, setMyPlinkoBall, useMyPlinkoBall, usePlinkoBalls} from "../../Services/plinkoBalls.ts";
import PlinkoPreview from "./PlinkoPreview.tsx";
import Loader from "../Loader/Loader.tsx";

export default function PlinkoBallsPage() {
    const {set: setId} = useParams();
    const auth = useAuth();
    const catalog = usePlinkoBalls();
    const set = catalog?.sets.find(s => s.set === setId);
    const [owned, setOwned] = useState<string[]>([]);
    const worn = useMyPlinkoBall();
    const [picked, setPicked] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!auth.isLoggedIn) return;
        const controller = new AbortController();
        shopService.state(controller.signal).then(s => setOwned(s.owned)).catch(() => undefined);
        return () => controller.abort();
    }, [auth.isLoggedIn]);

    if (!catalog) return <main className="shop"><Loader label="Chargement des billes…"/></main>;
    if (!set) {
        return (
            <main className="shop">
                <section className="shop-card">
                    <Link to="/boutique" className="shop-back"><FaChevronLeft aria-hidden/> Boutique</Link>
                    <p>Cette série de billes n'existe pas.</p>
                </section>
            </main>
        );
    }

    // couleur regardée : celle choisie, sinon la bille utilisée si elle est de cette série, sinon la première
    const selected = set.balls.find(b => b.id === picked) ?? set.balls.find(b => b.id === worn) ?? set.balls[0]!;
    const isOwned = (id: string) => id === DEFAULT_BALL_ID || owned.includes(id);
    const ownedCount = set.balls.filter(b => isOwned(b.id)).length;
    const canAfford = auth.credits >= selected.price;

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

    const use = () => run(async () => {
        await shopService.setPlinkoBall(selected.id === DEFAULT_BALL_ID ? null : selected.id);
        setMyPlinkoBall(selected.id);
    });

    return (
        <main className="shop">
            <section className="shop-card">
                <Link to="/boutique" className="shop-back"><FaChevronLeft aria-hidden/> Boutique</Link>
                <div className="shop-head">
                    <h1>Billes {set.name.toLowerCase()}</h1>
                    {auth.isLoggedIn && <span className="shop-credits"><FaCoins aria-hidden/> {auth.credits}</span>}
                </div>
                <p className="shop-sub">{set.balls.length} couleurs · {ownedCount} / {set.balls.length} possédée{ownedCount > 1 ? "s" : ""}</p>

                {/* l'aperçu montre la couleur choisie ; une nouvelle disposition à chaque couleur */}
                <PlinkoPreview key={selected.id} balls={[selected.file]} className="shop-plinko-preview"/>

                <div className="shop-choice">
                    <strong>{selected.name}</strong>
                    {isOwned(selected.id)
                        ? <span className="shop-tag owned">{worn === selected.id ? "Utilisée" : selected.price === 0 ? "Offerte" : "Possédée"}</span>
                        : <span className="shop-tag"><FaCoins aria-hidden/> {selected.price}</span>}
                </div>

                <div className="shop-actions">
                    {!auth.isLoggedIn ? (
                        <Link to="/login" className="shop-button">Connecte-toi pour acheter</Link>
                    ) : !isOwned(selected.id) ? (
                        <button type="button" className="shop-button buy" disabled={busy || !canAfford} onClick={() => void buy()}>
                            {canAfford ? <>Acheter · <FaCoins aria-hidden/> {selected.price}</>
                                : `Il te manque ${selected.price - auth.credits} crédit${selected.price - auth.credits > 1 ? "s" : ""}`}
                        </button>
                    ) : worn === selected.id ? (
                        <button type="button" className="shop-button" disabled><FaCheck aria-hidden/> Bille actuelle</button>
                    ) : (
                        <button type="button" className="shop-button wear" disabled={busy} onClick={() => void use()}>Utiliser cette bille</button>
                    )}
                </div>
                {error && <p className="shop-error" role="alert">{error}</p>}

                <div className="shop-swatches balls" role="listbox" aria-label="Couleurs">
                    {set.balls.map(b => (
                        <button key={b.id} type="button" role="option" aria-selected={selected.id === b.id} title={b.name}
                                className={`shop-swatch ${selected.id === b.id ? "selected" : ""}`} onClick={() => setPicked(b.id)}>
                            <span className="shop-ball">
                                <img src={b.file} alt=""/>
                                {worn === b.id && <FaCheck className="shop-ball-check" aria-label="Utilisée"/>}
                            </span>
                            <span className="shop-swatch-name">{b.name}</span>
                            {isOwned(b.id)
                                ? <span className="shop-swatch-price free">{b.price === 0 ? "Offerte" : "Possédée"}</span>
                                : <span className="shop-swatch-price"><FaCoins aria-hidden/> {b.price}</span>}
                        </button>
                    ))}
                </div>
            </section>
        </main>
    );
}
