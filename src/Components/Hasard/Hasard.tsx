import "./Hasard.scss";
import {useEffect, useState} from "react";
import {PLINKO_MAX_MULTIPLIER} from "../../../backend/src/utils/plinko.ts";
import {SLOT_MACHINES, slotTopPays} from "../../../backend/src/utils/slots.ts";
import {useAuth} from "../../Context/authContext.ts";
import {casinoService} from "../../Services/casino.service.ts";
import LotteryBanner from "./Lottery/LotteryBanner.tsx";
import GameCard from "./GameCard.tsx";
import DailyWheel from "./Wheel/DailyWheel.tsx";
import {useWhatsNewOpen} from "../../Services/popupQueue.ts";
import type {WheelStatus} from "../../Services/casino.service.ts";

/**
 * Onglet « Hasard » (/hasard) : les jeux où l'on mise ses crédits.
 * En haut, le bandeau des loteries : pas un jeu à choisir, tout le monde y participe en misant.
 * Puis une carte par jeu (GameCard) : son icône (public/gameIcons/<CODE>.svg ; case vide en attendant),
 * son nom, une phrase et une étiquette (gain maximum, joueurs en ce moment).
 * Les machines à sous ont leur propre page (une carte par machine).
 * La roue du jour (un lancer gratuit par jour) s'ouvre toute seule à la première visite du jour,
 * et reste accessible depuis sa carte.
 */

const POLL_MS = 15_000;

const players = (n: number) => `${n} joueur${n > 1 ? "s" : ""}`;

// Roue du jour fermée sans la lancer : ne plus l'ouvrir toute seule avant ce moment (minuit)
const WHEEL_SNOOZE_KEY = "wheelSnoozedUntil";

function wheelSnoozed(): boolean {
    try {
        return Date.now() < Number(localStorage.getItem(WHEEL_SNOOZE_KEY) ?? 0);
    } catch {
        return false;
    }
}

function snoozeWheel(until: number) {
    try {
        localStorage.setItem(WHEEL_SNOOZE_KEY, String(until));
    } catch {
        // stockage indisponible : la roue se rouvrira à la prochaine visite
    }
}

// « 5 h », « 12 min » avant le prochain lancer
function untilShort(ms: number): string {
    const minutes = Math.max(1, Math.ceil(ms / 60_000));
    return minutes >= 60 ? `${Math.floor(minutes / 60)} h` : `${minutes} min`;
}

export default function Hasard() {
    const {isLoggedIn} = useAuth();
    // joueurs en ce moment : mises du tour de roulette, autres joueurs passés sur le Plinko dans la dernière minute
    const [live, setLive] = useState<{ roulette: number; plinko: number } | null>(null);
    const [wheel, setWheel] = useState<WheelStatus | null>(null);
    const [wheelOpen, setWheelOpen] = useState(false);
    const whatsNewOpen = useWhatsNewOpen();
    // heure, pour le compte à rebours de la carte de la roue (mise à jour chaque minute)
    const [now, setNow] = useState(() => Date.now());

    useEffect(() => {
        const timer = window.setInterval(() => setNow(Date.now()), 60_000);
        return () => window.clearInterval(timer);
    }, []);

    // Roue du jour : état au chargement de la page ; ouverte toute seule si pas encore lancée aujourd'hui
    useEffect(() => {
        if (!isLoggedIn) return;
        const controller = new AbortController();
        casinoService.wheel(controller.signal).then(status => {
            setWheel(status);
            if (status.available && !wheelSnoozed()) setWheelOpen(true);
        }).catch(() => undefined);
        return () => controller.abort();
    }, [isLoggedIn]);

    const closeWheel = () => {
        setWheelOpen(false);
        // fermée sans lancer : elle ne se rouvre plus toute seule aujourd'hui (la carte reste là)
        if (wheel) snoozeWheel(wheel.nextAt);
    };

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
                <GameCard onClick={() => setWheelOpen(true)} icon="/gameIcons/WHEEL.svg" name="Roue du jour" text="Un lancer gratuit chaque jour" tags={[
                    {text: "jackpot : 1 000 crédits", kind: "gain"},
                    ...wheel ? [wheel.available ? {text: "à lancer !", kind: "live" as const}
                        : {text: `reviens dans ${untilShort(wheel.nextAt - now)}`, kind: "gain" as const}] : [],
                ]}/>
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
                <GameCard to="/hasard/blackjack" icon="/gameIcons/BLACKJACK.svg" name="Blackjack" text="En solo contre le croupier : fais 21 sans dépasser"
                          tags={[{text: "blackjack payé 3 pour 2", kind: "gain"}]}/>
            </div>

            {wheelOpen && wheel && !whatsNewOpen && (
                <DailyWheel available={wheel.available} today={wheel.today} nextAt={wheel.nextAt} onClose={closeWheel}
                            onSpun={(segment, available) => setWheel(w => w && {...w, available, today: {segment}})}/>
            )}
        </main>
    );
}
