import {Router, type Request, type Response} from "express";
import {pool} from "../db/pool.js";
import {createDb} from "../db/kysely.js";
import {asyncHandler} from "../AsyncRouteHandlerMiddleware.js";
import {requireAuth, type AuthLocals} from "../middleware/auth.js";
import {ShopRepository} from "../repository/Shop.repository.js";
import {shopItem, SHOP_ITEMS, tierBackgroundLevel} from "../utils/shop.js";

/*
 * Boutique (JWT requis)
 * - GET /shop : prix des objets, objets possédés, fond choisi et crédits du joueur
 * - POST /shop/buy { itemId } : achète un objet avec ses crédits
 * - PUT /shop/background { itemId } : choisit un fond possédé ou débloqué par le niveau (null : fond par défaut)
 */
const router = Router();
const shop = new ShopRepository(createDb(pool));

router.use(requireAuth);

router.get("/", asyncHandler(async (_req: Request, res: Response<unknown, AuthLocals>) => {
    const state = await shop.state(res.locals.userId!);
    res.status(200).json({status: "ok", data: {...state, prices: Object.fromEntries(Object.values(SHOP_ITEMS).map(i => [i.id, i.price]))}});
}));

router.post("/buy", asyncHandler(async (req: Request, res: Response<unknown, AuthLocals>) => {
    const item = shopItem(req.body?.itemId);
    if (!item) return void res.status(404).json({status: "error", message: "Cet objet n'existe pas"});
    const result = await shop.buy(res.locals.userId!, item);
    if (!result.ok) {
        const message = result.reason === "owned" ? "Tu as déjà cet objet"
            : result.reason === "credits" ? "Pas assez de crédits" : "Compte introuvable";
        return void res.status(result.reason === "credits" ? 402 : 409).json({status: "error", message});
    }
    res.status(200).json({status: "ok", data: {itemId: item.id, credits: result.credits}});
}));

router.put("/background", asyncHandler(async (req: Request, res: Response<unknown, AuthLocals>) => {
    const userId = res.locals.userId!;
    const itemId: unknown = req.body?.itemId ?? null;
    const tierLevel = tierBackgroundLevel(itemId);
    if (tierLevel !== undefined) {
        if (await shop.level(userId) < tierLevel) {
            return void res.status(403).json({status: "error", message: `Ce fond se débloque au niveau ${tierLevel}`});
        }
    } else if (itemId !== null) {
        const item = shopItem(itemId);
        if (!item || item.kind !== "background") return void res.status(404).json({status: "error", message: "Ce fond n'existe pas"});
        if (!await shop.owns(userId, item.id)) return void res.status(403).json({status: "error", message: "Achète d'abord ce fond"});
    }
    await shop.setBackground(userId, itemId as string | null);
    res.status(200).json({status: "ok", data: {background: itemId}});
}));

export default router;
