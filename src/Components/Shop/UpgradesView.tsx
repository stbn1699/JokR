/**
 * Améliorations d'un jeu dans la boutique (/boutique/ameliorations…) : les améliorations en vignettes, avec le niveau
 * atteint, et la fiche de celle regardée : tous ses niveaux (ce qu'apporte chacun), et l'achat du suivant.
 * Colonnes et lignes ont un aperçu dessiné : celui du niveau suivant, ou du niveau cliqué dans la liste.
 * Les niveaux s'achètent dans l'ordre (voir backend/src/utils/upgrades.ts) ; achetés, ils comptent tout de suite
 * dans les jeux.
 */

import {useState} from "react";
import {Link} from "react-router-dom";
import {FaCheck, FaCoins, FaCrown, FaLock} from "react-icons/fa";
import {useAuth} from "../../Context/authContext.ts";
import {ApiError} from "../../api/api.ts";
import {shopService} from "../../Services/shop.service.ts";
import {upgrade as findUpgrade, type Upgrade, upgradeItemId, type UpgradeLevels, upgradeValue} from "../../../backend/src/utils/upgrades.ts";
import type {Category} from "./shopItems.tsx";
import {UpgradeIcon} from "./UpgradeArt.tsx";
import BuyButton from "./BuyButton.tsx";

// Où on se sert de chaque jeu
const PLAY_URL: Record<string, string> = {
    slots: "/hasard/machines", plinko: "/hasard/plinko", keno: "/hasard/keno", roulette: "/hasard/roulette",
    lottery: "/hasard/loterie", wheel: "/hasard", shop: "/boutique",
};

// Petits points des niveaux : pleins jusqu'au niveau atteint
function Pips({level, max}: { level: number; max: number }) {
    return (
        <span className="upgrade-pips" aria-hidden>
            {Array.from({length: max}, (_, i) => <i key={i} className={i < level ? "on" : ""}/>)}
        </span>
    );
}

type Props = {
    category: Category;
    preselect?: string;
    levels: UpgradeLevels;
    onBought: (itemId: string) => void;
};

export default function UpgradesView({category, preselect, levels, onBought}: Props) {
    const auth = useAuth();
    const upgrades = category.items.map(i => findUpgrade(i.id)).filter((u): u is Upgrade => u !== undefined);
    const [picked, setPicked] = useState(() => upgrades.find(u => u.id === preselect)?.id ?? upgrades[0]?.id);
    // niveau montré dans l'aperçu (0 : au départ) ; null : le niveau suivant (le dernier une fois tout acheté)
    const [viewed, setViewed] = useState<number | null>(null);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const selected = upgrades.find(u => u.id === picked) ?? upgrades[0];
    const levelOf = (u: Upgrade) => levels[u.id] ?? 0;
    const shown = selected ? viewed ?? Math.min(levelOf(selected) + 1, selected.levels.length) : 0;
    const shownLabel = selected ? (shown === 0 ? selected.base.label : selected.levels[shown - 1]!.label) : "";
    // les améliorations qui se dessinent selon le niveau (colonnes, lignes)
    const drawn = selected?.id === "slots-reels" || selected?.id === "slots-lines";

    async function buy(u: Upgrade) {
        const itemId = upgradeItemId(u.id, levelOf(u) + 1);
        setBusy(true);
        setError(null);
        try {
            auth.setCredits(await shopService.buy(itemId));
            onBought(itemId);
        } catch (err) {
            setError(err instanceof ApiError ? err.message : "Une erreur est survenue, réessaie.");
        } finally {
            setBusy(false);
        }
    }

    // étiquette d'une vignette : niveau maximum, ou prix du niveau suivant
    const status = (u: Upgrade) => {
        const level = levelOf(u);
        if (level >= u.levels.length) return <span className="shop-tile-tag worn"><FaCrown aria-hidden/> Max</span>;
        return <span className="shop-tile-tag price"><FaCoins aria-hidden/> {u.levels[level]!.price}</span>;
    };

    return (
        <>
            <section className="shop-panel shop-catalog">
                <header className="shop-catalog-head">
                    <div>
                        <h1>{category.name}</h1>
                        <p>{category.hint}</p>
                    </div>
                </header>

                <div className="shop-grid" role="listbox" aria-label={category.name}>
                    {upgrades.map(u => {
                        const level = levelOf(u);
                        return (
                            <button key={u.id} type="button" role="option" aria-selected={u === selected} title={u.name}
                                    className={`shop-tile upgrade-tile ${u === selected ? "selected" : ""} ${level >= u.levels.length ? "worn" : ""}`}
                                    onClick={() => {
                                        setPicked(u.id);
                                        setViewed(null);
                                    }}>
                                <span className="shop-tile-art">
                                    <UpgradeIcon id={u.id} value={upgradeValue(u.id, level)}/>
                                    <span className="upgrade-tile-level">
                                        <b>{level === 0 ? u.base.label : u.levels[level - 1]!.label}</b>
                                        <Pips level={level} max={u.levels.length}/>
                                    </span>
                                </span>
                                <span className="shop-tile-foot">
                                    <span className="shop-tile-name">{u.name}</span>
                                    {status(u)}
                                </span>
                            </button>
                        );
                    })}
                </div>
            </section>

            {selected && (
                <aside className="shop-panel shop-detail" aria-label="Amélioration choisie">
                    <div className="shop-detail-preview">
                        <div className="shop-reels-stage">
                            <UpgradeIcon id={selected.id} value={upgradeValue(selected.id, shown)} big/>
                            {drawn && <span className="upgrade-preview-caption">Aperçu · {shownLabel}</span>}
                        </div>
                    </div>

                    <div className="shop-detail-info">
                        <small>Améliorations · {category.name}</small>
                        <h2>{selected.name}</h2>
                        <p>{selected.description}</p>
                    </div>

                    <ol className={`upgrade-levels ${drawn ? "pickable" : ""}`} aria-label="Niveaux">
                        <li className={`done ${drawn && shown === 0 ? "viewed" : ""}`} onClick={drawn ? () => setViewed(0) : undefined}>
                            <span className="upgrade-level-mark"><FaCheck aria-hidden/></span>
                            <span><small>Au départ</small>{selected.base.label}</span>
                        </li>
                        {selected.levels.map((l, i) => {
                            const level = levelOf(selected);
                            const state = i < level ? "done" : i === level ? "next" : "later";
                            return (
                                <li key={i} className={`${state} ${drawn && shown === i + 1 ? "viewed" : ""}`}
                                    onClick={drawn ? () => setViewed(i + 1) : undefined}>
                                    <span className="upgrade-level-mark">
                                        {state === "done" ? <FaCheck aria-hidden/> : state === "later" ? <FaLock aria-hidden/> : i + 1}
                                    </span>
                                    <span><small>Niveau {i + 1}</small>{l.label}</span>
                                    {state !== "done" && <em><FaCoins aria-hidden/> {l.price}</em>}
                                </li>
                            );
                        })}
                    </ol>

                    <div className="shop-detail-buy">
                        {!auth.isLoggedIn ? (
                            <Link to="/login" className="shop-button">Connecte-toi pour acheter</Link>
                        ) : levelOf(selected) >= selected.levels.length ? (
                            <button type="button" className="shop-button" disabled><FaCrown aria-hidden/> Niveau maximum</button>
                        ) : (
                            <BuyButton label={`Passer au niveau ${levelOf(selected) + 1}`} price={selected.levels[levelOf(selected)]!.price}
                                       credits={auth.credits} busy={busy} onBuy={() => void buy(selected)}/>
                        )}
                        {levelOf(selected) > 0 && <Link to={PLAY_URL[selected.game]!} className="shop-button use">Aller jouer</Link>}
                        {error && <p className="shop-error" role="alert">{error}</p>}
                    </div>
                </aside>
            )}
        </>
    );
}
