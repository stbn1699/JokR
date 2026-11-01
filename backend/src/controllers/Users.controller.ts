import type {Request, Response} from 'express';
import {UserAlreadyExistsError, UsersService} from '../services/Users.service.js';
import jwt from 'jsonwebtoken';
import {asyncHandler} from "../AsyncRouteHandlerMiddleware.js";
import {config} from "../config.js";
import {isUuid} from "../utils/validation.js";

/*
 * Contrôleur des utilisateurs
 * Fournit les handlers pour l'enregistrement, la connexion et la lecture d'un profil public.
 *
 * Remarques :
 * - Les réponses HTTP suivent un format simple { status, data? | message? }
 * - asyncHandler est utilisé pour centraliser la gestion d'erreurs asynchrones
 * - Le mot de passe et l'email ne sont jamais renvoyés au client
 */

const USERNAME_REGEX = /^[\p{L}\p{N}_.-]{3,30}$/u;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function isNonEmptyString(v: unknown, maxLength: number): v is string {
    return typeof v === 'string' && v.length > 0 && v.length <= maxLength;
}

export function createUsersController(service: UsersService) {
    return {
        // Handler pour l'inscription d'un nouvel utilisateur
        register: asyncHandler(async (req: Request, res: Response) => {
            const {username, email, password} = req.body ?? {};

            if (!isNonEmptyString(username, 30) || !USERNAME_REGEX.test(username)) {
                return res.status(400).json({
                    status: 'error',
                    message: "Le nom d'utilisateur doit faire 3 à 30 caractères (lettres, chiffres, _ . -)"
                });
            }
            if (!isNonEmptyString(email, 255) || !EMAIL_REGEX.test(email)) {
                return res.status(400).json({status: 'error', message: 'Email invalide'});
            }
            // Le client envoie un hash SHA-256 (64 caractères hexa) ; on borne juste la taille
            if (!isNonEmptyString(password, 200)) {
                return res.status(400).json({status: 'error', message: 'Mot de passe invalide'});
            }

            try {
                const user = await service.register({username, email, password});
                res.status(201).json({status: 'ok', data: user});
            } catch (err) {
                if (err instanceof UserAlreadyExistsError) {
                    return res.status(409).json({status: 'error', message: "Ce nom d'utilisateur ou cet email est déjà utilisé"});
                }
                throw err;
            }
        }),

        // Handler pour la connexion (login)
        login: asyncHandler(async (req: Request, res: Response) => {
            const {identifier, password} = req.body ?? {};

            // identifier peut être un username ou un email
            if (!isNonEmptyString(identifier, 255) || !isNonEmptyString(password, 200)) {
                return res.status(400).json({status: 'error', message: 'Missing fields'});
            }

            const user = await service.authenticate(identifier, password);
            if (!user) return res.status(401).json({status: 'error', message: 'Invalid credentials'});

            // JWT minimal : subject (sub) = id utilisateur
            const token = jwt.sign(
                {sub: user.id, username: user.username},
                config.jwtSecret,
                {expiresIn: config.jwtExpiresIn}
            );

            res.status(200).json({
                status: 'ok',
                data: {token, userId: user.id, userLevel: user.user_level, userXp: user.user_xp}
            });
        }),

        // Profil public (id, username, niveau, xp)
        getByUserId: asyncHandler(async (req: Request, res: Response) => {
            const {userId} = req.params;
            if (!userId || !isUuid(userId)) return res.status(400).json({status: 'error', message: 'Invalid userId'});
            const user = await service.getByUserId(userId);
            if (!user) return res.status(404).json({status: 'error', message: 'User not found'});
            res.status(200).json({status: 'ok', data: user});
        })
    };
}
