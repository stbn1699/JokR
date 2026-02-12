import type {Request, Response} from 'express';
import {UsersService} from '../services/Users.service.js';
import jwt from 'jsonwebtoken';
import {asyncHandler} from "../AsyncRouteHandlerMiddleware.js";

/*
 * Contrôleur des utilisateurs
 * Fournit les handlers pour l'enregistrement et la connexion.
 * - register: crée un nouvel utilisateur via UsersService.register
 * - login: authentifie un utilisateur via UsersService.authenticate et renvoie un JWT
 *
 * Remarques :
 * - Les réponses HTTP suivent un format simple { status, data? | message? }
 * - asyncHandler est utilisé pour centraliser la gestion d'erreurs asynchrones
 * - La variable d'environnement JWT_SECRET est utilisée si disponible, sinon une clé de développement est fournie
 */
export function createUsersController(service: UsersService) {
    return {
        // Handler pour l'inscription d'un nouvel utilisateur
        register: asyncHandler(async (req: Request, res: Response) => {
            // Extraction et validation minimale des champs attendus
            const {username, email, password} = req.body;
            if (!username || !email || !password) return res.status(400).json({
                status: 'error',
                message: 'Missing fields'
            });

            // Délégation à la couche service pour créer l'utilisateur
            const user = await service.register({username, email, password});

            // Réponse 201 (Created) avec les données utilisateurs (selon ce que renvoie le service)
            res.status(201).json({status: 'ok', data: user});
        }),

        // Handler pour la connexion (login)
        login: asyncHandler(async (req: Request, res: Response) => {
            const {identifier, password} = req.body;

            // identifier peut être un username ou un email selon l'implémentation du service
            if (!identifier || !password) return res.status(400).json({status: 'error', message: 'Missing fields'});

            // Tentative d'authentification via le service
            const user = await service.authenticate(identifier, password);
            if (!user) return res.status(401).json({status: 'error', message: 'Invalid credentials'});

            const userId = user.id;

            // Création d'un JWT minimal : subject (sub) et username
            // Le secret est lu depuis l'environnement, sinon on utilise une valeur par défaut pour le développement
            const token = jwt.sign({
                sub: userId,
                username: user.username
            }, process.env.JWT_SECRET || 'dev-secret', {expiresIn: '7d'});

            // Retourne le token et l'identifiant utilisateur
            res.status(200).json({status: 'ok', data: {token, userId}});
        })
    };
}
