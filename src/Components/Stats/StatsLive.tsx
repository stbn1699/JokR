/**
 * Onglet « En direct » des Statistiques (administrateur) : préparer une mise à jour.
 * - qui est où : joueurs sur les puzzles, la roulette, le Plinko et le reste du site (chaque onglet le dit au
 *   serveur), puzzles en cours, tour de roulette, billes de Plinko en l'air
 * - un bouton ferme le site pour la mise à jour, ou le rouvre. Chaque joueur passe sur l'écran « Mise à jour en
 *   cours » une fois sa partie finie ; une notification prévient à chaque départ (avec le nombre de joueurs) et
 *   un journal les garde
 * - un voyant passe au vert quand plus personne ne joue : la mise à jour peut se faire
 * Pendant la mise à jour, cette page reste ouverte aux administrateurs (adresse /stats tapée à la main).
 * Rafraîchi toutes les 2 secondes. Le redémarrage du serveur (la mise à jour) rouvre tout seul le site.
 */

import {useCallback, useEffect, useRef, useState} from "react";
import {FaCheckCircle, FaHourglassHalf, FaLock, FaLockOpen} from "react-icons/fa";
import {maintenanceService, type MaintenanceLive, type PresencePage} from "../../Services/maintenance.service.ts";
import {refreshMaintenance} from "../../Services/maintenance.ts";
import {DAILY_GAME_NAMES} from "../../Services/dailyGames.ts";
import {Tile} from "./StatsWidgets.tsx";
import {duration, fmt} from "./statsFormat.ts";
import Loader from "../Loader/Loader.tsx";

const POLL_MS = 2000;
// durée d'affichage d'une notification de départ
const TOAST_MS = 8000;

const PAGE_NAMES: Record<PresencePage, string> = {puzzle: "Puzzles", roulette: "Roulette", plinko: "Plinko", site: "Reste du site"};
const PAGE_ORDER: PresencePage[] = ["puzzle", "roulette", "plinko", "site"];

const clock = (ms: number) => new Date(ms).toLocaleTimeString("fr-FR", {hour: "2-digit", minute: "2-digit", second: "2-digit"});
const ago = (ms: number) => (ms < 60_000 ? `il y a ${Math.max(0, Math.round(ms / 1000))} s` : `il y a ${duration(ms)}`);
const players = (n: number) => `${fmt(n)} joueur${n > 1 ? "s" : ""}`;

type Toast = { id: number; at: number; page: PresencePage; count: number };

export default function StatsLive() {
    const [live, setLive] = useState<MaintenanceLive | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);
    const [toasts, setToasts] = useState<Toast[]>([]);
    // départs déjà vus (null : premier chargement, rien à annoncer)
    const seenEvents = useRef<number | null>(null);
    const nextToast = useRef(0);

    const load = useCallback(async (signal?: AbortSignal) => {
        try {
            const data = await maintenanceService.live(signal);
            // nouveaux départs vers l'écran de mise à jour : une notification par page, avec le nombre de joueurs
            const seen = seenEvents.current;
            if (seen !== null && data.events.length > seen) {
                const counts = new Map<PresencePage, number>();
                for (const e of data.events.slice(seen)) counts.set(e.page, (counts.get(e.page) ?? 0) + 1);
                const fresh = [...counts].map(([page, count]) => ({id: nextToast.current++, at: Date.now(), page, count}));
                setToasts(t => [...t, ...fresh]);
            }
            seenEvents.current = data.events.length;
            setLive(data);
            setError(null);
        } catch (err) {
            if ((err as Error).name === "AbortError") return;
            setError((err as Error).message || "Impossible de joindre le serveur");
        }
    }, []);

    useEffect(() => {
        const controller = new AbortController();
        const first = window.setTimeout(() => void load(controller.signal), 0);
        const timer = window.setInterval(() => void load(controller.signal), POLL_MS);
        return () => {
            controller.abort();
            window.clearTimeout(first);
            window.clearInterval(timer);
        };
    }, [load]);

    // notifications effacées au bout de quelques secondes
    useEffect(() => {
        if (toasts.length === 0) return;
        const timer = window.setTimeout(() => setToasts(t => t.slice(1)), Math.max(0, toasts[0].at + TOAST_MS - Date.now()));
        return () => window.clearTimeout(timer);
    }, [toasts]);

    async function toggle(on: boolean) {
        if (on && !window.confirm("Fermer le site pour la mise à jour ? Chaque joueur passera sur l'écran « Mise à jour en cours » une fois sa partie finie.")) return;
        setBusy(true);
        try {
            await maintenanceService.set(on);
            seenEvents.current = 0;
            refreshMaintenance();
            await load();
        } catch (err) {
            setError((err as Error).message || "Action impossible");
        } finally {
            setBusy(false);
        }
    }

    if (!live) return error ? <p className="stats-status stats-error" role="alert">{error}</p> : <Loader label="Chargement…"/>;

    const {maintenance: m, pages, events, puzzles, roulette, plinko, now} = live;
    const waiting = [
        pages.puzzle.here > 0 && `${players(pages.puzzle.here)} sur un puzzle`,
        pages.roulette.here > 0 && `${players(pages.roulette.here)} sur la roulette`,
        pages.plinko.here > 0 && `${players(pages.plinko.here)} sur le Plinko`,
        roulette.busy && (roulette.lastRoundEndsAt !== null && now < roulette.lastRoundEndsAt
            ? `dernier tour de roulette (fin à ${clock(roulette.lastRoundEndsAt)})` : "gains de la roulette"),
        plinko.inFlight > 0 && `${fmt(plinko.inFlight)} bille${plinko.inFlight > 1 ? "s" : ""} en l'air`,
    ].filter(Boolean);
    const sentTotal = PAGE_ORDER.reduce((sum, p) => sum + pages[p].sent, 0);

    return (
        <div className="stats-live fade-in">
            {error && <p className="stats-status stats-error" role="alert">{error}</p>}

            {/* départs vers l'écran de mise à jour, page par page */}
            <div className="stats-live-toasts" aria-live="polite">
                {toasts.map(t => (
                    <div key={t.id} className="stats-live-toast">
                        <strong>{PAGE_NAMES[t.page]}</strong> : {players(t.count)} envoyé{t.count > 1 ? "s" : ""} sur l'écran de mise à jour
                    </div>
                ))}
            </div>

            <section className={`stats-live-switch ${m.on ? "on" : ""} ${live.ready ? "ready" : ""}`}>
                <div className="stats-live-state">
                    {!m.on ? <>
                        <FaLockOpen aria-hidden/>
                        <div>
                            <strong>Le site est ouvert</strong>
                            <span>Avant une mise à jour, regarde qui joue, puis ferme le site.</span>
                        </div>
                    </> : live.ready ? <>
                        <FaCheckCircle aria-hidden/>
                        <div>
                            <strong>Plus personne ne joue : tu peux lancer la mise à jour</strong>
                            <span>Site fermé depuis {clock(m.since ?? now)} · {players(sentTotal)} sur l'écran de mise à jour.
                                Le redémarrage du serveur rouvrira le site tout seul.</span>
                        </div>
                    </> : <>
                        <FaHourglassHalf aria-hidden/>
                        <div>
                            <strong>Site fermé, les joueurs finissent leur partie</strong>
                            <span>Encore en cours : {waiting.join(", ") || "presque fini"}.</span>
                        </div>
                    </>}
                </div>
                <button type="button" disabled={busy} onClick={() => void toggle(!m.on)}>
                    {m.on ? <><FaLockOpen aria-hidden/> Rouvrir le site</> : <><FaLock aria-hidden/> Fermer le site pour la mise à jour</>}
                </button>
            </section>

            <div className="stats-tiles">
                {PAGE_ORDER.map(p => (
                    <Tile key={p} label={PAGE_NAMES[p]} value={fmt(pages[p].here)}
                          detail={m.on ? `encore sur la page · ${fmt(pages[p].sent)} envoyé${pages[p].sent > 1 ? "s" : ""} sur l'écran` : "joueurs sur la page"}/>
                ))}
                <Tile label="Tour de roulette" value={roulette.players > 0 ? players(roulette.players) : "Personne"}
                      detail={`${fmt(roulette.total)} crédits misés · ${roulette.open ? `mises jusqu'à ${clock(roulette.closesAt)}` : "la roue tourne"}`}/>
                <Tile label="Billes de Plinko" value={fmt(plinko.inFlight)} detail="en l'air (8 dernières secondes)"/>
            </div>

            <section className="stats-section">
                <h2>Puzzles en cours</h2>
                {puzzles.length === 0 ? <p className="stats-note">Personne n'a de puzzle en cours.</p> : (
                    <div className="stats-table-wrap">
                        <table className="stats-table">
                            <thead>
                            <tr><th>Jeu</th><th>Joueur</th><th>Type</th><th>Commencée</th><th>Vu</th></tr>
                            </thead>
                            <tbody>
                            {puzzles.map(p => (
                                <tr key={p.key}>
                                    <td>{p.gameCode ? DAILY_GAME_NAMES[p.gameCode] ?? p.gameCode : "–"}</td>
                                    <td>{p.username ?? "Invité"}</td>
                                    <td>{p.challenge ? "Défi" : "Partie"}</td>
                                    <td>{p.startedAt !== null ? ago(now - p.startedAt) : "–"}</td>
                                    <td>{ago(now - p.lastSeen)}</td>
                                </tr>
                            ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </section>

            {m.on && events.length > 0 && (
                <section className="stats-section">
                    <h2>Envoyés sur l'écran de mise à jour</h2>
                    <ul className="stats-live-log">
                        {[...events].reverse().map((e, i) => (
                            <li key={events.length - i}><span>{clock(e.at)}</span> {PAGE_NAMES[e.page]}</li>
                        ))}
                    </ul>
                </section>
            )}
        </div>
    );
}
