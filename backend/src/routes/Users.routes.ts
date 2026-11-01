import {Router} from 'express';
import {pool} from '../db/pool.js';
import {createDb} from '../db/kysely.js';
import {UsersRepository} from '../repository/Users.repository.js';
import {UsersService} from '../services/Users.service.js';
import {createUsersController} from '../controllers/Users.controller.js';
import {rateLimit} from 'express-rate-limit';
import {requireAuth} from '../middleware/auth.js';

/*
 * Router pour les endpoints utilisateurs
 * - POST /register : création d'un nouvel utilisateur
 * - POST /login : authentification et obtention d'un JWT
 * - GET /me : profil du joueur connecté (JWT requis)
 * - GET /:userId : profil public (sans email ni mot de passe)
 *
 * /register et /login sont limités pour freiner le brute-force.
 *
 * Chaîne de construction locale : pool -> createDb -> UsersRepository -> UsersService -> UsersController
 */
const UsersRoutes = Router();
const db = createDb(pool);
const repo = new UsersRepository(db);
const service = new UsersService(repo);
const controller = createUsersController(service);

// 10 tentatives de connexion / 15 min par IP, 5 inscriptions / heure par IP
const loginLimiter = rateLimit({windowMs: 15 * 60 * 1000, limit: 10, standardHeaders: 'draft-7', legacyHeaders: false,
    message: {status: 'error', message: 'Trop de tentatives, réessaie dans quelques minutes'}});
const registerLimiter = rateLimit({windowMs: 60 * 60 * 1000, limit: 5, standardHeaders: 'draft-7', legacyHeaders: false,
    message: {status: 'error', message: "Trop d'inscriptions depuis cette adresse, réessaie plus tard"}});

UsersRoutes.post('/register', registerLimiter, controller.register);
UsersRoutes.post('/login', loginLimiter, controller.login);
// /me doit être déclarée avant /:userId
UsersRoutes.get('/me', requireAuth, controller.me);
UsersRoutes.get('/:userId', controller.getByUserId);

export default UsersRoutes;

