import type {NextFunction, Request, Response} from "express";
import type {Kysely} from "kysely";
import type {DB} from "../db/schema.js";
import type {AuthLocals} from "./auth.js";
import {isAdminUsername} from "../utils/admin.js";

/*
 * Refuse la requête si le joueur connecté n'est pas administrateur (ADMIN_USERNAMES).
 * À placer après requireAuth.
 */
export function requireAdmin(db: Kysely<DB>) {
    return async (_req: Request, res: Response<unknown, AuthLocals>, next: NextFunction) => {
        try {
            const user = await db.selectFrom("users").select("username").where("id", "=", res.locals.userId!).executeTakeFirst();
            if (!isAdminUsername(user?.username)) {
                res.status(403).json({status: "error", message: "Accès réservé à l'administrateur"});
                return;
            }
            next();
        } catch (err) {
            next(err);
        }
    };
}
