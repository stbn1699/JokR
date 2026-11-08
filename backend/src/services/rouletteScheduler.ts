import type {LiveRouletteRepository} from "../repository/LiveRoulette.repository.js";
import {ROULETTE_ROUND_MS, rouletteBettingOpen, rouletteRoundAt} from "../utils/roulette.js";

/*
 * Roulette en direct : chaque seconde, le serveur
 * - ferme les mises du tour en cours dès que l'heure est passée (tirage du numéro), même si personne ne joue,
 * - paie les jetons des tours fermés (y compris ceux d'avant un redémarrage du serveur),
 * - et, une fois par heure, oublie les tours sans jetons de plus de deux jours.
 * Tout est sans effet si c'est déjà fait : une seconde manquée se rattrape à la suivante.
 */
const TICK_MS = 1000;
const PRUNE_EVERY = 3600;
const KEEP_ROUNDS = (2 * 24 * 3600 * 1000) / ROULETTE_ROUND_MS;

export function startRouletteScheduler(repo: LiveRouletteRepository, log: (msg: string) => void = console.log) {
    let lastClosed: number | null = null;
    let ticks = 0;
    let running = false;

    const tick = async () => {
        if (running) return;
        running = true;
        try {
            const now = Date.now();
            const round = rouletteRoundAt(now);
            const open = rouletteBettingOpen(round, now);
            if (!open && lastClosed !== round) {
                await repo.close(round);
                lastClosed = round;
            }
            // jetons pas encore payés : tours fermés seulement (tirés au besoin, s'ils ont été manqués)
            for (const unpaid of await repo.unpaidRounds(open ? round - 1 : round)) {
                await repo.close(unpaid);
                const players = await repo.settle(unpaid);
                if (players && unpaid < round - 1) log(`Roulette : tour ${unpaid} payé en retard (${players} joueur(s))`);
            }
            if (++ticks % PRUNE_EVERY === 0) await repo.prune(round - KEEP_ROUNDS);
        } catch (err) {
            log(`Roulette : ${err instanceof Error ? err.message : String(err)}`);
        } finally {
            running = false;
        }
    };

    const timer = setInterval(() => void tick(), TICK_MS);
    timer.unref();
    void tick();
    return () => clearInterval(timer);
}
