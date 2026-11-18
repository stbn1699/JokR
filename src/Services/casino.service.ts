import {api} from "../api/api.ts";
import type {RouletteBet} from "../../backend/src/utils/roulette.ts";
import type {PlinkoRisk} from "../../backend/src/utils/plinko.ts";
import type {BlackjackAction, BlackjackView, HandOutcome} from "../../backend/src/utils/blackjack.ts";
import type {PokerHand, PokerView} from "../../backend/src/utils/poker.ts";

// Poker à 5 cartes : la main vue par le joueur (voir backend/src/utils/poker.ts) et son solde
export interface PokerPlay {
    hand: PokerView;
    credits: number;
}

export interface PokerTable {
    // main donnée pas encore tirée (reprise en revenant sur la page), ou null
    hand: PokerView | null;
    // dernières mains finies, la plus récente d'abord
    recent: { bet: number; payout: number; hand: PokerHand }[];
    credits: number;
}

// Keno : numéros tirés (dans l'ordre de sortie), numéros trouvés, gain et solde
export interface KenoResult {
    drawn: number[];
    hits: number;
    multiplier: number;
    payout: number;
    credits: number;
}

// Blackjack : ce que voit le joueur de la main (voir backend/src/utils/blackjack.ts) et son solde
export interface BlackjackPlay {
    hand: BlackjackView;
    credits: number;
}

export interface BlackjackTable {
    // main en cours (reprise en revenant sur la page), ou null
    hand: BlackjackView | null;
    // dernières mains finies, la plus récente d'abord
    recent: { bet: number; payout: number; outcomes: (HandOutcome | undefined)[] }[];
    credits: number;
}

// Événement envoyé quand la roue du jour vient d'être lancée (le header met à jour son point orange)
export const WHEEL_SPUN_EVENT = "jokr:wheel-spun";

// Roue du jour (voir backend/src/utils/wheel.ts)
export interface WheelStatus {
    available: boolean;
    // prochain lancer possible (minuit, heure de Paris), en ms
    nextAt: number;
    // dernier lancer du jour
    today: { segment: number } | null;
}

// level et xp : null en mode admin (rien n'est donné)
export interface WheelSpin {
    segment: number;
    credits: number;
    level: number | null;
    xp: number | null;
    // bille offerte par la case « cadeau » (null : pas cette case, ou le joueur les avait toutes)
    item: { id: string; name: string; file: string } | null;
    // crédits gagnés par ce lancer
    creditsWon: number;
    // tickets de loterie offerts par ce lancer (case « tickets »)
    tickets: number;
    // encore un lancer aujourd'hui (relance tombée, ou mode admin)
    available: boolean;
}

// Une bille lâchée : la graine de sa chute (le site la rejoue), sa case et le gain
export interface PlinkoDropResult {
    seed: number;
    slot: number;
    multiplier: number;
    payout: number;
}

// Billes lâchées d'un coup (moins que demandé si les crédits manquent), et le solde après leurs mises et leurs gains
export interface PlinkoResult {
    drops: PlinkoDropResult[];
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
    // crédits misés pour un ticket (moins avec l'amélioration « Prix du ticket »)
    ticketPrice: number;
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

    plinko(bet: number, risk: PlinkoRisk, count: number): Promise<PlinkoResult> {
        return api<PlinkoResult>("/casino/plinko", {method: "POST", headers: json, body: JSON.stringify({bet, risk, count})});
    },

    // Roue du jour : lancer disponible aujourd'hui ? (nextAt : minuit, prochain lancer possible)
    wheel(signal?: AbortSignal): Promise<WheelStatus> {
        return api<WheelStatus>("/casino/wheel", {method: "GET"}, signal);
    },

    // Lance la roue du jour (409 si déjà lancée aujourd'hui) → case tirée, solde, niveau et XP après le gain
    spinWheel(): Promise<WheelSpin> {
        return api<WheelSpin>("/casino/wheel", {method: "POST"});
    },

    poker(signal?: AbortSignal): Promise<PokerTable> {
        return api<PokerTable>("/casino/poker", {method: "GET"}, signal);
    },

    // Donne 5 cartes (mise retirée)
    pokerDeal(bet: number): Promise<PokerPlay> {
        return api<PokerPlay>("/casino/poker", {
            method: "POST", headers: {"Content-Type": "application/json"}, body: JSON.stringify({bet}),
        });
    },

    // Remplace les cartes non gardées et paie la main
    pokerDraw(held: boolean[]): Promise<PokerPlay> {
        return api<PokerPlay>("/casino/poker/draw", {
            method: "POST", headers: {"Content-Type": "application/json"}, body: JSON.stringify({held}),
        });
    },

    keno(bet: number, picks: number[]): Promise<KenoResult> {
        return api<KenoResult>("/casino/keno", {
            method: "POST", headers: {"Content-Type": "application/json"}, body: JSON.stringify({bet, picks}),
        });
    },

    blackjack(signal?: AbortSignal): Promise<BlackjackTable> {
        return api<BlackjackTable>("/casino/blackjack", {method: "GET"}, signal);
    },

    // Nouvelle main (mise retirée)
    blackjackStart(bet: number): Promise<BlackjackPlay> {
        return api<BlackjackPlay>("/casino/blackjack", {
            method: "POST", headers: {"Content-Type": "application/json"}, body: JSON.stringify({bet}),
        });
    },

    // Tirer, rester, doubler ou séparer
    blackjackAct(action: BlackjackAction): Promise<BlackjackPlay> {
        return api<BlackjackPlay>(`/casino/blackjack/${action}`, {method: "POST"});
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
    // group : geste du joueur (clic, glisser, « Reproduire ma mise »), pour « Annuler la dernière mise »
    async rouletteBet(bets: RouletteBet[], group?: string): Promise<number> {
        const {credits} = await api<{ credits: number }>("/casino/roulette/bets", {method: "POST", headers: json, body: JSON.stringify({bets, group})});
        return credits;
    },

    // retire les jetons de son dernier geste sur le tour en cours
    async rouletteUndo(): Promise<number> {
        const {credits} = await api<{ credits: number; removed: number }>("/casino/roulette/bets/last", {method: "DELETE"});
        return credits;
    },

    // Retire tous ses jetons du tour en cours → solde restant
    async rouletteCancel(): Promise<number> {
        const {credits} = await api<{ credits: number }>("/casino/roulette/bets", {method: "DELETE"});
        return credits;
    },
};
