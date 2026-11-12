import type {LotteryRepository} from "../repository/Lottery.repository.js";
import {lastLotteryDraw, LOTTERY_KINDS, nextLotteryDraw} from "../utils/lottery.js";

/*
 * Tirages des loteries du Hasard, à 23 h 59 heure de Paris (voir utils/lottery.ts) :
 * - à chaque tirage prévu (quelques secondes après, pour compter les dernières mises enregistrées)
 * - au démarrage du serveur : le dernier tirage de chaque loterie, s'il a été manqué (serveur arrêté à 23 h 59).
 *   Pas au tout premier démarrage d'une loterie : on ne tire pas une période passée que personne ne connaissait.
 * Un tirage déjà fait n'est jamais refait (la base n'en accepte qu'un par loterie et par jour).
 */

// Marge après 23 h 59 : les dernières billes et le dernier tour de roulette sont enregistrés
const DRAW_MARGIN_MS = 3000;
// Nouvel essai si un tirage échoue (base indisponible…)
const RETRY_DELAY_MS = 60 * 1000;

export function startLotteryScheduler(repo: LotteryRepository, log: (msg: string) => void = console.log) {
    let timer: NodeJS.Timeout | undefined;

    const schedule = (delayMs: number) => {
        timer = setTimeout(() => void run(false), delayMs);
        timer.unref();
    };

    const run = async (startup: boolean) => {
        const now = Date.now();
        try {
            for (const kind of LOTTERY_KINDS) {
                if (startup && !(await repo.hasDraws(kind))) continue;
                const result = await repo.draw(kind, lastLotteryDraw(kind, now));
                if (result) {
                    log(result.winner
                        ? `Loterie ${kind} du ${result.date} : ${result.prize} crédits gagnés (${result.totalTickets} tickets)`
                        : `Loterie ${kind} du ${result.date} : pas de ticket, pas de gagnant`);
                }
            }
        } catch (err) {
            console.error("Échec d'un tirage de loterie, nouvel essai dans 1 min", err);
            schedule(RETRY_DELAY_MS);
            return;
        }
        const next = Math.min(...LOTTERY_KINDS.map(kind => nextLotteryDraw(kind, Date.now())));
        schedule(next - Date.now() + DRAW_MARGIN_MS);
    };

    void run(true);
    return () => clearTimeout(timer);
}
