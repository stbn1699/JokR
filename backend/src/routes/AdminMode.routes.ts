import {Router, type Request, type Response} from "express";
import {pool} from "../db/pool.js";
import {createDb} from "../db/kysely.js";
import {asyncHandler} from "../AsyncRouteHandlerMiddleware.js";
import {requireAuth, type AuthLocals} from "../middleware/auth.js";
import {requireAdmin} from "../middleware/admin.js";
import {setGhost} from "../services/adminMode.js";
import {tierBackgroundLevel} from "../utils/shop.js";

/*
 * PUT /users/me/admin-mode { on } : un administrateur met ou enlève le mode admin (voir services/adminMode.ts).
 * En sortant du mode, les cosmétiques qu'il porte sans les avoir (débloquées le temps du mode admin) sont
 * remises à zéro : fond, bille de Plinko et jetons reviennent à ceux par défaut.
 */
const router = Router();
const db = createDb(pool);

router.put("/", requireAuth, requireAdmin(db), asyncHandler(async (req: Request, res: Response<unknown, AuthLocals>) => {
    const userId = res.locals.userId!;
    const on = req.body?.on === true;

    if (!on) {
        const [user, items] = await Promise.all([
            db.selectFrom("users").select(["background", "plinko_ball", "chip_set", "user_level"]).where("id", "=", userId).executeTakeFirstOrThrow(),
            db.selectFrom("user_items").select("item_id").where("user_id", "=", userId).execute(),
        ]);
        const owned = new Set(items.map(i => i.item_id));
        const tierLevel = tierBackgroundLevel(user.background);
        const keepBackground = user.background === null
            || (tierLevel !== undefined ? user.user_level >= tierLevel : owned.has(user.background));
        await db.updateTable("users").set({
            admin_mode: false,
            background: keepBackground ? user.background : null,
            plinko_ball: user.plinko_ball && owned.has(user.plinko_ball) ? user.plinko_ball : null,
            chip_set: user.chip_set && owned.has(user.chip_set) ? user.chip_set : null,
        }).where("id", "=", userId).execute();
    } else {
        await db.updateTable("users").set({admin_mode: true}).where("id", "=", userId).execute();
    }
    setGhost(userId, on);
    res.status(200).json({status: "ok", data: {adminMode: on}});
}));

export default router;
