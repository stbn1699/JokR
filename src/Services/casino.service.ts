import {api} from "../api/api.ts";
import type {RouletteBet} from "../../backend/src/utils/roulette.ts";
import type {PlinkoRisk} from "../../backend/src/utils/plinko.ts";

// Une bille lâchée : la graine de sa chute (le site la rejoue), sa case et le gain
export interface PlinkoResult {
    seed: number;
    slot: number;
    multiplier: number;
    payout: number;
    // solde après la mise et le gain
    credits: number;
}

// Un joueur du tour de roulette en cours : ses jetons, son total et, une fois le numéro tiré, son gain
export interface RoulettePlayer {
    username: string;
    avatar: string;
    level: number;
    mine: boolean;
    total: number;
    payout: number | null;
    // chaque mise : son total et les jetons posés, dans l'ordre (absents d'un serveur plus ancien)
    bets: (RouletteBet & { chips?: number[] })[];
}

// Un de mes derniers tours de roulette : numéro sorti, total misé, gain et mises (total et jetons posés par case)
export interface RouletteMyRound {
    round: number;
    number: number;
    bet: number;
    payout: number;
    bets?: (RouletteBet & { chips?: number[] })[];
}

// Roulette en direct : le tour en cours, vu par le serveur
export interface RouletteLive {
    // heure du serveur (ms, temps Unix) : le site cale son horloge dessus
    now: number;
    round: number;
    closesAt: number;
    endsAt: number;
    // numéro tiré (null tant que les mises sont ouvertes)
    number: number | null;
    credits: number;
    history: { round: number; number: number }[];
    // mes derniers tours joués (le plus récent d'abord ; absent d'un serveur plus ancien)
    mine?: RouletteMyRound[];
    players: RoulettePlayer[];
}

// Billes de Plinko des autres joueurs, encore en l'air (ago : partie depuis tant de ms)
export interface PlinkoLive {
    // ball : bille choisie par le joueur (null : bille par défaut) ; friend : un ami (absent d'un serveur plus ancien)
    drops: { id: string; seed: number; slot: number; bet: number; payout: number; username: string; ago: number; ball: string | null; friend?: boolean }[];
    // autres joueurs passés sur la table dans la dernière minute
    players: number;
}

// Une loterie (jour, semaine ou mois) : période en cours, cagnotte, mes tickets et derniers gagnants
export interface LotteryInfo {
    kind: "day" | "week" | "month";
    // prochain tirage, et début de la période (ms, temps Unix)
    drawAt: number;
    periodStart: number;
    // part des mises reversée au gagnant (%), mises de tout le monde, et cagnotte (ce que gagnerait le gagnant)
    percent: number;
    totalBet: number;
    prize: number;
    totalTickets: number;
    players: number;
    myBet: number;
    myTickets: number;
    // crédits à miser encore pour un ticket de plus
    nextTicketIn: number;
    winners: { date: string; username: string; prize: number; tickets: number; totalTickets: number }[];
}

// Un lancer de machine à sous (voir backend/src/utils/slots.ts)
export interface SlotSpinResult {
    stops: number[];
    grid: string[][];
    wins: { line: number; symbol: string; count: number; pays: number }[];
    payout: number;
    credits: number;
}

const json = {"Content-Type": "application/json"};

export const casinoService = {
    // risk : tableau de gains choisi (prudent, équilibré ou risqué)
    // machine à sous : un lancer (arrêts des rouleaux, grille, lignes gagnantes, gain, solde)
    slotSpin(machine: string, bet: number, reels: number, lines: number): Promise<SlotSpinResult> {
        return api<SlotSpinResult>(`/casino/slots/${encodeURIComponent(machine)}`, {method: "POST", headers: json, body: JSON.stringify({bet, reels, lines})});
    },

    plinko(bet: number, risk: PlinkoRisk): Promise<PlinkoResult> {
        return api<PlinkoResult>("/casino/plinko", {method: "POST", headers: json, body: JSON.stringify({bet, risk})});
    },

    lottery(signal?: AbortSignal): Promise<LotteryInfo[]> {
        return api<LotteryInfo[]>("/casino/lottery", {method: "GET"}, signal);
    },

    plinkoLive(signal?: AbortSignal): Promise<PlinkoLive> {
        return api<PlinkoLive>("/casino/plinko/live", {method: "GET"}, signal);
    },

    rouletteLive(signal?: AbortSignal): Promise<RouletteLive> {
        return api<RouletteLive>("/casino/roulette/live", {method: "GET"}, signal);
    },

    // Pose des jetons sur le tour en cours → solde restant
    async rouletteBet(bets: RouletteBet[]): Promise<number> {
        const {credits} = await api<{ credits: number }>("/casino/roulette/bets", {method: "POST", headers: json, body: JSON.stringify({bets})});
        return credits;
    },

    // Retire tous ses jetons du tour en cours → solde restant
    async rouletteCancel(): Promise<number> {
        const {credits} = await api<{ credits: number }>("/casino/roulette/bets", {method: "DELETE"});
        return credits;
    },
};
