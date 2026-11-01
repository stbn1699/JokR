import {useEffect, useState} from "react";
import {formatClock} from "../../Services/format.ts";
import type {Clock} from "./useGameFlow.ts";

/**
 * Chrono de la partie, dans le panneau Actions.
 * Défile chaque seconde ; une fois la partie gagnée, affiche le temps mesuré par le serveur.
 */
export default function GameTimer({clock}: { clock: Clock }) {
    const [now, setNow] = useState(() => Date.now());
    const running = clock.startedAt !== null && clock.finalMs === null;

    useEffect(() => {
        if (!running) return;
        const timer = window.setInterval(() => setNow(Date.now()), 1000);
        return () => window.clearInterval(timer);
    }, [running]);

    if (clock.startedAt === null) return null;

    const elapsed = clock.finalMs ?? Math.max(0, now - clock.startedAt);

    return (
        <div className={`game-timer ${running ? "" : "stopped"}`} aria-label="Temps de la partie">
            <span className="game-timer-icon" aria-hidden>⏱</span>
            <span className="game-timer-value">{formatClock(elapsed)}</span>
        </div>
    );
}
