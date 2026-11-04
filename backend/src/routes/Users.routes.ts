import {Router} from 'express';
import {pool} from '../db/pool.js';
import {createDb} from '../db/kysely.js';
import {UsersRepository} from '../repository/Users.repository.js';
import {UsersService} from '../services/Users.service.js';
import {createUsersController} from '../controllers/Users.controller.js';
import {rateLimit} from 'express-rate-limit';
import {optionalAuth, requireAuth} from '../middleware/auth.js';
import {GameResultsRepository} from '../repository/GameResults.repository.js';

/*
 * Router pour les endpoints utilisateurs
 * - POST /register : création d'un nouvel utilisateur
 * - POST /login : authentification et obtention d'un JWT
 * - GET /oauth/providers : fournisseurs de connexion configurés (google, discord)
 * - POST /oauth/:provider/start : adresse de connexion chez le fournisseur
 * - POST /oauth/:provider/callback : retour du fournisseur (connexion, inscription ou liaison)
 * - POST /oauth/complete : fin d'inscription avec Google / Discord (choix du pseudo)
 * - DELETE /me/identities/:provider : retire un compte lié (JWT requis)
 * - GET /me : profil du joueur connecté (JWT requis)
 * - GET /me/results : ses parties gagnées, par pages (JWT requis)
 * - PUT /me/password : change son mot de passe (JWT requis)
 * - PUT /me/avatar : change son icône de profil (JWT requis)
 * - PUT /me/username : change son pseudo (JWT requis)
 * - PUT /me/privacy : ce que les autres joueurs voient sur sa page (JWT requis)
 * - PUT /me/version : dernière version du site vue, pour la popup des nouveautés (JWT requis)
 * - DELETE /me : supprime son compte (JWT + mot de passe requis)
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
const controller = createUsersController(service, new GameResultsRepository(db));

// 10 tentatives de connexion / 15 min par IP, 5 inscriptions / heure par IP
const loginLimiter = rateLimit({windowMs: 15 * 60 * 1000, limit: 10, standardHeaders: 'draft-7', legacyHeaders: false,
    message: {status: 'error', message: 'Trop de tentatives, réessaie dans quelques minutes'}});
const registerLimiter = rateLimit({windowMs: 60 * 60 * 1000, limit: 5, standardHeaders: 'draft-7', legacyHeaders: false,
    message: {status: 'error', message: "Trop d'inscriptions depuis cette adresse, réessaie plus tard"}});

// Changement de pseudo : 10 par heure (évite de changer de nom en boucle)
const usernameLimiter = rateLimit({windowMs: 60 * 60 * 1000, limit: 10, standardHeaders: 'draft-7', legacyHeaders: false,
    message: {status: 'error', message: 'Trop de changements de pseudo, réessaie plus tard'}});

// Connexion Google / Discord : deux requêtes par connexion, d'où une limite plus large
const oauthLimiter = rateLimit({windowMs: 15 * 60 * 1000, limit: 30, standardHeaders: 'draft-7', legacyHeaders: false,
    message: {status: 'error', message: 'Trop de tentatives, réessaie dans quelques minutes'}});

UsersRoutes.post('/register', registerLimiter, controller.register);
UsersRoutes.post('/login', loginLimiter, controller.login);
UsersRoutes.get('/oauth/providers', controller.oauthProviders);
UsersRoutes.post('/oauth/complete', registerLimiter, controller.oauthComplete);
UsersRoutes.post('/oauth/:provider/start', oauthLimiter, optionalAuth, controller.oauthStart);
UsersRoutes.post('/oauth/:provider/callback', oauthLimiter, optionalAuth, controller.oauthCallback);
// /me doit être déclarée avant /:userId
UsersRoutes.get('/me', requireAuth, controller.me);
UsersRoutes.get('/me/results', requireAuth, controller.myResults);
UsersRoutes.put('/me/avatar', requireAuth, controller.changeAvatar);
UsersRoutes.put('/me/username', requireAuth, usernameLimiter, controller.changeUsername);
UsersRoutes.put('/me/privacy', requireAuth, controller.changePrivacy);
UsersRoutes.put('/me/version', requireAuth, controller.markVersionSeen);
// ces deux routes vérifient le mot de passe : même limite de tentatives que la connexion
UsersRoutes.put('/me/password', requireAuth, loginLimiter, controller.changePassword);
UsersRoutes.delete('/me', requireAuth, loginLimiter, controller.deleteAccount);
UsersRoutes.delete('/me/identities/:provider', requireAuth, controller.unlinkProvider);
UsersRoutes.get('/:userId', controller.getByUserId);

export default UsersRoutes;

