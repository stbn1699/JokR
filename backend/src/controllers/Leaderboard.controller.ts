import type {Request, Response} from "express";
import {asyncHandler} from "../AsyncRouteHandlerMiddleware.js";
import type {AuthLocals} from "../middleware/auth.js";
import type {LeaderboardRepository} from "../repository/Leaderboard.repository.js";
import type {GamesService} from "../services/Games.service.js";
import {routeParam} from "../utils/validation.js";
import type {FriendsRepository} from "../repository/Friends.repository.js";

const TOP = 20;

/*
 * Classements (20 premiers) + place du joueur connecté, même s'il n'est pas dans le top
 * - xp : niveau / XP globale
 * - credits : crédits du joueur (ceux qu'il a, pas ceux gagnés au total)
 * - game : niveau / XP sur un jeu
 * ?amis=1 (joueur connecté) : seulement lui et ses amis, chacun avec sa place dans le classement complet
 */
export function createLeaderboardController(repo: LeaderboardRepository, games: GamesService, friends: FriendsRepository) {
    // Place = position dans la liste, sauf si la requête l'a déjà calculée (filtre Amis) ; jamais d'identifiant interne
    const withRank = <T extends object>(rows: T[]) => rows.map((row, i) => {
        const {id: _id, rank, ...rest} = row as T & { id?: string; rank?: number | string };
        void _id;
        return {...rest, rank: rank !== undefined ? Number(rank) : i + 1};
    });

    // Filtre « Amis » : le joueur connecté et ses amis (undefined = tout le monde)
    const membersOf = async (req: Request, userId: string | undefined) =>
        req.query.amis === "1" && userId ? [userId, ...await friends.friendIds(userId)] : undefined;

    return {
        xp: asyncHandler(async (req: Request, res: Response<unknown, AuthLocals>) => {
            const userId = res.locals.userId;
            const members = await membersOf(req, userId);
            const [entries, me] = await Promise.all([
                repo.topXp(TOP, members),
                userId ? repo.xpRankOf(userId) : Promise.resolve(null),
            ]);
            res.status(200).json({status: "ok", data: {entries: withRank(entries), me}});
        }),

        credits: asyncHandler(async (req: Request, res: Response<unknown, AuthLocals>) => {
            const userId = res.locals.userId;
            const members = await membersOf(req, userId);
            const [entries, me] = await Promise.all([
                repo.topCredits(TOP, members),
                userId ? repo.creditsRankOf(userId) : Promise.resolve(null),
            ]);
            res.status(200).json({status: "ok", data: {entries: withRank(entries), me}});
        }),

        game: asyncHandler(async (req: Request, res: Response<unknown, AuthLocals>) => {
            const code = routeParam(req.params, "game")?.toUpperCase() ?? "";
            if (await games.getBaseXp(code) === undefined) {
                res.status(404).json({status: "error", message: "Jeu inconnu"});
                return;
            }
            const userId = res.locals.userId;
            const members = await membersOf(req, userId);
            const [entries, me] = await Promise.all([
                repo.topGame(code, TOP, members),
                userId ? repo.gameRankOf(userId, code) : Promise.resolve(null),
            ]);
            res.status(200).json({status: "ok", data: {entries: withRank(entries), me}});
        }),
    };
}
