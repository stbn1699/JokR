import {dailyDate, previousDailyDate} from "./dailyDate.js";

/*
 * Flamme : jours de suite où le joueur a joué : grille réussie, partie de quizz finie, mise
 * au casino, roue du jour (le jour change à minuit, heure de Paris ; voir lightStreak).
 * Le bonus ne s'applique qu'aux grilles.
 * Chaque jour de série après le premier ajoute +0,5 % d'XP et de crédits, jusqu'à +25 % (51e jour).
 * Les gains étant petits, la part qui ne fait pas encore une unité entière est gardée pour la victoire suivante.
 */

// Bonus compté en 200es : 1 = +0,5 %
const UNITS_PER_DAY = 1;
const MAX_UNITS = 50;
const UNITS_PER_REWARD = 200;

const bonusUnits = (days: number) => Math.min(MAX_UNITS, Math.max(0, days - 1) * UNITS_PER_DAY);

export const streakBonusPercent = (days: number) => bonusUnits(days) / 2;

// Série après une grille réussie aujourd'hui
export function nextStreak(days: number, lastDate: string | null, today: string): number {
    if (lastDate === today) return Math.max(days, 1);
    return lastDate === previousDailyDate(today) ? days + 1 : 1;
}

// Bonus d'un gain, et reste à garder pour la prochaine victoire
export function streakBonus(amount: number, days: number, carry: number): { bonus: number; carry: number } {
    const units = amount * bonusUnits(days) + carry;
    return {bonus: Math.floor(units / UNITS_PER_REWARD), carry: units % UNITS_PER_REWARD};
}

// ---------- Rappel de 17 h 30 (heure de Paris)
const REMINDER_HOUR = 17;
const REMINDER_MINUTE = 30;

function reminderInstant(date: string): number {
    const guess = Date.parse(`${date}T${REMINDER_HOUR}:${REMINDER_MINUTE}:00Z`);
    const parts = new Intl.DateTimeFormat("en-GB", {timeZone: "Europe/Paris", hour: "2-digit", minute: "2-digit", hourCycle: "h23"})
        .formatToParts(new Date(guess));
    const part = (type: string) => Number(parts.find(p => p.type === type)!.value);
    const offsetMinutes = part("hour") * 60 + part("minute") - (REMINDER_HOUR * 60 + REMINDER_MINUTE);
    return guess - offsetMinutes * 60_000;
}

function nextDate(date: string): string {
    const d = new Date(`${date}T12:00:00Z`);
    d.setUTCDate(d.getUTCDate() + 1);
    return d.toISOString().slice(0, 10);
}

// Prochain rappel, strictement après `now`
export function nextStreakReminder(now: Date = new Date()): Date {
    const today = dailyDate(now);
    const at = reminderInstant(today);
    return new Date(at > now.getTime() ? at : reminderInstant(nextDate(today)));
}

// Le rappel du jour est passé (utile après un redémarrage du serveur dans la soirée)
export const streakReminderPassed = (now: Date = new Date()) => now.getTime() >= reminderInstant(dailyDate(now));
