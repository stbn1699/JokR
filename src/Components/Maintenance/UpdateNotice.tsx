/**
 * Message aux joueurs encore en partie quand une mise à jour est activée (sans les stresser) :
 * - puzzle : finir sa grille tranquillement, compte à rebours avant l'écran de mise à jour
 * - roulette : c'est le dernier tour, le site ferme une fois les gains versés
 * - Plinko : plus de nouvelle bille, le site ferme quand les dernières sont tombées
 */

import "./Maintenance.scss";
import {useEffect, useState} from "react";
import type {SiteMaintenance} from "../../Services/maintenance.ts";

const countdown = (ms: number) => {
    const s = Math.max(0, Math.ceil(ms / 1000));
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
};

export default function UpdateNotice({site}: { site: SiteMaintenance }) {
    const [now, setNow] = useState(() => Date.now());
    const puzzle = site.activity?.page === "puzzle";
    useEffect(() => {
        if (!puzzle) return;
        const timer = window.setInterval(() => setNow(Date.now()), 1000);
        return () => window.clearInterval(timer);
    }, [puzzle]);

    const a = site.activity;
    if (!site.on || !a) return null;
    const text = a.page === "puzzle"
        ? <>Une mise à jour va arriver : termine ta grille tranquillement. Le site fermera dans
            <b> {countdown((site.deadline ?? now) - now)}</b>, ou dès ta grille validée.</>
        : a.page === "roulette"
            ? <>Une mise à jour va arriver : c'est le dernier tour. Le site fermera une fois les gains versés.</>
            : <>Une mise à jour va arriver : plus de nouvelle bille. Le site fermera quand les tiennes seront tombées.</>;
    return <div className="update-notice" role="status">{text}</div>;
}
