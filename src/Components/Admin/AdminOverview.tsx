import {useEffect, useState} from "react";
import {Link} from "react-router-dom";
import {FaArrowRight, FaBroadcastTower, FaCommentDots, FaDownload, FaFlag, FaLayerGroup, FaLock, FaLockOpen, FaQuestionCircle} from "react-icons/fa";
import type {IconType} from "react-icons";
import {statsService} from "../../Services/stats.service.ts";
import {maintenanceService, type MaintenanceLive} from "../../Services/maintenance.service.ts";
import {downloadFile, toCsv} from "../Stats/exportData.ts";
import {Tile} from "../Stats/StatsWidgets.tsx";
import {fmt, pct} from "../Stats/statsFormat.ts";
import AdminPage from "./AdminPage.tsx";
import {useAdminCounts} from "./AdminCounts.tsx";
import {adminPath} from "./adminNav.ts";
import {useStatsData} from "./useStatsData.ts";

/**
 * Tableau de bord de la console d'administration : ce qui attend une décision (retours, Quizz), l'état du site
 * en direct, les chiffres du jour (puzzles et hasard) et l'export des données brutes.
 */

const NO_FILTER = {preset: null, from: null, to: null, game: null};
const LIVE_MS = 10_000;

const signed = (n: number) => `${n > 0 ? "+" : n < 0 ? "−" : ""}${fmt(Math.abs(n))}`;

export default function AdminOverview() {
    const {counts} = useAdminCounts();
    const puzzles = useStatsData("puzzles?", signal => statsService.get(NO_FILTER, signal));
    const casino = useStatsData("casino?", signal => statsService.casino(NO_FILTER, signal));
    const live = useLive();
    const [exporting, setExporting] = useState(false);
    const [exportError, setExportError] = useState<string | null>(null);

    async function exportData(format: "json" | "csv") {
        setExporting(true);
        setExportError(null);
        try {
            const raw = await statsService.export();
            const stamp = raw.exportedAt.slice(0, 10);
            if (format === "json") downloadFile(`jokr-stats-${stamp}.json`, JSON.stringify(raw, null, 2), "application/json");
            else downloadFile(`jokr-parties-${stamp}.csv`, toCsv(raw.sessions), "text/csv;charset=utf-8");
        } catch (err) {
            setExportError((err as Error).message || "Export impossible");
        } finally {
            setExporting(false);
        }
    }

    const p = puzzles.data?.overview;
    const c = casino.data?.overview;
    const online = live ? Object.values(live.pages).reduce((sum, page) => sum + page.here, 0) : null;

    return (
        <AdminPage title="Tableau de bord" description="Ce qui attend une décision, et l'essentiel du jour d'un coup d'œil."
                   onRefresh={() => {
                       puzzles.reload();
                       casino.reload();
                   }} refreshing={puzzles.loading || casino.loading}>
            <h2 className="admin-subhead">À traiter</h2>
            <section className="admin-todo">
                <TodoCard to="retours" icon={FaCommentDots} label="Retours des joueurs" count={counts.feedback}
                          detail={counts.bugs !== null ? `${counts.bugs} bug${counts.bugs > 1 ? "s" : ""} · ${counts.ideas} idée${(counts.ideas ?? 0) > 1 ? "s" : ""}` : null}/>
                <TodoCard to="quizz/themes" icon={FaLayerGroup} label="Thèmes du Quizz" count={counts.themes} detail="à valider ou refuser"/>
                <TodoCard to="quizz/questions" icon={FaQuestionCircle} label="Questions du Quizz" count={counts.questions} detail="proposées par les joueurs"/>
                <TodoCard to="quizz/contestations" icon={FaFlag} label="Contestations" count={counts.reports} detail="questions signalées en partie"/>
            </section>

            <div className="admin-overview-grid">
                <div>
                    <h2 className="admin-subhead">Aujourd'hui</h2>
                    <section className="stats-tiles admin-tiles-3">
                        <Tile label="Nouveaux comptes" value={p ? `+${fmt(p.users.new1)}` : "…"} detail={p ? `+${p.users.new7} en 7 j · ${fmt(p.users.total)} inscrits` : ""}/>
                        <Tile label="Joueurs actifs" value={p ? fmt(p.users.active1) : "…"} detail={p ? `${p.users.active7} en 7 j · ${p.users.active30} en 30 j` : ""}/>
                        <Tile label="Parties lancées" value={p ? fmt(p.sessions.started1) : "…"} detail={p ? `${fmt(p.sessions.started7)} en 7 j · ${pct(p.sessions.finished, p.sessions.started)} terminées` : ""}/>
                        <Tile label="Mises au hasard" value={c ? fmt(c.plays1) : "…"} detail={c ? `sur 24 h · ${fmt(c.players7)} joueurs en 7 j` : ""}/>
                        <Tile label="Crédits misés" value={c ? fmt(c.wagered1) : "…"} detail={c ? `sur 24 h · ${fmt(c.paid1)} rendus` : ""}/>
                        <Tile label="Bénéfice de la maison" value={c ? signed(c.wagered1 - c.paid1) : "…"} detail="sur 24 h"/>
                    </section>
                </div>

                <div>
                    <h2 className="admin-subhead">Le site</h2>
                    <Link to={adminPath("direct")} className={`admin-site-card ${live?.maintenance.on ? "closed" : ""}`}>
                        {live?.maintenance.on ? <FaLock aria-hidden/> : <FaLockOpen aria-hidden/>}
                        <div>
                            <strong>{!live ? "…" : live.maintenance.on ? "Fermé pour la mise à jour" : "Ouvert"}</strong>
                            <span>{online === null ? "Chargement…" : `${fmt(online)} onglet${online > 1 ? "s" : ""} ouvert${online > 1 ? "s" : ""} en ce moment`}
                                {live && live.puzzles.length > 0 && ` · ${live.puzzles.length} puzzle${live.puzzles.length > 1 ? "s" : ""} en cours`}</span>
                        </div>
                        <span className="admin-site-go"><FaBroadcastTower aria-hidden/> En direct <FaArrowRight aria-hidden/></span>
                    </Link>

                    <h2 className="admin-subhead">Données brutes</h2>
                    <div className="admin-export">
                        <p>Tout l'historique des puzzles, pour l'analyser ailleurs.</p>
                        <div className="admin-actions">
                            <button type="button" onClick={() => void exportData("json")} disabled={exporting}><FaDownload aria-hidden/> Tout (JSON)</button>
                            <button type="button" onClick={() => void exportData("csv")} disabled={exporting}><FaDownload aria-hidden/> Parties (CSV)</button>
                        </div>
                        {exportError && <p className="stats-error">{exportError}</p>}
                    </div>
                </div>
            </div>
        </AdminPage>
    );
}

function TodoCard({to, icon: Icon, label, count, detail}: { to: string; icon: IconType; label: string; count: number | null; detail: string | null }) {
    return (
        <Link to={adminPath(to)} className={`admin-todo-card ${count ? "pending" : ""}`}>
            <span className="admin-todo-icon"><Icon aria-hidden/></span>
            <span className="admin-todo-label">{label}</span>
            <strong className="admin-todo-count">{count ?? "…"}</strong>
            <span className="admin-todo-detail">{count === 0 ? "Rien à traiter" : detail}</span>
        </Link>
    );
}

// État du site en direct, rafraîchi toutes les 10 secondes
function useLive(): MaintenanceLive | null {
    const [live, setLive] = useState<MaintenanceLive | null>(null);
    useEffect(() => {
        const controller = new AbortController();
        const load = () => maintenanceService.live(controller.signal).then(setLive).catch(() => undefined);
        const first = window.setTimeout(load, 0);
        const timer = window.setInterval(load, LIVE_MS);
        return () => {
            controller.abort();
            window.clearTimeout(first);
            window.clearInterval(timer);
        };
    }, []);
    return live;
}
