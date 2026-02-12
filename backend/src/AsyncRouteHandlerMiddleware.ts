import type {NextFunction, Request, Response} from "express";

/*
 * Middleware helper pour les handlers asynchrones
 * Permet d'écrire des controllers async sans répéter try/catch dans chaque route.
 * Exemple d'utilisation : app.get('/x', asyncHandler(async (req,res) => { ... }))
 */
type AsyncRouteHandler = (req: Request, res: Response, next: NextFunction) => Promise<unknown>;

export function asyncHandler(fn: AsyncRouteHandler) {
    return (req: Request, res: Response, next: NextFunction) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
}
