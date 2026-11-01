import type {DailyService} from "./Daily.service.js";
import {dailyDate, nextDailyChange} from "../utils/dailyDate.js";

/*
 * Génère les défis du jour de tous les jeux :
 * - au démarrage du serveur (si ceux du jour manquent encore),
 * - puis chaque jour à minuit, heure de Paris.
 * Les joueurs n'attendent jamais la génération, et tout le monde reçoit les mêmes grilles.
 * Plusieurs serveurs peuvent tourner ensemble : la base n'accepte qu'une grille par jeu et par jour.
 */

// Nouvel essai si la génération échoue (base indisponible…)
const RETRY_DELAY_MS = 60 * 1000;

export function startDailyScheduler(service: DailyService, log: (msg: string) => void = console.log) {
    let timer: NodeJS.Timeout | undefined;

    const schedule = (delayMs: number) => {
        timer = setTimeout(() => void run(), delayMs);
        // N'empêche pas le processus de s'arrêter
        timer.unref();
    };

    const run = async () => {
        const date = dailyDate();
        try {
            const created = await service.generateAll(date);
            if (created.length) log(`Défis du ${date} générés : ${created.join(", ")}`);
        } catch (err) {
            console.error(`Échec de la génération des défis du ${date}, nouvel essai dans 1 min`, err);
            schedule(RETRY_DELAY_MS);
            return;
        }
        // Prochain passage : minuit (+1 s de marge pour être sûr d'avoir changé de jour)
        schedule(nextDailyChange().getTime() - Date.now() + 1000);
    };

    void run();
    return () => clearTimeout(timer);
}
