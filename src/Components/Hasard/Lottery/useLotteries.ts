import {useCallback, useEffect, useState} from "react";
import {casinoService, type LotteryInfo} from "../../../Services/casino.service.ts";

const POLL_MS = 15_000;

/*
 * Les trois loteries (jour, semaine, mois), rafraîchies toutes les 15 s, et l'heure qui avance chaque seconde
 * (comptes à rebours). Après un tirage, on recharge pour avoir la nouvelle période et le gagnant.
 * `enabled` : joueur connecté (les loteries parlent de ses tickets).
 */
export function useLotteries(enabled: boolean) {
    const [lotteries, setLotteries] = useState<LotteryInfo[] | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [now, setNow] = useState(() => Date.now());

    const load = useCallback(async (signal?: AbortSignal) => {
        try {
            setLotteries(await casinoService.lottery(signal));
            setError(null);
        } catch (err) {
            if ((err as Error).name === "AbortError") return;
            setError((err as Error).message || "Impossible de charger les loteries");
        }
    }, []);

    useEffect(() => {
        if (!enabled) return;
        const controller = new AbortController();
        const first = window.setTimeout(() => void load(controller.signal), 0);
        const timer = window.setInterval(() => void load(controller.signal), POLL_MS);
        const clock = window.setInterval(() => setNow(Date.now()), 1000);
        return () => {
            controller.abort();
            window.clearTimeout(first);
            window.clearInterval(timer);
            window.clearInterval(clock);
        };
    }, [enabled, load]);

    const drawPassed = lotteries?.some(l => l.drawAt <= now) ?? false;
    useEffect(() => {
        if (!drawPassed) return;
        const timer = window.setTimeout(() => void load(), 4000);
        return () => window.clearTimeout(timer);
    }, [drawPassed, load]);

    return {lotteries, error, now};
}
