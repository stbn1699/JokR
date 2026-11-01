import type {NextFunction, Request, Response} from "express";
import jwt from "jsonwebtoken";
import {config} from "../config.js";

/*
 * Middlewares d'authentification JWT.
 * Le token est attendu dans l'en-tête `Authorization: Bearer <token>`.
 * L'id de l'utilisateur connecté est placé dans `res.locals.userId`.
 */

export type AuthLocals = { userId?: string };

// Retourne l'id utilisateur du token, null s'il n'y a pas de token, ou lève une erreur s'il est invalide.
function readUserId(req: Request): string | null {
    const header = req.headers.authorization;
    if (!header) return null;

    const [scheme, token] = header.split(" ");
    if (scheme !== "Bearer" || !token) throw new Error("Malformed Authorization header");

    const payload = jwt.verify(token, config.jwtSecret);
    if (typeof payload === "string" || typeof payload.sub !== "string") {
        throw new Error("Invalid token payload");
    }
    return payload.sub;
}

// Refuse la requête si l'utilisateur n'est pas connecté.
export function requireAuth(req: Request, res: Response<unknown, AuthLocals>, next: NextFunction) {
    try {
        const userId = readUserId(req);
        if (!userId) {
            res.status(401).json({status: "error", message: "Authentication required"});
            return;
        }
        res.locals.userId = userId;
        next();
    } catch {
        res.status(401).json({status: "error", message: "Invalid or expired token"});
    }
}

// Laisse passer les invités, mais refuse un token invalide (pour que le client sache qu'il doit se reconnecter).
export function optionalAuth(req: Request, res: Response<unknown, AuthLocals>, next: NextFunction) {
    try {
        const userId = readUserId(req);
        if (userId) res.locals.userId = userId;
        next();
    } catch {
        res.status(401).json({status: "error", message: "Invalid or expired token"});
    }
}
