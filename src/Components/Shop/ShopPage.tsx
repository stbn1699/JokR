/**
 * Boutique (/boutique/…) : une seule page, rangée comme un magasin de jeu.
 * - En haut, deux boutiques : « Cosmétiques » (l'apparence du site) et « Améliorations » (ce qui change le jeu)
 * - À gauche, les rubriques : Fonds, Billes Plinko, Jetons, Effets de victoire ; côté améliorations, une par jeu
 *   (Machines à sous, Plinko, Keno, Roulette, Loterie, Roue du jour, Boutique), voir UpgradesView.
 *   Fonds et Billes Plinko s'ouvrent sur la liste de leurs collections (Dégradés, Couleurs de niveau, Drapeaux…) ;
 *   sans collection choisie, le centre montre tous les objets de la rubrique, les plus achetés d'abord
 * - Au centre, les objets de la collection, en vignettes, avec un filtre (tout, à acheter, possédés)
 * - À droite, la fiche de l'objet regardé : grand aperçu, prix, bouton acheter ou utiliser
 *
 * - En arrivant (/boutique), « À la une » : les meilleures ventes de la semaine, qui mènent chacune à leur objet
 *
 * Adresses : /boutique/fonds(/<collection>), /boutique/plinko(/<série>), /boutique/jetons(/<jeu>),
 * /boutique/ameliorations(-plinko, -keno…). ?objet=<id> montre cet objet.
 * Remise de la boutique (amélioration) : les prix des cosmétiques affichés sont ceux du joueur.
 */

import "./Shop.scss";
import {useEffect, useState} from "react";
import {Link, useParams, useSearchParams} from "react-router-dom";
import {FaBolt, FaCheck, FaChevronLeft, FaChevronRight, FaCoins, FaExchangeAlt, FaFire, FaLock, FaPalette, FaThLarge} from "react-icons/fa";
import {discountedPrice, upgrade as findUpgrade} from "../../../backend/src/utils/upgrades.ts";
import {addOwnedUpgrade, setOwnedItems, UPGRADE_SECTIONS, useUpgradeLevels} from "../../Services/upgrades.ts";
import UpgradesView from "./UpgradesView.tsx";
import BuyButton from "./BuyButton.tsx";
import {useAuth} from "../../Context/authContext.ts";
import {ApiError} from "../../api/api.ts";
import {type BestSeller, shopService} from "../../Services/shop.service.ts";
import {
    DEFAULT_BACKGROUND,
    DEFAULT_PATTERN_COLORS,
    parsePatternBackground,
    PATTERN_COLOR_PRICE,
    PATTERN_COLORS,
    patternBackgroundId,
    patternCss,
} from "../../Services/shopCatalog.ts";
import {useMyPlinkoBall, usePlinkoBalls} from "../../Services/plinkoBalls.ts";
import {useChipSets, useMyChipSet} from "../../Services/chipSets.ts";
import {useImageBackgrounds} from "../../Services/imageBackgrounds.ts";
import {Previews} from "./ShopPreviews.tsx";
import {useMyVictoryEffect} from "../../Services/victoryEffects.ts";
import Loader from "../Loader/Loader.tsx";
import {buildCategories, type Category, equip, type Item, type Kind, type SectionKey} from "./shopItems.tsx";

type ShopTab = "cosmetiques" | "ameliorations";
// Les rubriques de la colonne de gauche
// collections : la rubrique s'ouvre sur la liste de ses collections, et `all` nomme la liste de tous ses objets
type Section = { key: SectionKey; tab: ShopTab; name: string; collections: boolean; all?: string };

const SECTIONS: Section[] = [
    {key: "fonds", tab: "cosmetiques", name: "Fonds", collections: true, all: "Tous les fonds"},
    {key: "plinko", tab: "cosmetiques", name: "Billes Plinko", collections: true, all: "Toutes les billes"},
    {key: "jetons", tab: "cosmetiques", name: "Jetons", collections: false},
    {key: "victoire", tab: "cosmetiques", name: "Effets de victoire", collections: false},
    ...UPGRADE_SECTIONS.map(u => ({key: u.key as SectionKey, tab: "ameliorations" as const, name: u.name, collections: false})),
];

// Mots selon ce qu'on achète : un fond, une bille, des jetons
const WORDS: Record<Kind, { owned: string; worn: string; use: string; current: string; free: string }> = {
    background: {owned: "Possédé", worn: "Utilisé", use: "Utiliser ce fond", current: "Fond actuel", free: "Offert"},
    pattern: {owned: "Possédé", worn: "Utilisé", use: "Utiliser ce fond", current: "Fond actuel", free: "Offert"},
    color: {owned: "Possédée", worn: "Utilisée", use: "Composer un fond", current: "Utilisée", free: "Offerte"},
    ball: {owned: "Possédée", worn: "Utilisée", use: "Utiliser cette bille", current: "Bille actuelle", free: "Offerte"},
    chips: {owned: "Possédés", worn: "Utilisés", use: "Utiliser ces jetons", current: "Jetons actuels", free: "Offerts"},
    victory: {owned: "Possédé", worn: "Utilisé", use: "Utiliser cet effet", current: "Effet actuel", free: "Offert"},
    upgrade: {owned: "Débloquée", worn: "Active", use: "Activer", current: "Active", free: "Offerte"},
};

// Où s'applique ce qu'on achète
const APPLIES_TO: Record<Kind, string> = {
    background: "Tout le site",
    pattern: "Tout le site",
    color: "Fonds à motifs",
    ball: "Plinko",
    chips: "Roulette et Plinko",
    victory: "Fin de grille",
    upgrade: "Le jeu",
};

type Filter = "all" | "buy" | "owned";
const FILTERS: { id: Filter; label: string }[] = [{id: "all", label: "Tout"}, {id: "buy", label: "À acheter"}, {id: "owned", label: "Possédés"}];


export default function ShopPage() {
    const {section: sectionParam, set: setParam} = useParams();
    const [search] = useSearchParams();
    const auth = useAuth();
    const [owned, setOwned] = useState<string[]>([]);
    const [bestSellers, setBestSellers] = useState<BestSeller[] | null>(null);
    const [filter, setFilter] = useState<Filter>("all");
    const [factsOpen, setFactsOpen] = useState(false);
    const balls = usePlinkoBalls();
    const imageSets = useImageBackgrounds();
    const chipSets = useChipSets();
    const myBall = useMyPlinkoBall();
    const myChips = useMyChipSet();
    const myVictory = useMyVictoryEffect();
    const levels = useUpgradeLevels();

    useEffect(() => {
        if (!auth.isLoggedIn) return;
        const controller = new AbortController();
        shopService.state(controller.signal).then(s => {
            setOwned(s.owned);
            setOwnedItems(s.owned);
        }).catch(() => undefined);
        shopService.bestSellers(controller.signal).then(setBestSellers).catch(() => setBestSellers([]));
        return () => controller.abort();
    }, [auth.isLoggedIn]);

    // prix des cosmétiques avec la remise du joueur (les améliorations n'en ont pas)
    const categories = buildCategories(imageSets, balls, chipSets).map(c => c.kind === "upgrade" ? c : {
        ...c, items: c.items.map(i => ({...i, price: discountedPrice(i.price, levels)})),
    });
    const bought = (id: string) => {
        setOwned(o => [...o, id]);
        addOwnedUpgrade(id);
    };
    const loading = !imageSets || !balls || !chipSets;

    // pas de rubrique : l'accueil de la boutique, « À la une »
    const home = sectionParam === undefined;
    const section = SECTIONS.find(s => s.key === sectionParam);
    const tab: ShopTab = section?.tab ?? "cosmetiques";
    const inSection = categories.filter(c => c.section === section?.key);
    // rang de vente de chaque objet (les objets jamais vendus après tous les autres)
    const salesRank = new Map((bestSellers ?? []).map((sale, i) => [sale.itemId, i]));
    const rank = (id: string) => salesRank.get(id) ?? Number.MAX_SAFE_INTEGER;
    // tous les objets d'une rubrique à collections, les plus achetés d'abord (connecté : une fois catalogue et ventes
    // chargés ; sinon, ce qui se montre sans compte, comme les dégradés)
    const ready = !auth.isLoggedIn || (!loading && bestSellers !== null);
    const all: Category | undefined = section?.collections && ready && inSection.some(c => c.items.length > 0) ? {
        key: section.key,
        section: section.key,
        name: section.all ?? section.name,
        hint: "Triés par popularité : les plus achetés d'abord",
        cover: <span className="shop-art-icon"><FaThLarge/></span>,
        kind: inSection[0]?.kind ?? "background",
        items: inSection.filter(c => !c.soon && c.kind === inSection[0]?.kind)
            .flatMap(c => c.items.map(item => ({...item, collection: c.name})))
            .sort((a, b) => rank(a.id) - rank(b.id)),
    } : undefined;
    // ce qui est montré au centre : la collection de l'adresse, tous les objets de la rubrique, ou sa seule collection
    const category = section?.collections
        ? (setParam ? inSection.find(c => c.key === `${section.key}/${setParam}`) : all)
        : inSection.find(c => !c.soon);
    // objet montré : ?objet=<id> (depuis « À la une »), ou /boutique/jetons/<jeu>
    const preselect = search.get("objet") ?? (section?.key === "jetons" && setParam ? `chips:${setParam}` : undefined);

    // Colonne de gauche : les rubriques, ou la liste des collections d'une rubrique (Fonds, Billes Plinko).
    // Elle suit l'adresse ; « Retour » remonte aux rubriques sans changer ce qui est montré au centre.
    const [browsing, setBrowsing] = useState<SectionKey | null>(section?.collections ? section.key : null);
    const [seen, setSeen] = useState(section?.key);
    if (seen !== section?.key) {
        setSeen(section?.key);
        setBrowsing(section?.collections ? section.key : null);
    }
    const browsed = SECTIONS.find(s => s.key === browsing);

    const isOwned = (item: Item) =>
        item.free === true || owned.includes(item.id) || (item.minLevel !== undefined && auth.level >= item.minLevel);
    const wornPattern = parsePatternBackground(auth.background);
    const isWorn = (cat: Category) => (item: Item) =>
        cat.kind === "background" ? (item.id === DEFAULT_BACKGROUND.id ? auth.background === null : auth.background === item.id)
            : cat.kind === "pattern" ? wornPattern?.pattern.id === item.id
            : cat.kind === "color" ? wornPattern?.color1.id === item.id || wornPattern?.color2.id === item.id
            : cat.kind === "ball" ? myBall === item.id
            : cat.kind === "chips" ? myChips === item.id
            : cat.kind === "victory" ? myVictory === item.id
            : false;
    const progress = (items: Item[]) => {
        if (items.length > 0 && items.every(i => i.soon)) return <small><FaLock aria-hidden/> Bientôt</small>;
        // améliorations : niveaux achetés sur tous les niveaux
        const upgrades = items.map(i => findUpgrade(i.id)).filter(u => u !== undefined);
        if (upgrades.length > 0) {
            return auth.isLoggedIn && <Progress mine={upgrades.reduce((n, u) => n + (levels[u.id] ?? 0), 0)}
                                                total={upgrades.reduce((n, u) => n + u.levels.length, 0)}/>;
        }
        return auth.isLoggedIn && items.length > 0 && <Progress mine={items.filter(isOwned).length} total={items.length}/>;
    };

    return (
        // Téléphone : un appui sur le nom de l'objet déplie ses détails (voir Shop.scss)
        <main className={`shop ${factsOpen ? "facts-open" : ""}`}
              onClick={e => {
                  if ((e.target as Element).closest(".shop-detail-info")) setFactsOpen(open => !open);
              }}>
            <nav className="shop-tabs" aria-label="Boutiques">
                <Link to="/boutique" className={tab === "cosmetiques" ? "active" : ""}><FaPalette aria-hidden/> Cosmétiques</Link>
                <Link to="/boutique/ameliorations" className={tab === "ameliorations" ? "active" : ""}><FaBolt aria-hidden/> Améliorations</Link>
            </nav>

            <div className="shop-layout">
                <aside className="shop-nav" aria-label="Rubriques">
                    {browsed ? (
                        // les collections d'une rubrique (key : l'animation d'entrée rejoue à chaque changement de liste)
                        <div key={browsed.key} className="shop-nav-list sub">
                            <button type="button" className="shop-nav-back" onClick={() => setBrowsing(null)}>
                                <FaChevronLeft aria-hidden/> Toutes les rubriques
                            </button>
                            <h2>{browsed.name}</h2>
                            <Link to={`/boutique/${browsed.key}`} className={`shop-nav-item ${category?.key === browsed.key ? "active" : ""}`}
                                  aria-current={category?.key === browsed.key ? "page" : undefined}>
                                <span className="shop-nav-icon" aria-hidden><span className="shop-art-icon"><FaThLarge/></span></span>
                                <span className="shop-nav-text">
                                    <span>{browsed.all}</span>
                                    {progress(categories.filter(c => c.section === browsed.key).flatMap(c => c.items))}
                                </span>
                            </Link>
                            {categories.filter(c => c.section === browsed.key).map(c => {
                                const body = (
                                    <>
                                        <span className="shop-nav-icon" aria-hidden>{c.cover}</span>
                                        <span className="shop-nav-text">
                                            <span>{c.name}</span>
                                            {c.soon ? <small><FaLock aria-hidden/> Bientôt</small> : progress(c.items)}
                                        </span>
                                    </>
                                );
                                return c.soon
                                    ? <span key={c.key} className="shop-nav-item soon" aria-disabled>{body}</span>
                                    : <Link key={c.key} to={`/boutique/${c.key}`} className={`shop-nav-item ${c === category ? "active" : ""}`}
                                            aria-current={c === category ? "page" : undefined}>{body}</Link>;
                            })}
                        </div>
                    ) : (
                        <div key="root" className="shop-nav-list">
                            {tab === "cosmetiques" && (
                                <Link to="/boutique" className={`shop-nav-item ${home ? "active" : ""}`} aria-current={home ? "page" : undefined}>
                                    <span className="shop-nav-icon hot" aria-hidden><FaFire/></span>
                                    <span className="shop-nav-text">
                                        <span>À la une</span>
                                        <small>Meilleures ventes</small>
                                    </span>
                                </Link>
                            )}
                            {SECTIONS.filter(s => s.tab === tab).map(s => {
                                const cats = categories.filter(c => c.section === s.key);
                                return (
                                    <Link key={s.key} to={`/boutique/${s.key}`} className={`shop-nav-item ${s === section ? "active" : ""}`}
                                          aria-current={s === section ? "page" : undefined}
                                          onClick={() => s.collections && setBrowsing(s.key)}>
                                        <span className="shop-nav-icon" aria-hidden>{cats[0]?.cover}</span>
                                        <span className="shop-nav-text">
                                            <span>{s.name}</span>
                                            {progress(cats.flatMap(c => c.items))}
                                        </span>
                                        {s.collections && <FaChevronRight className="shop-nav-more" aria-hidden/>}
                                    </Link>
                                );
                            })}
                        </div>
                    )}
                    {loading && auth.isLoggedIn && <Loader label="Chargement…"/>}
                </aside>

                {home ? (
                    <Featured bestSellers={bestSellers} categories={categories} loading={loading} isOwned={isOwned}/>
                ) : category?.kind === "upgrade" ? (
                    <UpgradesView key={category.key} category={category} preselect={preselect} levels={levels} onBought={bought}/>
                ) : category?.kind === "pattern" ? (
                    <PatternsView key={category.key} category={category} preselect={preselect} filter={filter} setFilter={setFilter}
                                  isOwned={isOwned} ownsId={id => owned.includes(id)} onBought={bought}
                                  colorPrice={discountedPrice(PATTERN_COLOR_PRICE, levels)}/>
                ) : category ? (
                    <CategoryView key={category.key} category={category} preselect={preselect} filter={filter} setFilter={setFilter}
                                  isOwned={isOwned} isWorn={isWorn(category)} onBought={bought}/>
                ) : (
                    <section className="shop-panel shop-empty">
                        {!auth.isLoggedIn ? <Link to="/login" className="shop-button buy shop-login">Connecte-toi pour voir la boutique</Link>
                            : loading || bestSellers === null ? <Loader label="Chargement de la boutique…"/>
                            : <p>Cette page de la boutique n'existe pas.</p>}
                    </section>
                )}
            </div>
        </main>
    );
}

// « À la une » : les objets les plus achetés de la semaine, en grandes cartes ; un clic mène à l'objet
function Featured({bestSellers, categories, loading, isOwned}: {
    bestSellers: BestSeller[] | null;
    categories: Category[];
    loading: boolean;
    isOwned: (item: Item) => boolean;
}) {
    const {isLoggedIn} = useAuth();
    // chaque vente retrouvée dans le catalogue (un objet retiré n'est plus montré), les 6 premières
    const top = (bestSellers ?? []).flatMap(sale => {
        const category = categories.find(c => c.items.some(i => i.id === sale.itemId));
        const item = category?.items.find(i => i.id === sale.itemId);
        return category && item ? [{sale, category, item}] : [];
    }).slice(0, 6);
    const thisWeek = top.some(t => t.sale.week > 0);

    return (
        <section className="shop-panel shop-featured">
            <header className="shop-catalog-head">
                <div>
                    <h1>À la une</h1>
                    <p>{thisWeek ? "Les objets les plus achetés cette semaine" : "Les objets les plus achetés"}</p>
                </div>
            </header>

            {!isLoggedIn ? (
                <p className="shop-featured-empty"><Link to="/login" className="shop-button buy shop-login">Connecte-toi pour voir la boutique</Link></p>
            ) : bestSellers === null || loading ? (
                <div className="shop-featured-empty"><Loader label="Chargement des meilleures ventes…"/></div>
            ) : top.length === 0 ? (
                <p className="shop-featured-empty">Rien n'a encore été acheté : à toi d'ouvrir le bal !</p>
            ) : (
                <div className="shop-featured-grid">
                    {top.map(({sale, category, item}, i) => (
                        <Link key={item.id} to={`/boutique/${category.key}?objet=${encodeURIComponent(item.id)}`}
                              className={`shop-feature ${i === 0 ? "first" : ""}`}>
                            <span className="shop-feature-art">
                                {item.thumb}
                                <span className="shop-feature-rank">#{i + 1}</span>
                                <span className="shop-feature-sales">
                                    <FaFire aria-hidden/> {sale.week > 0
                                        ? `${sale.week} cette semaine`
                                        : `${sale.total} vente${sale.total > 1 ? "s" : ""}`}
                                </span>
                            </span>
                            <span className="shop-feature-foot">
                                <span>
                                    <strong>{item.name}</strong>
                                    <small>{[...new Set([SECTIONS.find(sec => sec.key === category.section)?.name, category.name])].join(" · ")}</small>
                                </span>
                                {isOwned(item)
                                    ? <span className="shop-tile-tag owned"><FaCheck aria-hidden/> À toi</span>
                                    : <span className="shop-tile-tag price"><FaCoins aria-hidden/> {item.price}</span>}
                            </span>
                        </Link>
                    ))}
                </div>
            )}
        </section>
    );
}

// Ce qu'on possède d'une rubrique ou d'une collection : une petite barre, et le compte
function Progress({mine, total}: { mine: number; total: number }) {
    return (
        <small className="shop-progress">
            <span><i style={{width: `${(mine / total) * 100}%`}}/></span>
            <b>{mine}/{total}</b>
        </small>
    );
}

type CategoryViewProps = {
    category: Category;
    preselect?: string;
    filter: Filter;
    setFilter: (f: Filter) => void;
    isOwned: (item: Item) => boolean;
    isWorn: (item: Item) => boolean;
    onBought: (id: string) => void;
};

// Une catégorie : la grille des objets, et la fiche de l'objet regardé
function CategoryView({category, preselect, filter, setFilter, isOwned, isWorn, onBought}: CategoryViewProps) {
    const auth = useAuth();
    const {items, kind} = category;
    // objet regardé : celui de l'adresse, sinon celui utilisé, sinon le premier
    const [picked, setPicked] = useState<string | undefined>(
        () => items.find(i => i.id === preselect)?.id ?? items.find(isWorn)?.id ?? items[0]?.id);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const selected = items.find(i => i.id === picked) ?? items[0];
    const shown = items.filter(i => filter === "all" || (filter === "owned") === isOwned(i));
    const mine = items.filter(isOwned).length;
    const words = WORDS[kind];

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

    const buy = (item: Item) => run(async () => {
        auth.setCredits(await shopService.buy(item.id));
        onBought(item.id);
    });

    const use = (item: Item) => run(() => equip(kind, item.id, auth.setBackground));

    // étiquette d'une vignette : utilisé, possédé, niveau requis, bientôt ou prix
    const status = (item: Item) => {
        if (item.soon) return <span className="shop-tile-tag soon"><FaLock aria-hidden/> Bientôt</span>;
        if (isWorn(item)) return <span className="shop-tile-tag worn"><FaCheck aria-hidden/> {words.worn}</span>;
        if (isOwned(item)) return <span className="shop-tile-tag owned">{item.free ? words.free : item.minLevel ? "Débloqué" : words.owned}</span>;
        if (item.minLevel !== undefined) return <span className="shop-tile-tag locked"><FaLock aria-hidden/> Niv. {item.minLevel}</span>;
        return <span className="shop-tile-tag price"><FaCoins aria-hidden/> {item.price}</span>;
    };

    return (
        <>
            <section className="shop-panel shop-catalog">
                <header className="shop-catalog-head">
                    <div>
                        <h1>{category.name}</h1>
                        <p>{category.hint}</p>
                    </div>
                    {!items.every(i => i.soon) && (
                        <div className="shop-filters" role="group" aria-label="Filtrer">
                            {FILTERS.map(f => (
                                <button key={f.id} type="button" className={filter === f.id ? "active" : ""} aria-pressed={filter === f.id}
                                        onClick={() => setFilter(f.id)}>
                                    {f.label}{f.id === "owned" && auth.isLoggedIn && <b>{mine}</b>}
                                </button>
                            ))}
                        </div>
                    )}
                </header>

                <div className={`shop-grid ${category.wide ? "wide" : ""}`} role="listbox" aria-label={category.name}>
                    {shown.map(item => (
                        <button key={item.id} type="button" role="option" aria-selected={item === selected} title={item.name}
                                className={`shop-tile ${item === selected ? "selected" : ""} ${isWorn(item) ? "worn" : ""}
                                    ${!isOwned(item) && (item.minLevel !== undefined || item.soon) ? "locked" : ""}`}
                                onClick={() => setPicked(item.id)}>
                            <span className="shop-tile-art">{item.thumb}</span>
                            <span className="shop-tile-foot">
                                <span className="shop-tile-name">{item.name}</span>
                                {status(item)}
                            </span>
                        </button>
                    ))}
                    {shown.length === 0 && (
                        <p className="shop-grid-empty">{filter === "owned" ? "Tu n'en as encore aucun ici." : "Tu as déjà tout ici !"}</p>
                    )}
                </div>
            </section>

            {selected && (
                <aside className="shop-panel shop-detail" aria-label="Objet choisi">
                    <div className="shop-detail-preview">{selected.preview}</div>

                    <div className="shop-detail-info">
                        <small>{[...new Set([SECTIONS.find(sec => sec.key === category.section)?.name, selected.collection ?? category.name])].join(" · ")}</small>
                        <h2>{selected.name}</h2>
                        {selected.description && <p>{selected.description}</p>}
                    </div>

                    <dl className="shop-detail-facts">
                        <div><dt>S'applique à</dt><dd>{APPLIES_TO[kind]}</dd></div>
                        <div>
                            <dt>{selected.minLevel !== undefined ? "Se débloque" : "Prix"}</dt>
                            <dd className={selected.minLevel === undefined && selected.price > 0 ? "gold" : ""}>
                                {selected.soon ? "Bientôt"
                                    : selected.minLevel !== undefined ? `Au niveau ${selected.minLevel}`
                                    : selected.price > 0 ? <><FaCoins aria-hidden/> {selected.price} crédits</> : "Gratuit"}
                            </dd>
                        </div>
                        {auth.isLoggedIn && !selected.soon && (
                            <div>
                                <dt>Statut</dt>
                                <dd className={isOwned(selected) ? "green" : ""}>
                                    {isWorn(selected) ? words.worn : isOwned(selected) ? words.owned
                                        : selected.minLevel !== undefined ? "Verrouillé" : "Pas encore à toi"}
                                </dd>
                            </div>
                        )}
                    </dl>

                    <div className="shop-detail-buy">
                        {selected.soon ? (
                            <button type="button" className="shop-button" disabled><FaLock aria-hidden/> Bientôt disponible</button>
                        ) : !auth.isLoggedIn ? (
                            <Link to="/login" className="shop-button">Connecte-toi pour acheter</Link>
                        ) : !isOwned(selected) && selected.minLevel !== undefined ? (
                            <button type="button" className="shop-button" disabled><FaLock aria-hidden/> Se débloque au niveau {selected.minLevel}</button>
                        ) : !isOwned(selected) ? (
                            <BuyButton price={selected.price} credits={auth.credits} busy={busy} onBuy={() => void buy(selected)}/>
                        ) : kind === "color" ? (
                            <Link to="/boutique/fonds/motifs" className="shop-button use">Composer un fond à motif</Link>
                        ) : isWorn(selected) ? (
                            <button type="button" className="shop-button" disabled><FaCheck aria-hidden/> {words.current}</button>
                        ) : (
                            <button type="button" className="shop-button use" disabled={busy} onClick={() => void use(selected)}>{words.use}</button>
                        )}
                        {error && <p className="shop-error" role="alert">{error}</p>}
                    </div>
                </aside>
            )}
        </>
    );
}

type PatternsViewProps = {
    category: Category;
    preselect?: string;
    filter: Filter;
    setFilter: (f: Filter) => void;
    isOwned: (item: Item) => boolean;
    // objet acheté (les couleurs ne sont pas des objets de cette collection)
    ownsId: (id: string) => boolean;
    onBought: (id: string) => void;
    // prix d'une couleur pour le joueur (remise comprise)
    colorPrice: number;
};

/*
 * Motifs : la grille des motifs, dessinés avec les deux couleurs choisies, et la fiche du motif regardé
 * avec le choix des couleurs (couleur 1 : le fond, couleur 2 : le motif). On achète ce qui manque
 * (le motif, puis les couleurs), puis on porte le fond composé.
 */
function PatternsView({category, preselect, filter, setFilter, isOwned, ownsId, onBought, colorPrice}: PatternsViewProps) {
    const auth = useAuth();
    const {items} = category;
    const worn = parsePatternBackground(auth.background);
    // motif regardé : celui de l'adresse, sinon celui porté, sinon le premier ; couleurs : celles du fond porté
    const [picked, setPicked] = useState<string | undefined>(
        () => items.find(i => i.id === preselect)?.id ?? worn?.pattern.id ?? items[0]?.id);
    const [color1, setColor1] = useState<string>(worn?.color1.slug ?? DEFAULT_PATTERN_COLORS[0]);
    const [color2, setColor2] = useState<string>(worn?.color2.slug ?? DEFAULT_PATTERN_COLORS[1]);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const selected = items.find(i => i.id === picked) ?? items[0];
    const shown = items.filter(i => filter === "all" || (filter === "owned") === isOwned(i));
    const slugOf = (item: Item) => item.id.replace(/^pattern-/, "");
    const hasColor = (slug: string) => {
        const color = PATTERN_COLORS.find(c => c.slug === slug);
        return color !== undefined && (color.free || ownsId(color.id));
    };
    // couleurs choisies qu'il faut encore acheter (une seule fois si c'est deux fois la même)
    const missingColors = [...new Set([color1, color2])].filter(slug => !hasColor(slug))
        .map(slug => PATTERN_COLORS.find(c => c.slug === slug)!);
    const wearId = selected ? patternBackgroundId(slugOf(selected), color1, color2) : null;

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

    // achète les objets un par un (le motif, ou les couleurs qui manquent)
    const buy = (ids: string[]) => run(async () => {
        for (const id of ids) {
            auth.setCredits(await shopService.buy(id));
            onBought(id);
        }
    });

    const use = () => run(async () => {
        await shopService.setBackground(wearId);
        auth.setBackground(wearId);
    });

    const status = (item: Item) => {
        if (worn?.pattern.id === item.id) return <span className="shop-tile-tag worn"><FaCheck aria-hidden/> Utilisé</span>;
        if (isOwned(item)) return <span className="shop-tile-tag owned">Possédé</span>;
        return <span className="shop-tile-tag price"><FaCoins aria-hidden/> {item.price}</span>;
    };

    return (
        <>
            <section className="shop-panel shop-catalog">
                <header className="shop-catalog-head">
                    <div>
                        <h1>{category.name}</h1>
                        <p>{category.hint}</p>
                    </div>
                    <div className="shop-filters" role="group" aria-label="Filtrer">
                        {FILTERS.map(f => (
                            <button key={f.id} type="button" className={filter === f.id ? "active" : ""} aria-pressed={filter === f.id}
                                    onClick={() => setFilter(f.id)}>
                                {f.label}{f.id === "owned" && auth.isLoggedIn && <b>{items.filter(isOwned).length}</b>}
                            </button>
                        ))}
                    </div>
                </header>

                <div className="shop-grid" role="listbox" aria-label={category.name}>
                    {shown.map(item => (
                        <button key={item.id} type="button" role="option" aria-selected={item === selected} title={item.name}
                                className={`shop-tile ${item === selected ? "selected" : ""}`} onClick={() => setPicked(item.id)}>
                            <span className="shop-tile-art">
                                <span className="shop-art-fill" style={{background: patternCss(slugOf(item), color1, color2, {size: 22})}}/>
                            </span>
                            <span className="shop-tile-foot">
                                <span className="shop-tile-name">{item.name}</span>
                                {status(item)}
                            </span>
                        </button>
                    ))}
                    {shown.length === 0 && (
                        <p className="shop-grid-empty">{filter === "owned" ? "Tu n'as encore aucun motif." : "Tu as déjà tous les motifs !"}</p>
                    )}
                </div>
            </section>

            {selected && (
                <aside className="shop-panel shop-detail" aria-label="Motif choisi">
                    <div className="shop-detail-preview">
                        <Previews background={patternCss(slugOf(selected), color1, color2, {size: 14})}/>
                    </div>

                    <div className="shop-detail-info">
                        <small>Fonds · Motifs</small>
                        <h2>{selected.name}</h2>
                    </div>

                    <div className="shop-pattern-colors">
                        <ColorRow label="Couleur du fond" value={color1} onChange={setColor1} hasColor={hasColor} price={colorPrice}/>
                        <button type="button" className="shop-color-swap" onClick={() => {
                            setColor1(color2);
                            setColor2(color1);
                        }}>
                            <FaExchangeAlt aria-hidden/> Inverser
                        </button>
                        <ColorRow label="Couleur du motif" value={color2} onChange={setColor2} hasColor={hasColor} price={colorPrice}/>
                    </div>

                    <dl className="shop-detail-facts">
                        <div>
                            <dt>Motif</dt>
                            <dd className={isOwned(selected) ? "green" : "gold"}>
                                {isOwned(selected) ? "À toi" : <><FaCoins aria-hidden/> {selected.price} crédits</>}
                            </dd>
                        </div>
                        <div>
                            <dt>Couleurs</dt>
                            <dd className={missingColors.length === 0 ? "green" : "gold"}>
                                {missingColors.length === 0 ? "À toi"
                                    : <>{missingColors.map(c => c.name).join(", ")} · <FaCoins aria-hidden/> {missingColors.length * colorPrice}</>}
                            </dd>
                        </div>
                    </dl>

                    <div className="shop-detail-buy">
                        {!auth.isLoggedIn ? (
                            <Link to="/login" className="shop-button">Connecte-toi pour acheter</Link>
                        ) : !isOwned(selected) ? (
                            <BuyButton label="Acheter le motif" price={selected.price} credits={auth.credits} busy={busy}
                                       onBuy={() => void buy([selected.id])}/>
                        ) : missingColors.length > 0 ? (
                            <BuyButton label={missingColors.length > 1 ? "Acheter les 2 couleurs" : "Acheter la couleur"}
                                       price={missingColors.length * colorPrice} credits={auth.credits} busy={busy}
                                       onBuy={() => void buy(missingColors.map(c => c.id))}/>
                        ) : auth.background === wearId ? (
                            <button type="button" className="shop-button" disabled><FaCheck aria-hidden/> Fond actuel</button>
                        ) : (
                            <button type="button" className="shop-button use" disabled={busy} onClick={() => void use()}>Utiliser ce fond</button>
                        )}
                        {error && <p className="shop-error" role="alert">{error}</p>}
                    </div>
                </aside>
            )}
        </>
    );
}

// Choix d'une couleur de motif : toutes les couleurs, celles à acheter avec un cadenas (on peut les essayer)
function ColorRow({label, value, onChange, hasColor, price}: {
    label: string;
    value: string;
    onChange: (slug: string) => void;
    hasColor: (slug: string) => boolean;
    price: number;
}) {
    const current = PATTERN_COLORS.find(c => c.slug === value);
    return (
        <div className="shop-color-row">
            <span>{label} · <b>{current?.name}</b>{current && !hasColor(current.slug) && <em> · à acheter</em>}</span>
            <div className="shop-color-swatches" role="radiogroup" aria-label={label}>
                {PATTERN_COLORS.map(c => {
                    const has = hasColor(c.slug);
                    return (
                        <button key={c.slug} type="button" role="radio" aria-checked={value === c.slug}
                                title={has ? c.name : `${c.name} · ${price} crédits`}
                                className={`shop-color ${value === c.slug ? "selected" : ""} ${has ? "" : "unowned"}`}
                                style={{background: c.hex}} onClick={() => onChange(c.slug)}>
                            {!has && <FaLock aria-hidden/>}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
