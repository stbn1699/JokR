import webpush from "web-push";
import type {PushRepository} from "../repository/Push.repository.js";
import {isPushNight, NIGHT_HELD_KINDS, pushMessage} from "../utils/push.js";

/*
 * Envoi des notifications push : toutes les notifications passent par la table `notifications` (amis, défis, loteries,
 * résultats du jour) ; cette boucle envoie celles qui viennent d'y arriver aux appareils abonnés de leur joueur.
 * Loteries et résultats du jour attendent 9 h s'ils tombent la nuit (voir isPushNight).
 * Une notification déjà lue ou trop ancienne (serveur arrêté longtemps) n'est pas envoyée.
 */

const POLL_MS = 3000;
const BATCH = 50;
// Plus long que la nuit : un tirage de 23 h 59 part encore à 9 h
const MAX_AGE_MS = 12 * 60 * 60 * 1000;
// Téléphone éteint : le service de push garde le message 24 h
const TTL_SECONDS = 24 * 60 * 60;

type VapidKeys = { publicKey: string; privateKey: string; subject: string };

export function startPushDispatcher(repo: PushRepository, vapid: VapidKeys) {
    webpush.setVapidDetails(vapid.subject, vapid.publicKey, vapid.privateKey);
    let timer: NodeJS.Timeout | undefined;

    const send = async () => {
        const now = Date.now();
        const pending = await repo.claimPending(BATCH, isPushNight(new Date(now)) ? NIGHT_HELD_KINDS : []);
        const toSend = pending.flatMap(n => {
            if (n.read_at !== null || now - new Date(n.created_at).getTime() > MAX_AGE_MS) return [];
            const message = pushMessage(n);
            return message ? [{userId: n.user_id, message}] : [];
        });
        const devices = await repo.devices([...new Set(toSend.map(n => n.userId))]);
        await Promise.all(toSend.flatMap(({userId, message}) => devices.filter(d => d.user_id === userId).map(async d => {
            try {
                await webpush.sendNotification({endpoint: d.endpoint, keys: {p256dh: d.p256dh, auth: d.auth}},
                    JSON.stringify(message), {TTL: TTL_SECONDS, urgency: "high"});
            } catch (err) {
                const status = (err as { statusCode?: number }).statusCode;
                if (status === 404 || status === 410) await repo.forget(d.endpoint);
                else console.error(`Échec d'un envoi push (${status ?? "réseau"})`);
            }
        })));
        return pending.length;
    };

    const run = async () => {
        let delay = POLL_MS;
        try {
            // lot plein : il en reste, on continue tout de suite
            if (await send() === BATCH) delay = 0;
        } catch (err) {
            console.error("Échec de l'envoi des notifications push", err);
        }
        timer = setTimeout(() => void run(), delay);
        timer.unref();
    };

    void run();
    return () => clearTimeout(timer);
}
