import {Router} from "express";
import {pool} from "../db/pool.js";
import {createDb} from "../db/kysely.js";
import {asyncHandler} from "../AsyncRouteHandlerMiddleware.js";
import {routeParam} from "../utils/validation.js";
import {optionalAuth, type AuthLocals} from "../middleware/auth.js";
import type {Response} from "express";
import {PlayersRepository} from "../repository/Players.repository.js";
import {LeaderboardRepository} from "../repository/Leaderboard.repository.js";
import {FriendsRepository} from "../repository/Friends.repository.js";

const RECENT_WINS = 8;

/*
 * Profils publics des joueurs (ouverts depuis les classements)
 * - GET /players/:username : niveau, crédits, stats par jeu, défis du jour et dernières victoires
 *
 * Le joueur choisit ce que les autres voient (show_stats, show_history) : une partie masquée vaut null.
 * Le pseudo, l'icône et le niveau restent toujours visibles. Le joueur connecté voit toujours tout de sa page.
 * friendship : lien avec le joueur connecté (friends, outgoing, incoming, none ; null pour un invité ou sa propre page).
 */
const router = Router();
const db = createDb(pool);
const players = new PlayersRepository(db);
const leaderboard = new LeaderboardRepository(db);
const friends = new FriendsRepository(db);

router.get("/:username", optionalAuth, asyncHandler(async (req, res: Response<unknown, AuthLocals>) => {
    const username = routeParam(req.params, "username") ?? "";
    const player = await players.byUsername(username);
    if (!player) {
        res.status(404).json({status: "error", message: "Joueur introuvable"});
        return;
    }
    const isOwner = res.locals.userId === player.id;
    const showStats = isOwner || player.showStats;
    const showHistory = isOwner || player.showHistory;
    const viewer = res.locals.userId;
    const [games, daily, recent, rank, friendship] = await Promise.all([
        showStats ? players.games(player.id) : null,
        showStats ? players.daily(player.id) : null,
        showHistory ? players.recent(player.id, RECENT_WINS) : null,
        showStats ? leaderboard.xpRankOf(player.id) : null,
        viewer && !isOwner ? friends.relation(viewer, player.id) : null,
    ]);
    res.status(200).json({
        status: "ok",
        data: {
            // jamais l'identifiant interne
            username: player.username,
            avatar: player.avatar,
            level: player.level,
            isOwner,
            friendship,
            stats: showStats && games && daily ? {
                xp: player.xp,
                credits: player.credits,
                createdAt: player.createdAt,
                xpRank: rank ? {rank: rank.rank, total: rank.total} : null,
                wins: games.reduce((n, g) => n + Number(g.wins), 0),
                games,
                daily,
            } : null,
            recent,
        },
    });
}));

export default router;
