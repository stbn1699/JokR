/**
 * Boutique › Jetons › un jeu de jetons (/boutique/jetons/:set, ex. premium) : aperçu sur un tapis vert
 * (les six jetons, et quelques piles comme pendant une partie), achat et choix des jetons utilisés
 * à la roulette et au Plinko. Les jeux viennent des images de public/chips/<jeu>/ (voir backend/src/utils/chipSets.ts).
 */

import "./Shop.scss";
import {useEffect, useState} from "react";
import {Link, useParams} from "react-router-dom";
import {FaCheck, FaChevronLeft, FaCoins} from "react-icons/fa";
import {useAuth} from "../../Context/authContext.ts";
import {ApiError} from "../../api/api.ts";
import {shopService} from "../../Services/shop.service.ts";
import {CHIP_VALUES} from "../../Services/chips.ts";
import {DEFAULT_CHIP_SET_ID, setMyChipSet, useChipSets, useMyChipSet} from "../../Services/chipSets.ts";
import ChipStack from "../Hasard/Roulette/ChipStack.tsx";
import Loader from "../Loader/Loader.tsx";

// Piles de l'aperçu, comme sur le tapis pendant une partie
const SAMPLE_STACKS = [[10, 10, 10, 10, 10], [50, 20, 10], [100], [500, 200, 100, 50]];

export default function ChipSetPage() {
    const {set: setName} = useParams();
    const auth = useAuth();
    const catalog = useChipSets();
    const worn = useMyChipSet();
    const set = catalog?.sets.find(s => s.set === setName);
    const [owned, setOwned] = useState<string[]>([]);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!auth.isLoggedIn) return;
        const controller = new AbortController();
        shopService.state(controller.signal).then(s => setOwned(s.owned)).catch(() => undefined);
        return () => controller.abort();
    }, [auth.isLoggedIn]);

    if (!catalog) return <main className="shop"><Loader label="Chargement des jetons…"/></main>;
    if (!set) {
        return (
            <main className="shop">
                <section className="shop-card">
                    <Link to="/boutique" className="shop-back"><FaChevronLeft aria-hidden/> Boutique</Link>
                    <p>Ces jetons n'existent pas.</p>
                </section>
            </main>
        );
    }

    const isOwned = set.price === 0 || owned.includes(set.id);
    const isWorn = worn === set.id;
    const canAfford = auth.credits >= set.price;

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
        auth.setCredits(await shopService.buy(set.id));
        setOwned(o => [...o, set.id]);
    });

    const use = () => run(async () => {
        await shopService.setChipSet(set.id === DEFAULT_CHIP_SET_ID ? null : set.id);
        setMyChipSet(set.id);
    });

    return (
        <main className="shop">
            <section className="shop-card">
                <Link to="/boutique" className="shop-back"><FaChevronLeft aria-hidden/> Boutique</Link>
                <div className="shop-head">
                    <h1>Jetons {set.name.toLowerCase()}</h1>
                    {auth.isLoggedIn && <span className="shop-credits"><FaCoins aria-hidden/> {auth.credits}</span>}
                </div>
                <p className="shop-sub">Les six jetons, utilisés à la roulette (tapis et mises) et au Plinko (mises).</p>

                {/* aperçu : les jetons, puis des piles comme sur le tapis */}
                <div className="shop-chip-felt">
                    <div className="shop-chip-row">
                        {CHIP_VALUES.map(v => <img key={v} src={set.chips[String(v)]} alt={`Jeton de ${v}`}/>)}
                    </div>
                    <div className="shop-chip-stacks">
                        {SAMPLE_STACKS.map((chips, i) => (
                            <span key={i} className="shop-chip-stack-slot">
                                <ChipStack chips={chips} set={set.id} style={{left: "50%", top: "50%"}}/>
                            </span>
                        ))}
                    </div>
                </div>

                <div className="shop-choice">
                    <strong>{set.name}</strong>
                    {isOwned
                        ? <span className="shop-tag owned">{isWorn ? "Utilisés" : set.price === 0 ? "Offerts" : "Possédés"}</span>
                        : <span className="shop-tag"><FaCoins aria-hidden/> {set.price}</span>}
                </div>

                <div className="shop-actions">
                    {!auth.isLoggedIn ? (
                        <Link to="/login" className="shop-button">Connecte-toi pour acheter</Link>
                    ) : !isOwned ? (
                        <button type="button" className="shop-button buy" disabled={busy || !canAfford} onClick={() => void buy()}>
                            {canAfford ? <>Acheter · <FaCoins aria-hidden/> {set.price}</>
                                : `Il te manque ${set.price - auth.credits} crédit${set.price - auth.credits > 1 ? "s" : ""}`}
                        </button>
                    ) : isWorn ? (
                        <button type="button" className="shop-button" disabled><FaCheck aria-hidden/> Jetons actuels</button>
                    ) : (
                        <button type="button" className="shop-button wear" disabled={busy} onClick={() => void use()}>Utiliser ces jetons</button>
                    )}
                </div>
                {error && <p className="shop-error" role="alert">{error}</p>}
            </section>
        </main>
    );
}
