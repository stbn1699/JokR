/*
 * Roue du jour (page Hasard) : un lancer gratuit par jour (le jour change à minuit, heure de Paris).
 * Commun au serveur (tirage) et au site (dessin de la roue). Gains possibles :
 * - credits / xp : `amount` crédits ou XP
 * - respin : un lancer de plus aujourd'hui
 * - item : une bille de Plinko de la boutique que le joueur n'a pas encore (s'il les a toutes :
 *   WHEEL_ITEM_FALLBACK crédits à la place)
 * - lottery : des tickets pour une loterie (jour, semaine ou mois), 1 000 par jour de la période :
 *   1 000 pour celle du jour, 7 000 pour la semaine, 28 000 à 31 000 pour le mois (voir wheelTickets)
 *
 * Les cases ont toutes la même taille sur la roue, mais pas la même chance de tomber : `weight` sur 1000.
 * En moyenne un lancer rapporte ~43 crédits et ~32 XP, sans compter les relances, les billes et les tickets.
 * Le numéro d'une case (sa place dans WHEEL_SEGMENTS) est enregistré avec chaque lancer : ajouter des cases
 * à la fin, ne pas réordonner celles qui existent. Leur place sur la roue est donnée par WHEEL_ORDER.
 */

import type {LotteryKind} from "./lottery.js";

export type WheelReward = "credits" | "xp" | "respin" | "item" | "lottery";

export type WheelSegment = {
    reward: WheelReward;
    amount: number;
    // chances sur 1000
    weight: number;
    jackpot?: boolean;
    // case « tickets » : la loterie qui les reçoit
    lottery?: LotteryKind;
};

export const WHEEL_SEGMENTS: readonly WheelSegment[] = [
    {reward: "credits", amount: 25, weight: 185},
    {reward: "xp", amount: 50, weight: 150},
    {reward: "credits", amount: 100, weight: 110},
    {reward: "xp", amount: 100, weight: 90},
    {reward: "credits", amount: 1000, weight: 5, jackpot: true},
    {reward: "xp", amount: 200, weight: 30},
    {reward: "credits", amount: 50, weight: 150},
    {reward: "credits", amount: 250, weight: 40},
    {reward: "respin", amount: 1, weight: 60},
    {reward: "item", amount: 0, weight: 25},
    {reward: "credits", amount: 500, weight: 15},
    {reward: "xp", amount: 25, weight: 105},
    {reward: "lottery", lottery: "day", amount: 1000, weight: 20},
    {reward: "lottery", lottery: "week", amount: 7000, weight: 10},
    // 1 000 par jour du mois en cours : le montant exact est calculé au lancer (wheelTickets)
    {reward: "lottery", lottery: "month", amount: 30000, weight: 5},
];

// Ordre des cases sur la roue, dans le sens des aiguilles d'une montre en partant du haut (numéros de
// WHEEL_SEGMENTS) : les cases du même genre ne se suivent pas
export const WHEEL_ORDER: readonly number[] = [0, 1, 12, 2, 3, 4, 5, 13, 6, 7, 8, 9, 14, 10, 11];

// Tickets de loterie offerts par la roue
export const WHEEL_TICKETS_PER_DAY = 1000;

// Jours du mois d'une date AAAA-MM-JJ (28 à 31)
const daysInMonth = (date: string) => new Date(Date.UTC(Number(date.slice(0, 4)), Number(date.slice(5, 7)), 0)).getUTCDate();

// Tickets d'une case « tickets » lancée ce jour-là (date AAAA-MM-JJ, heure de Paris) ; 0 pour une autre case
export function wheelTickets(segment: WheelSegment, date: string): number {
    if (segment.reward !== "lottery") return 0;
    if (segment.lottery === "day") return WHEEL_TICKETS_PER_DAY;
    if (segment.lottery === "week") return 7 * WHEEL_TICKETS_PER_DAY;
    return daysInMonth(date) * WHEEL_TICKETS_PER_DAY;
}

// Gain d'une case « bille offerte » quand le joueur a déjà toutes les billes
export const WHEEL_ITEM_FALLBACK = 100;

export const WHEEL_TOTAL_WEIGHT = WHEEL_SEGMENTS.reduce((n, s) => n + s.weight, 0);

// Case tirée pour un nombre tiré au hasard entre 0 (compris) et WHEEL_TOTAL_WEIGHT (exclu)
export function wheelSegmentFor(roll: number): number {
    let left = roll;
    for (let i = 0; i < WHEEL_SEGMENTS.length; i++) {
        left -= WHEEL_SEGMENTS[i]!.weight;
        if (left < 0) return i;
    }
    return WHEEL_SEGMENTS.length - 1;
}

// Chance d'une case, en pourcentage (0,5 ; 30…)
export function wheelChance(segment: WheelSegment): number {
    return segment.weight / WHEEL_TOTAL_WEIGHT * 100;
}
