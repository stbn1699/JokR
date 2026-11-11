import {Router, type Request, type Response} from "express";
import {sql} from "kysely";
import {pool} from "../db/pool.js";
import {createDb} from "../db/kysely.js";
import {asyncHandler} from "../AsyncRouteHandlerMiddleware.js";
import {peekUserId, requireAuth, type AuthLocals} from "../middleware/auth.js";
import {requireAdmin} from "../middleware/admin.js";
import {maintenance, PUZZLE_GRACE_MS} from "../services/maintenance.js";
import {isPage, PAGES, type Page, presence} from "../services/presence.js";
import {rouletteBettingOpen, rouletteClosesAt, rouletteEndsAt, rouletteRoundAt} from "../utils/roulette.js";

/*
 * Mise à jour du site (voir services/maintenance.ts et services/presence.ts) :
 * - GET /maintenance : état pour tout le monde → { on, since, lastRound, now, puzzleGraceMs }
 * - POST /maintenance/presence { key, page, gameCode?, challenge?, elapsedMs?, closed } : un onglet dit où il est
 *   (toutes les 15 s, 5 s pendant une mise à jour, invités compris) → même réponse que GET /maintenance ;
 *   DELETE /maintenance/presence/:key : onglet fermé
 * - PUT /maintenance { on } : l'administrateur ferme (ou rouvre) le site
 * - GET /maintenance/live : (administrateur) qui est où, puzzles en cours, roulette, billes de Plinko en l'air,
 *   journal des joueurs envoyés sur l'écran, et ready : plus personne en jeu, la mise à jour peut se faire
 */
const router = Router();
const db = createDb(pool);

// Billes de Plinko encore en l'air : lâchées depuis moins que ça
const PLINKO_FALL_MS = 8000;

const stateOf = () => {
    const m = maintenance.get();
    return {on: m !== null, since: m?.since ?? null, lastRound: m?.lastRound ?? null, now: Date.now(), puzzleGraceMs: PUZZLE_GRACE_MS};
};

router.get("/", (_req: Request, res: Response) => {
    res.status(200).json({status: "ok", data: stateOf()});
});

router.post("/presence", (req: Request, res: Response) => {
    const {key, page, gameCode, challenge, elapsedMs, closed} = req.body ?? {};
    if (typeof key !== "string" || key.length === 0 || key.length > 64 || !isPage(page)
        || (gameCode != null && (typeof gameCode !== "string" || gameCode.length > 20))
        || (elapsedMs != null && (typeof elapsedMs !== "number" || !Number.isFinite(elapsedMs) || elapsedMs < 0))) {
        res.status(400).json({status: "error", message: "Présence invalide"});
        return;
    }
    const now = Date.now();
    presence.update({
        key, page, gameCode: typeof gameCode === "string" ? gameCode : null, challenge: challenge === true,
        userId: peekUserId(req), startedAt: typeof elapsedMs === "number" ? now - elapsedMs : null, closed: closed === true,
    }, maintenance.get() !== null, now);
    res.status(200).json({status: "ok", data: stateOf()});
});

router.delete("/presence/:key", (req: Request, res: Response) => {
    presence.remove(String(req.params.key));
    res.status(204).end();
});

router.put("/", requireAuth, requireAdmin(db), (req: Request, res: Response) => {
    if (req.body?.on === true) {
        if (maintenance.get() === null) presence.clearEvents();
        maintenance.start();
    } else maintenance.stop();
    res.status(200).json({status: "ok", data: stateOf()});
});

router.get("/live", requireAuth, requireAdmin(db), asyncHandler(async (_req: Request, res: Response<unknown, AuthLocals>) => {
    const now = Date.now();
    const round = rouletteRoundAt(now);
    const tabs = presence.list(now);
    const puzzles = tabs.filter(t => t.page === "puzzle" && t.startedAt !== null && !t.closed);

    const ids = [...new Set(puzzles.map(p => p.userId).filter((id): id is string => id !== null))];
    const [users, roundBets, unpaid, lastBet, plinko] = await Promise.all([
        ids.length ? db.selectFrom("users").select(["id", "username"]).where("id", "in", ids).execute() : Promise.resolve([]),
        db.selectFrom("roulette_bets")
            .select(eb => [eb.fn.count<string>("user_id").distinct().as("players"), eb.fn.coalesce(eb.fn.sum<string>("amount"), sql<string>`0`).as("total")])
            .where("round_id", "=", round).executeTakeFirst(),
        db.selectFrom("roulette_bets").select(eb => eb.fn.count<string>("id").as("n"))
            .where("payout", "is", null).where("round_id", "<", round).executeTakeFirst(),
        db.selectFrom("roulette_bets").select(eb => eb.fn.max("round_id").as("round")).executeTakeFirst(),
        db.selectFrom("casino_plays").select(eb => eb.fn.count<string>("id").as("n"))
            .where("game", "=", "plinko").where("created_at", ">", sql<Date>`now() - make_interval(secs => ${PLINKO_FALL_MS / 1000})`)
            .executeTakeFirst(),
    ]);
    const names = new Map(users.map(u => [u.id, u.username]));

    const roulettePlayers = Number(roundBets?.players ?? 0);
    const lastBetRound = lastBet?.round != null ? Number(lastBet.round) : null;
    // la roue tourne encore pour le dernier tour joué (jusqu'à la fin de son animation)
    const spinning = lastBetRound !== null && now < rouletteEndsAt(lastBetRound);
    const state = stateOf();
    // dernier tour encore ouvert aux mises : quelqu'un peut encore miser
    const lastRoundOpen = state.lastRound !== null && now < rouletteClosesAt(state.lastRound);
    const rouletteBusy = roulettePlayers > 0 || Number(unpaid?.n ?? 0) > 0 || spinning || lastRoundOpen;
    const plinkoInFlight = Number(plinko?.n ?? 0);

    // joueurs page par page : encore sur la page, ou déjà sur l'écran de mise à jour
    const pages = Object.fromEntries(PAGES.map(p => [p, {here: 0, sent: 0}])) as Record<Page, { here: number; sent: number }>;
    for (const t of tabs) pages[t.page][t.closed ? "sent" : "here"] += 1;
    // encore en jeu : un onglet de puzzle, de roulette ou de Plinko pas encore passé sur l'écran
    const playing = tabs.filter(t => !t.closed && t.page !== "site").length;

    res.status(200).json({
        status: "ok", data: {
            now,
            maintenance: state,
            pages,
            events: presence.events(),
            puzzles: puzzles.map(p => ({
                key: p.key, gameCode: p.gameCode, challenge: p.challenge, startedAt: p.startedAt, lastSeen: p.lastSeen,
                username: p.userId ? names.get(p.userId) ?? null : null,
            })),
            roulette: {
                round, open: rouletteBettingOpen(round, now), closesAt: rouletteClosesAt(round), endsAt: rouletteEndsAt(round),
                players: roulettePlayers, total: Number(roundBets?.total ?? 0), busy: rouletteBusy,
                // fin du dernier tour où l'on peut miser (mise à jour activée)
                lastRoundEndsAt: state.lastRound !== null ? rouletteEndsAt(state.lastRound) : null,
            },
            plinko: {inFlight: plinkoInFlight},
            ready: state.on && playing === 0 && !rouletteBusy && plinkoInFlight === 0,
        },
    });
}));

export default router;
