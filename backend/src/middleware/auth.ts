import type {NextFunction, Request, Response} from "express";
import jwt from "jsonwebtoken";
import {config} from "../config.js";
import {isGhost} from "../services/adminMode.js";

/*
 * Middlewares d'authentification JWT.
 * Le token est attendu dans l'en-tête `Authorization: Bearer <token>`.
 * L'id de l'utilisateur connecté est placé dans `res.locals.userId`.
 */

// ghost : joueur en mode admin (voir services/adminMode.ts)
export type AuthLocals = { userId?: string; ghost?: boolean };

// Retourne l'id utilisateur du token, null s'il n'y a pas de token, ou lève une erreur s'il est invalide.
function readUserId(req: Request): string | null {
    const header = req.headers.authorization;
    if (!header) return null;

    const [scheme, token] = header.split(" ");
    if (scheme !== "Bearer" || !token) throw new Error("Malformed Authorization header");

    const payload = jwt.verify(token, config.jwtSecret);
    // `purpose` : jetons temporaires de connexion Google / Discord, qui n'ouvrent pas de session
    if (typeof payload === "string" || typeof payload.sub !== "string" || "purpose" in payload) {
        throw new Error("Invalid token payload");
    }
    return payload.sub;
}

// Id du joueur connecté s'il y en a un, sans jamais refuser la requête (token absent ou invalide = invité).
// Sert aux statistiques sur des routes ouvertes à tous (génération d'une grille).
export function peekUserId(req: Request): string | null {
    try {
        return readUserId(req);
    } catch {
        return null;
    }
}

// Refuse la requête si l'utilisateur n'est pas connecté.
export function requireAuth(req: Request, res: Response<unknown, AuthLocals>, next: NextFunction) {
    try {
        const userId = readUserId(req);
        if (!userId) {
            res.status(401).json({status: "error", message: "Connexion requise"});
            return;
        }
        res.locals.userId = userId;
        res.locals.ghost = isGhost(userId);
        next();
    } catch {
        res.status(401).json({status: "error", message: "Session expirée, reconnecte-toi"});
    }
}

// Laisse passer les invités, mais refuse un token invalide (pour que le client sache qu'il doit se reconnecter).
export function optionalAuth(req: Request, res: Response<unknown, AuthLocals>, next: NextFunction) {
    try {
        const userId = readUserId(req);
        // mode admin : traité comme un invité (pas d'XP, de crédits, de résultats ni de classements)
        if (isGhost(userId)) res.locals.ghost = true;
        else if (userId) res.locals.userId = userId;
        next();
    } catch {
        res.status(401).json({status: "error", message: "Session expirée, reconnecte-toi"});
    }
}
