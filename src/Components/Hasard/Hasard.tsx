import "./Hasard.scss";
import {useEffect, useState} from "react";
import {PLINKO_MAX_MULTIPLIER} from "../../../backend/src/utils/plinko.ts";
import {SLOT_MACHINES, slotTopPays} from "../../../backend/src/utils/slots.ts";
import {useAuth} from "../../Context/authContext.ts";
import {casinoService} from "../../Services/casino.service.ts";
import LotteryBanner from "./Lottery/LotteryBanner.tsx";
import GameCard from "./GameCard.tsx";

/**
 * Onglet « Hasard » (/hasard) : les jeux où l'on mise ses crédits.
 * En haut, le bandeau des loteries : pas un jeu à choisir, tout le monde y participe en misant.
 * Puis une carte par jeu (GameCard) : son icône (public/gameIcons/<CODE>.svg ; case vide en attendant),
 * son nom, une phrase et une étiquette (gain maximum, joueurs en ce moment).
 * Les machines à sous ont leur propre page (une carte par machine). Le blackjack viendra ensuite.
 */

const POLL_MS = 15_000;

const players = (n: number) => `${n} joueur${n > 1 ? "s" : ""}`;

export default function Hasard() {
    const {isLoggedIn} = useAuth();
    // joueurs en ce moment : mises du tour de roulette, autres joueurs passés sur le Plinko dans la dernière minute
    const [live, setLive] = useState<{ roulette: number; plinko: number } | null>(null);

    useEffect(() => {
        if (!isLoggedIn) return;
        const controller = new AbortController();
        const load = async () => {
            try {
                const [roulette, plinko] = await Promise.all([
                    casinoService.rouletteLive(controller.signal), casinoService.plinkoLive(controller.signal),
                ]);
                setLive({roulette: roulette.players.length, plinko: plinko.players});
            } catch {
                // pas de chiffres : les étiquettes restent sans nombre de joueurs
            }
        };
        const first = window.setTimeout(() => void load(), 0);
        const timer = window.setInterval(() => void load(), POLL_MS);
        return () => {
            controller.abort();
            window.clearTimeout(first);
            window.clearInterval(timer);
        };
    }, [isLoggedIn]);

    return (
        <main className="hasard">
            <LotteryBanner/>

            <div className="hasard-games">
                <GameCard to="/hasard/plinko" icon="/gameIcons/PLINKO.svg" name="Plinko" text="Lâche une bille sur les clous" tags={[
                    {text: <>jusqu'à ×{PLINKO_MAX_MULTIPLIER} ta mise</>, kind: "gain"},
                    ...live && live.plinko > 0 ? [{text: `${players(live.plinko)} en ce moment`, kind: "live" as const}] : [],
                ]}/>
                <GameCard to="/hasard/roulette" icon="/gameIcons/ROULETTE.svg" name="Roulette" text="Une table pour tout le monde, un tour toutes les 30 s" tags={[
                    {text: "×35 sur un numéro", kind: "gain"},
                    {text: live && live.roulette > 0 ? `en direct · ${players(live.roulette)}` : "en direct", kind: "live"},
                ]}/>
                <GameCard to="/hasard/machines" icon="/gameIcons/SLOTS.svg" name="Machines à sous"
                          text={`${SLOT_MACHINES.length} machines, chacune son thème`} tags={[{text: <>jusqu'à ×{Math.max(...SLOT_MACHINES.map(slotTopPays)).toLocaleString("fr-FR")} par ligne</>, kind: "gain"}]}/>
                <GameCard icon="/gameIcons/BLACKJACK.svg" name="Et bientôt…" text="Blackjack…"/>
            </div>
        </main>
    );
}
