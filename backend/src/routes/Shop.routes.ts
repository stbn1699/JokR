import {Router, type Request, type Response} from "express";
import {pool} from "../db/pool.js";
import {createDb} from "../db/kysely.js";
import {asyncHandler} from "../AsyncRouteHandlerMiddleware.js";
import {requireAuth, type AuthLocals} from "../middleware/auth.js";
import {ShopRepository} from "../repository/Shop.repository.js";
import {shopItem, SHOP_ITEMS, tierBackgroundLevel} from "../utils/shop.js";
import {DEFAULT_BALL, plinkoBall, plinkoBallSets} from "../utils/plinkoBalls.js";
import {chipSet, chipSets, DEFAULT_CHIP_SET} from "../utils/chipSets.js";
import {imageBackgroundSets} from "../utils/backgroundSets.js";

/*
 * Boutique (JWT requis)
 * - GET /shop : prix des objets, objets possédés, fond choisi et crédits du joueur
 * - POST /shop/buy { itemId } : achète un objet avec ses crédits
 * - PUT /shop/background { itemId } : choisit un fond possédé ou débloqué par le niveau (null : fond par défaut)
 * - GET /shop/plinko-balls : séries de billes de Plinko (lues dans public/plinko_ball), couleurs et prix
 * - PUT /shop/plinko-ball { itemId } : choisit une bille possédée (null ou bille par défaut : la bille par défaut)
 * - GET /shop/chip-sets : jeux de jetons (lus dans public/chips), images et prix
 * - GET /shop/backgrounds : fonds en images (drapeaux… lus dans public/backgrounds), images de chaque format et prix
 * - PUT /shop/chip-set { itemId } : choisit un jeu de jetons possédé (null ou jeu classique : les jetons classiques)
 */
const router = Router();
const shop = new ShopRepository(createDb(pool));

router.use(requireAuth);

// Tout ce qui se vend ou se débloque (mode admin : tout est à essayer)
const everything = () => [
    ...Object.keys(SHOP_ITEMS),
    ...plinkoBallSets().flatMap(s => s.balls.map(b => b.id)),
    ...chipSets().map(s => s.id),
    ...imageBackgroundSets().flatMap(s => s.backgrounds.map(b => b.id)),
];

router.get("/", asyncHandler(async (_req: Request, res: Response<unknown, AuthLocals>) => {
    const state = await shop.state(res.locals.userId!);
    if (res.locals.ghost) state.owned = everything();
    res.status(200).json({status: "ok", data: {...state, prices: Object.fromEntries(Object.values(SHOP_ITEMS).map(i => [i.id, i.price]))}});
}));

router.get("/plinko-balls", (_req: Request, res: Response) => {
    res.status(200).json({status: "ok", data: {defaultBall: DEFAULT_BALL, sets: plinkoBallSets()}});
});

router.get("/backgrounds", (_req: Request, res: Response) => {
    res.status(200).json({status: "ok", data: {sets: imageBackgroundSets()}});
});

router.get("/chip-sets", (_req: Request, res: Response) => {
    res.status(200).json({status: "ok", data: {defaultSet: DEFAULT_CHIP_SET, sets: chipSets()}});
});

router.put("/chip-set", asyncHandler(async (req: Request, res: Response<unknown, AuthLocals>) => {
    const userId = res.locals.userId!;
    const itemId: unknown = req.body?.itemId ?? null;
    if (itemId !== null && itemId !== DEFAULT_CHIP_SET) {
        const set = chipSet(itemId);
        if (!set) return void res.status(404).json({status: "error", message: "Ces jetons n'existent pas"});
        if (!res.locals.ghost && !await shop.owns(userId, set.id)) return void res.status(403).json({status: "error", message: "Achète d'abord ces jetons"});
    }
    const chosen = itemId === DEFAULT_CHIP_SET ? null : itemId as string | null;
    await shop.setChipSet(userId, chosen);
    res.status(200).json({status: "ok", data: {chipSet: chosen}});
}));

router.put("/plinko-ball", asyncHandler(async (req: Request, res: Response<unknown, AuthLocals>) => {
    const userId = res.locals.userId!;
    const itemId: unknown = req.body?.itemId ?? null;
    if (itemId !== null && itemId !== DEFAULT_BALL) {
        const ball = plinkoBall(itemId);
        if (!ball) return void res.status(404).json({status: "error", message: "Cette bille n'existe pas"});
        if (!res.locals.ghost && !await shop.owns(userId, ball.id)) return void res.status(403).json({status: "error", message: "Achète d'abord cette bille"});
    }
    const chosen = itemId === DEFAULT_BALL ? null : itemId as string | null;
    await shop.setPlinkoBall(userId, chosen);
    res.status(200).json({status: "ok", data: {plinkoBall: chosen}});
}));

router.post("/buy", asyncHandler(async (req: Request, res: Response<unknown, AuthLocals>) => {
    const item = shopItem(req.body?.itemId);
    if (!item) return void res.status(404).json({status: "error", message: "Cet objet n'existe pas"});
    if (res.locals.ghost) return void res.status(409).json({status: "error", message: "Mode admin : tout est déjà débloqué"});
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
    if (res.locals.ghost) {
        // mode admin : tout fond existant se porte (remis à zéro en sortant du mode)
        if (itemId !== null && tierLevel === undefined && shopItem(itemId)?.kind !== "background") {
            return void res.status(404).json({status: "error", message: "Ce fond n'existe pas"});
        }
    } else if (tierLevel !== undefined) {
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
