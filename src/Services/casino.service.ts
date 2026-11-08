import {api} from "../api/api.ts";

// Une bille lâchée : la graine de sa chute (le site la rejoue), sa case et le gain
export interface PlinkoResult {
    seed: number;
    slot: number;
    multiplier: number;
    payout: number;
    // solde après la mise et le gain
    credits: number;
}

const json = {"Content-Type": "application/json"};

export const casinoService = {
    plinko(bet: number): Promise<PlinkoResult> {
        return api<PlinkoResult>("/casino/plinko", {method: "POST", headers: json, body: JSON.stringify({bet})});
    },
};
