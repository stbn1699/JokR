import type {StreakRepository} from "../repository/Streak.repository.js";
import {dailyDate} from "../utils/dailyDate.js";
import {isPushNight} from "../utils/push.js";
import {nextStreakReminder, streakReminderPassed} from "../utils/streak.js";

/*
 * Rappel de la flamme, chaque jour à 17 h 30 (heure de Paris), pour les joueurs qui n'ont pas encore fait de grille.
 * Serveur redémarré dans la soirée : le rappel manqué part au démarrage, mais jamais la nuit.
 */

const RETRY_DELAY_MS = 60 * 1000;

export function startStreakScheduler(repo: StreakRepository, log: (msg: string) => void = console.log) {
    let timer: NodeJS.Timeout | undefined;

    const schedule = (delayMs: number) => {
        timer = setTimeout(() => void run(), delayMs);
        timer.unref();
    };

    const run = async () => {
        const now = new Date();
        try {
            if (streakReminderPassed(now) && !isPushNight(now)) {
                const sent = await repo.remind(dailyDate(now));
                if (sent) log(`Flamme : ${sent} rappel(s) envoyé(s)`);
            }
        } catch (err) {
            console.error("Échec du rappel de la flamme, nouvel essai dans 1 min", err);
            schedule(RETRY_DELAY_MS);
            return;
        }
        schedule(nextStreakReminder().getTime() - Date.now() + 1000);
    };

    void run();
    return () => clearTimeout(timer);
}
