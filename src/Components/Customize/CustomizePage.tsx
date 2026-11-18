/**
 * Personnaliser (/personnaliser) : choisir ce qu'on utilise parmi ce qu'on possède, rangé comme la boutique en plus simple.
 * - À gauche, les rubriques (fond du site, bille de Plinko, jetons, effet de victoire), avec ce qui est utilisé
 * - Au centre, les objets possédés de la rubrique : un clic les met en place tout de suite ; la dernière case
 *   mène à la rubrique de la boutique
 * - À droite, l'aperçu de ce qui est utilisé
 * Les vignettes et les aperçus sont ceux de la boutique (shopItems.tsx). ?rubrique=bille ouvre une rubrique.
 */

import "../Shop/Shop.scss";
import "./CustomizePage.scss";
import {type ReactNode, useEffect, useState} from "react";
import {Link, useSearchParams} from "react-router-dom";
import {FaCheck, FaPlus, FaStore} from "react-icons/fa";
import {useAuth} from "../../Context/authContext.ts";
import {ApiError} from "../../api/api.ts";
import {shopService} from "../../Services/shop.service.ts";
import {DEFAULT_BACKGROUND, parsePatternBackground, patternCss} from "../../Services/shopCatalog.ts";
import {useMyPlinkoBall, usePlinkoBalls} from "../../Services/plinkoBalls.ts";
import {useChipSets, useMyChipSet} from "../../Services/chipSets.ts";
import {useImageBackgrounds} from "../../Services/imageBackgrounds.ts";
import {useMyVictoryEffect} from "../../Services/victoryEffects.ts";
import {buildCategories, equip, type Item, type Kind, type SectionKey} from "../Shop/shopItems.tsx";
import {Previews} from "../Shop/ShopPreviews.tsx";
import Loader from "../Loader/Loader.tsx";

type RubricKey = "fond" | "bille" | "jetons" | "victoire";
type Rubric = { key: RubricKey; name: string; section: SectionKey; kind: Kind; shop: string; more: string };

const RUBRICS: Rubric[] = [
    {key: "fond", name: "Fond du site", section: "fonds", kind: "background", shop: "/boutique/fonds", more: "Plus de fonds"},
    {key: "bille", name: "Bille de Plinko", section: "plinko", kind: "ball", shop: "/boutique/plinko", more: "Plus de billes"},
    {key: "jetons", name: "Jetons", section: "jetons", kind: "chips", shop: "/boutique/jetons", more: "Plus de jetons"},
    {key: "victoire", name: "Effet de victoire", section: "victoire", kind: "victory", shop: "/boutique/victoire", more: "Plus d'effets"},
];

export default function CustomizePage() {
    const auth = useAuth();
    const [search, setSearch] = useSearchParams();
    const [owned, setOwned] = useState<string[]>([]);
    // objet en train d'être mis en place, et l'erreur s'il n'a pas pu l'être
    const [pending, setPending] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const balls = usePlinkoBalls();
    const imageSets = useImageBackgrounds();
    const chipSets = useChipSets();
    const myBall = useMyPlinkoBall();
    const myChips = useMyChipSet();
    const myVictory = useMyVictoryEffect();

    useEffect(() => {
        if (!auth.isLoggedIn) return;
        const controller = new AbortController();
        shopService.state(controller.signal).then(s => setOwned(s.owned)).catch(() => undefined);
        return () => controller.abort();
    }, [auth.isLoggedIn]);

    const rubric = RUBRICS.find(r => r.key === search.get("rubrique")) ?? RUBRICS[0]!;
    const categories = buildCategories(imageSets, balls, chipSets);
    const loading = !imageSets || !balls || !chipSets;

    const isOwned = (item: Item) =>
        item.free === true || owned.includes(item.id) || (item.minLevel !== undefined && auth.level >= item.minLevel);

    // Objets possédés d'une rubrique (pour les fonds : les fonds qui se portent tels quels, et le fond à motif porté)
    const itemsOf = (r: Rubric): Item[] => {
        const items = categories.filter(c => c.section === r.section && c.kind === r.kind).flatMap(c => c.items).filter(isOwned);
        const pattern = r.key === "fond" ? parsePatternBackground(auth.background) : undefined;
        if (pattern && auth.background) {
            const css = (size: number) => patternCss(pattern.pattern.slug, pattern.color1.slug, pattern.color2.slug, {size});
            items.push({
                id: auth.background,
                name: `${pattern.pattern.name} ${pattern.color1.name.toLowerCase()} et ${pattern.color2.name.toLowerCase()}`,
                price: 0,
                thumb: <span className="shop-art-fill" style={{background: css(22)}}/>,
                preview: <Previews background={css(14)}/>,
            });
        }
        return items;
    };

    // Objet utilisé dans une rubrique
    const wornId = (r: Rubric) =>
        r.key === "fond" ? auth.background ?? DEFAULT_BACKGROUND.id
            : r.key === "bille" ? myBall
            : r.key === "jetons" ? myChips
            : myVictory;

    const items = itemsOf(rubric);
    const worn = items.find(i => i.id === wornId(rubric));

    async function use(item: Item) {
        if (pending !== null || item.id === wornId(rubric)) return;
        setPending(item.id);
        setError(null);
        try {
            await equip(rubric.kind, item.id, auth.setBackground);
        } catch (err) {
            setError(err instanceof ApiError ? err.message : "Une erreur est survenue, réessaie.");
        } finally {
            setPending(null);
        }
    }

    const open = (r: Rubric) => setSearch(r === RUBRICS[0] ? {} : {rubrique: r.key}, {replace: true});

    let content: ReactNode;
    if (!auth.isLoggedIn) {
        content = (
            <section className="shop-panel shop-empty">
                <Link to="/login" className="shop-button buy shop-login">Connecte-toi pour personnaliser JokR</Link>
            </section>
        );
    } else {
        content = (
            <>
                <section className="shop-panel shop-catalog">
                    <header className="shop-catalog-head">
                        <div>
                            <h1>{rubric.name}</h1>
                            <p>{loading ? "Chargement…" : `${items.length} à toi · un clic pour l'utiliser`}</p>
                        </div>
                    </header>
                    <div className="shop-grid" role="listbox" aria-label={rubric.name}>
                        {loading && <Loader label="Chargement de tes objets…"/>}
                        {!loading && items.map(item => {
                            const isWorn = item.id === wornId(rubric);
                            return (
                                <button key={item.id} type="button" role="option" aria-selected={isWorn} title={item.name}
                                        className={`shop-tile ${isWorn ? "selected" : ""} ${pending === item.id ? "pending" : ""}`}
                                        onClick={() => void use(item)}>
                                    <span className="shop-tile-art">{item.thumb}</span>
                                    <span className="shop-tile-foot">
                                        <span className="shop-tile-name">{item.name}</span>
                                        {isWorn
                                            ? <span className="shop-tile-tag worn"><FaCheck aria-hidden/> Utilisé</span>
                                            : <span className="shop-tile-tag owned">Utiliser</span>}
                                    </span>
                                </button>
                            );
                        })}
                        {!loading && (
                            <Link to={rubric.shop} className="shop-tile customize-more">
                                <span className="shop-tile-art"><FaPlus aria-hidden/></span>
                                <span className="shop-tile-foot">
                                    <span className="shop-tile-name">{rubric.more}</span>
                                    <span className="shop-tile-tag price"><FaStore aria-hidden/> Boutique</span>
                                </span>
                            </Link>
                        )}
                    </div>
                </section>

                <aside className="shop-panel shop-detail" aria-label="Utilisé en ce moment">
                    {worn ? (
                        <>
                            <div className="shop-detail-preview">{worn.preview}</div>
                            <div className="shop-detail-info">
                                <small>Utilisé en ce moment</small>
                                <h2>{worn.name}</h2>
                                {worn.description && <p>{worn.description}</p>}
                            </div>
                        </>
                    ) : (
                        <div className="shop-detail-info"><small>Utilisé en ce moment</small><h2>…</h2></div>
                    )}
                    {error && <p className="shop-error" role="alert">{error}</p>}
                </aside>
            </>
        );
    }

    return (
        <main className="shop customize-page">
            <header className="customize-head">
                <h1>Personnaliser</h1>
                <Link to="/boutique" className="customize-shop-link"><FaStore aria-hidden/> Boutique</Link>
            </header>

            <div className="shop-layout">
                <aside className="shop-nav" aria-label="Rubriques">
                    <div className="shop-nav-list">
                        {RUBRICS.map(r => {
                            const current = itemsOf(r).find(i => i.id === wornId(r));
                            return (
                                <button key={r.key} type="button" className={`shop-nav-item ${r === rubric ? "active" : ""}`}
                                        aria-current={r === rubric ? "page" : undefined} onClick={() => open(r)}>
                                    <span className="shop-nav-icon" aria-hidden>
                                        {current && <span className="customize-nav-art">{current.thumb}</span>}
                                    </span>
                                    <span className="shop-nav-text">
                                        <span>{r.name}</span>
                                        <small>{current?.name ?? " "}</small>
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                </aside>
                {content}
            </div>
        </main>
    );
}
