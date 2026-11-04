import {Router} from "express";
import {pool} from "../db/pool.js";
import {createDb} from "../db/kysely.js";
import {asyncHandler} from "../AsyncRouteHandlerMiddleware.js";
import {routeParam} from "../utils/validation.js";
import {PlayersRepository} from "../repository/Players.repository.js";
import {LeaderboardRepository} from "../repository/Leaderboard.repository.js";

const RECENT_WINS = 8;

/*
 * Profils publics des joueurs (ouverts depuis les classements)
 * - GET /players/:username : niveau, crédits, stats par jeu, défis du jour et dernières victoires
 */
const router = Router();
const db = createDb(pool);
const players = new PlayersRepository(db);
const leaderboard = new LeaderboardRepository(db);

router.get("/:username", asyncHandler(async (req, res) => {
    const username = routeParam(req.params, "username") ?? "";
    const player = await players.byUsername(username);
    if (!player) {
        res.status(404).json({status: "error", message: "Joueur introuvable"});
        return;
    }
    const [games, daily, recent, rank] = await Promise.all([
        players.games(player.id),
        players.daily(player.id),
        players.recent(player.id, RECENT_WINS),
        leaderboard.xpRankOf(player.id),
    ]);
    // l'identifiant interne ne sert pas au site
    const {id: _id, ...profile} = player;
    void _id;
    res.status(200).json({
        status: "ok",
        data: {
            ...profile,
            xpRank: rank ? {rank: rank.rank, total: rank.total} : null,
            wins: games.reduce((n, g) => n + Number(g.wins), 0),
            games,
            daily,
            recent,
        },
    });
}));

export default router;
