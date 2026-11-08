/**
 * Onglet « Boutique » de la page Statistiques (administrateur) :
 * - chiffres clés : achats, crédits dépensés, acheteurs, joueurs qui portent un fond
 * - achats et crédits dépensés par jour
 * - chaque fond : ventes, crédits, combien le portent (y compris ceux jamais vendus et les couleurs de niveau)
 * - fonds portés en ce moment, plus gros acheteurs, derniers achats
 */

import {useCallback, useEffect, useState} from "react";
import {FaSyncAlt} from "react-icons/fa";
import {statsService} from "../../Services/stats.service.ts";
import type {ShopStatsData} from "../../Models/shopStats.model.ts";
import {DEFAULT_BACKGROUND, findGradient, GRADIENTS, gradientCss, TIER_GRADIENTS} from "../../Services/shopCatalog.ts";
import BarChart from "./BarChart.tsx";
import {Tile} from "./StatsWidgets.tsx";
import {dateTime, fmt, longDay, pct, shortDay} from "./statsFormat.ts";
import Loader from "../Loader/Loader.tsx";
import {plinkoBallFile, usePlinkoBalls} from "../../Services/plinkoBalls.ts";
import {chipFile, useChipSets} from "../../Services/chipSets.ts";

const SHOP_COLOR = "#c98500";

// Nom d'un objet (fond ou bille de Plinko), avec son aperçu
function ItemName({id}: { id: string | null }) {
    const balls = usePlinkoBalls();
    const chipSets = useChipSets();
    if (id?.startsWith("chips:")) {
        const set = chipSets?.sets.find(s => s.id === id);
        return (
            <span className="stats-item">
                <img className="stats-ball" src={chipFile(100, id, chipSets)} alt=""/>
                {set ? `Jetons ${set.name.toLowerCase()}` : id}
            </span>
        );
    }
    if (id?.startsWith("ball:")) {
        const ball = balls?.sets.flatMap(s => s.balls.map(b => ({...b, setName: s.name}))).find(b => b.id === id);
        return (
            <span className="stats-item">
                <img className="stats-ball" src={plinkoBallFile(id, balls)} alt=""/>
                {ball ? `Bille ${ball.name.toLowerCase()} (${ball.setName.toLowerCase()})` : id}
            </span>
        );
    }
    const gradient = id === null ? DEFAULT_BACKGROUND : findGradient(id);
    const kind = id === null ? "" : id.startsWith("tier-") ? " (niveau)" : "";
    return (
        <span className="stats-item">
            {gradient && <i className="stats-swatch" style={{background: gradientCss(gradient)}}/>}
            {gradient ? gradient.name : id}{kind}
        </span>
    );
}

export default function ShopStats() {
    const [data, setData] = useState<ShopStatsData | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const load = useCallback(async (signal?: AbortSignal) => {
        setLoading(true);
        setError(null);
        try {
            setData(await statsService.shop(signal));
        } catch (err) {
            if ((err as Error).name === "AbortError") return;
            setError((err as Error).message || "Impossible de charger les statistiques de la boutique");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        const controller = new AbortController();
        const timer = window.setTimeout(() => void load(controller.signal), 0);
        return () => {
            window.clearTimeout(timer);
            controller.abort();
        };
    }, [load]);

    return (
        <>
            <div className="stats-tab-head">
                {data && <p className="stats-sub">Mises à jour le {dateTime(data.generatedAt)}
                    {data.overview.first && <> · premier achat le {dateTime(data.overview.first)}</>}</p>}
                <div className="stats-actions">
                    <button type="button" onClick={() => void load()} disabled={loading}><FaSyncAlt aria-hidden/> Actualiser</button>
                </div>
            </div>
            {error && <p className="stats-status stats-error" role="alert">{error}</p>}
            {!data && !error && <Loader label="Chargement des statistiques de la boutique…"/>}
            {data && <div className="fade-in"><ShopContent data={data}/></div>}
        </>
    );
}

function ShopContent({data}: { data: ShopStatsData }) {
    const o = data.overview;
    const sold = new Map(data.items.map(i => [i.itemId, i]));
    const wornBy = new Map(data.worn.map(w => [w.background, w.players]));
    const best = data.items[0];
    const unsold = GRADIENTS.filter(g => !sold.has(g.id));
    // catalogue complet des dégradés, les plus vendus d'abord
    const catalog = [...GRADIENTS].sort((a, b) => (sold.get(b.id)?.sales ?? 0) - (sold.get(a.id)?.sales ?? 0));

    return (
        <>
            {/* ---------- Chiffres clés */}
            <section className="stats-tiles">
                <Tile label="Achats" value={fmt(o.purchases)} detail={`${fmt(o.purchases1)} sur 24 h · ${fmt(o.purchases7)} sur 7 j`}/>
                <Tile label="Crédits dépensés" value={fmt(o.spent)} detail={`${fmt(o.spent7)} sur 7 j · ${fmt(o.creditsHeld)} crédits encore détenus par les joueurs`}/>
                <Tile label="Acheteurs" value={fmt(o.buyers)} detail={`${pct(o.buyers, o.users)} des joueurs · ${fmt(o.buyers7)} sur 7 j`}/>
                <Tile label="Achats par acheteur" value={o.buyers ? (o.purchases / o.buyers).toFixed(1).replace(".", ",") : "–"}
                      detail={`${o.buyers ? fmt(o.spent / o.buyers) : "–"} crédits dépensés en moyenne`}/>
                <Tile label="Joueurs avec un fond" value={pct(o.wearing, o.users)}
                      detail={`${fmt(o.wearing)} sur ${fmt(o.users)} · ${fmt(o.users - o.wearing)} gardent le fond par défaut`}/>
                <Tile label="Fonds achetés portés" value={fmt(o.wearingBought)} detail={`${fmt(o.wearingTier)} portent une couleur de niveau (gratuite)`}/>
                <Tile label="Fond le plus vendu" value={best ? (findGradient(best.itemId)?.name ?? best.itemId) : "–"}
                      detail={best ? `${fmt(best.sales)} vente${best.sales > 1 ? "s" : ""} · ${fmt(best.wearing)} le portent` : "Aucune vente"}/>
                <Tile label="Dégradés jamais vendus" value={`${unsold.length} / ${GRADIENTS.length}`}
                      detail={unsold.length ? unsold.slice(0, 4).map(g => g.name).join(", ") + (unsold.length > 4 ? "…" : "") : "Tous ont trouvé preneur"}/>
            </section>

            {/* ---------- Activité */}
            <section className="stats-section stats-two">
                <div>
                    <h2>Achats, 30 derniers jours</h2>
                    <BarChart ariaLabel="Achats par jour" labelEvery={5} color={SHOP_COLOR}
                              bars={data.timeline.map(t => ({label: shortDay(t.day), title: `${longDay(t.day)} · ${t.buyers} acheteur(s)`, value: t.purchases}))}/>
                </div>
                <div>
                    <h2>Crédits dépensés, 30 derniers jours</h2>
                    <BarChart ariaLabel="Crédits dépensés par jour" labelEvery={5} color={SHOP_COLOR}
                              bars={data.timeline.map(t => ({label: shortDay(t.day), title: longDay(t.day), value: t.spent}))}/>
                </div>
            </section>

            {/* ---------- Catalogue */}
            <section className="stats-section stats-two">
                <div>
                    <h2>Dégradés : ventes</h2>
                    <div className="stats-table-wrap">
                        <table className="stats-table">
                            <thead><tr><th className="text">Fond</th><th>Ventes</th><th>7 j</th><th>Crédits</th><th>Portés</th><th>Dernière vente</th></tr></thead>
                            <tbody>
                            {catalog.map(g => {
                                const item = sold.get(g.id);
                                return (
                                    <tr key={g.id} className={item ? "" : "stats-muted"}>
                                        <td className="text"><ItemName id={g.id}/></td>
                                        <td>{fmt(item?.sales ?? 0)}</td><td>{fmt(item?.sales7 ?? 0)}</td><td>{fmt(item?.spent ?? 0)}</td>
                                        <td>{fmt(wornBy.get(g.id) ?? 0)}</td><td>{item ? dateTime(item.last) : "–"}</td>
                                    </tr>
                                );
                            })}
                            </tbody>
                        </table>
                    </div>
                </div>
                <div>
                    <h2>Fonds portés en ce moment</h2>
                    <div className="stats-table-wrap">
                        <table className="stats-table">
                            <thead><tr><th className="text">Fond</th><th>Joueurs</th><th>Part</th></tr></thead>
                            <tbody>
                            {data.worn.map(w => (
                                <tr key={w.background ?? "default"}>
                                    <td className="text"><ItemName id={w.background}/></td>
                                    <td>{fmt(w.players)}</td><td>{pct(w.players, o.users)}</td>
                                </tr>
                            ))}
                            </tbody>
                        </table>
                    </div>
                    <h2 className="stats-subtitle">Couleurs de niveau portées</h2>
                    <div className="stats-table-wrap">
                        <table className="stats-table">
                            <thead><tr><th className="text">Couleur</th><th>Niveau</th><th>Joueurs</th></tr></thead>
                            <tbody>
                            {TIER_GRADIENTS.map(t => (
                                <tr key={t.id} className={wornBy.get(t.id) ? "" : "stats-muted"}>
                                    <td className="text"><ItemName id={t.id}/></td><td>{t.minLevel}</td><td>{fmt(wornBy.get(t.id) ?? 0)}</td>
                                </tr>
                            ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </section>

            {/* ---------- Joueurs */}
            <section className="stats-section stats-two">
                <div>
                    <h2>Plus gros acheteurs</h2>
                    {data.buyers.length === 0 ? <p className="stats-note">Personne n'a encore rien acheté.</p> : (
                        <div className="stats-table-wrap">
                            <table className="stats-table">
                                <thead><tr><th className="text">Joueur</th><th>Achats</th><th>Dépensé</th><th>Crédits</th><th className="text">Fond porté</th><th>Dernier achat</th></tr></thead>
                                <tbody>
                                {data.buyers.map(b => (
                                    <tr key={b.username}>
                                        <td className="text">{b.username}</td><td>{fmt(b.purchases)}</td><td>{fmt(b.spent)}</td><td>{fmt(b.credits)}</td>
                                        <td className="text"><ItemName id={b.background}/></td><td>{dateTime(b.last)}</td>
                                    </tr>
                                ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
                <div>
                    <h2>Derniers achats</h2>
                    {data.recent.length === 0 ? <p className="stats-note">Aucun achat pour l'instant.</p> : (
                        <div className="stats-table-wrap">
                            <table className="stats-table">
                                <thead><tr><th className="text">Joueur</th><th className="text">Objet</th><th>Prix</th><th>Quand</th></tr></thead>
                                <tbody>
                                {data.recent.map((r, i) => (
                                    <tr key={i}>
                                        <td className="text">{r.username}</td><td className="text"><ItemName id={r.itemId}/></td>
                                        <td>{fmt(r.price)}</td><td>{dateTime(r.at)}</td>
                                    </tr>
                                ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </section>
        </>
    );
}
