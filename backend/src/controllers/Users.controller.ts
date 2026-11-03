import type {Request, Response} from 'express';
import {
    IdentityTakenError,
    ProviderAlreadyLinkedError,
    UserAlreadyExistsError,
    UsersService
} from '../services/Users.service.js';
import jwt from 'jsonwebtoken';
import {asyncHandler} from "../AsyncRouteHandlerMiddleware.js";
import {config} from "../config.js";
import {isUuid, routeParam} from "../utils/validation.js";
import type {AuthLocals} from "../middleware/auth.js";
import type {GameResultsRepository} from "../repository/GameResults.repository.js";
import type {User} from "../models/User.model.js";
import {
    authorizeUrl,
    createSignupToken,
    createState,
    enabledProviders,
    type ExternalProfile,
    fetchExternalProfile,
    isProvider,
    OAuthProviderError,
    type Provider,
    readSignupToken,
    readState,
} from "../services/oauth.js";

/*
 * Contrôleur des utilisateurs
 * Fournit les handlers pour l'enregistrement, la connexion (mot de passe, Google, Discord)
 * et la lecture d'un profil public.
 *
 * Remarques :
 * - Les réponses HTTP suivent un format simple { status, data? | message? }
 * - asyncHandler est utilisé pour centraliser la gestion d'erreurs asynchrones
 * - Le mot de passe et l'email ne sont jamais renvoyés au client
 */

const USERNAME_REGEX = /^[\p{L}\p{N}_.-]{3,30}$/u;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// Graine de l'icône de profil (voir src/Services/avatar.ts côté front)
const AVATAR_REGEX = /^[a-z0-9]{4,32}$/;
const USERNAME_RULE = "Le nom d'utilisateur doit faire 3 à 30 caractères (lettres, chiffres, _ . -)";
const PROVIDER_NAMES: Record<Provider, string> = {google: "Google", discord: "Discord"};

function isNonEmptyString(v: unknown, maxLength: number): v is string {
    return typeof v === 'string' && v.length > 0 && v.length <= maxLength;
}

function isAvatar(v: unknown): v is string {
    return typeof v === 'string' && AVATAR_REGEX.test(v);
}

// Réponse de connexion : JWT minimal, subject (sub) = id utilisateur
function sessionFor(user: User) {
    const token = jwt.sign(
        {sub: user.id, username: user.username},
        config.jwtSecret,
        {expiresIn: config.jwtExpiresIn}
    );
    return {token, userId: user.id, userLevel: user.user_level, userXp: user.user_xp};
}

// Fournisseur de l'adresse, seulement s'il est configuré
function providerParam(req: Request): Provider | null {
    const provider = routeParam(req.params, "provider");
    return isProvider(provider) && enabledProviders().includes(provider) ? provider : null;
}

export function createUsersController(service: UsersService, results: GameResultsRepository) {
    return {
        // Handler pour l'inscription d'un nouvel utilisateur
        register: asyncHandler(async (req: Request, res: Response) => {
            const {username, email, password, avatar} = req.body ?? {};

            if (!isNonEmptyString(username, 30) || !USERNAME_REGEX.test(username)) {
                return res.status(400).json({status: 'error', message: USERNAME_RULE});
            }
            if (!isNonEmptyString(email, 255) || !EMAIL_REGEX.test(email)) {
                return res.status(400).json({status: 'error', message: 'Email invalide'});
            }
            // Le client envoie un hash SHA-256 (64 caractères hexa) ; on borne juste la taille
            if (!isNonEmptyString(password, 200)) {
                return res.status(400).json({status: 'error', message: 'Mot de passe invalide'});
            }
            if (avatar !== undefined && !isAvatar(avatar)) {
                return res.status(400).json({status: 'error', message: 'Icône de profil invalide'});
            }

            try {
                const user = await service.register({username, email, password, avatar});
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
                return res.status(400).json({status: 'error', message: 'Tous les champs sont obligatoires'});
            }

            const user = await service.authenticate(identifier, password);
            if (!user) return res.status(401).json({status: 'error', message: 'Identifiant ou mot de passe incorrect'});

            res.status(200).json({status: 'ok', data: sessionFor(user)});
        }),

        // Fournisseurs de connexion configurés (le front n'affiche que ces boutons)
        oauthProviders: (_req: Request, res: Response) => {
            res.status(200).json({status: 'ok', data: enabledProviders()});
        },

        // Adresse où envoyer le joueur pour se connecter : { mode: "login" | "link" }
        // "link" (lier à son compte depuis le profil) demande d'être connecté
        oauthStart: (req: Request, res: Response<unknown, AuthLocals>) => {
            const provider = providerParam(req);
            if (!provider) return res.status(404).json({status: 'error', message: 'Fournisseur de connexion inconnu'});
            const mode = req.body?.mode === 'link' ? 'link' : 'login';
            if (mode === 'link' && !res.locals.userId) {
                return res.status(401).json({status: 'error', message: 'Connexion requise'});
            }
            const state = createState(provider, mode, res.locals.userId);
            res.status(200).json({status: 'ok', data: {url: authorizeUrl(provider, state), state}});
        },

        // Retour du fournisseur : { code, state }. Réponses possibles (data.result) :
        // - "logged_in" : session ouverte (token...)
        // - "needs_username" : première connexion, le joueur choisit son pseudo (signupToken)
        // - "linked" : compte lié au joueur connecté
        oauthCallback: asyncHandler(async (req: Request, res: Response<unknown, AuthLocals>) => {
            const provider = providerParam(req);
            if (!provider) return res.status(404).json({status: 'error', message: 'Fournisseur de connexion inconnu'});
            const {code, state} = req.body ?? {};
            if (!isNonEmptyString(code, 2000) || !isNonEmptyString(state, 2000)) {
                return res.status(400).json({status: 'error', message: 'Réponse de connexion incomplète'});
            }
            const flow = readState(state, provider);
            if (!flow) return res.status(400).json({status: 'error', message: 'Connexion expirée, recommence'});
            if (flow.mode === 'link' && res.locals.userId !== flow.linkUserId) {
                return res.status(401).json({status: 'error', message: 'Reconnecte-toi pour lier ce compte'});
            }

            const name = PROVIDER_NAMES[provider];
            let profile: ExternalProfile;
            try {
                profile = await fetchExternalProfile(provider, code);
            } catch (err) {
                if (!(err instanceof OAuthProviderError)) throw err;
                console.warn(err.message);
                return res.status(502).json({status: 'error', message: `Connexion avec ${name} impossible, réessaie`});
            }

            try {
                if (flow.mode === 'link') {
                    await service.linkProfile(flow.linkUserId!, profile);
                    return res.status(200).json({status: 'ok', data: {result: 'linked', provider}});
                }
                const user = await service.loginWithProfile(profile);
                if (user) return res.status(200).json({status: 'ok', data: {result: 'logged_in', ...sessionFor(user)}});
                res.status(200).json({
                    status: 'ok',
                    data: {
                        result: 'needs_username',
                        signupToken: createSignupToken(profile),
                        suggestedUsername: await service.suggestUsername(profile),
                    }
                });
            } catch (err) {
                if (err instanceof IdentityTakenError) {
                    return res.status(409).json({status: 'error', message: `Ce compte ${name} est déjà lié à un autre joueur`});
                }
                if (err instanceof ProviderAlreadyLinkedError) {
                    return res.status(409).json({status: 'error', message: `Un autre compte ${name} est déjà lié à ce joueur`});
                }
                throw err;
            }
        }),

        // Fin de la première connexion avec Google / Discord : { signupToken, username }
        oauthComplete: asyncHandler(async (req: Request, res: Response) => {
            const {signupToken, username, avatar} = req.body ?? {};
            const profile = isNonEmptyString(signupToken, 2000) ? readSignupToken(signupToken) : null;
            if (!profile) return res.status(400).json({status: 'error', message: 'Inscription expirée, recommence'});
            if (!isNonEmptyString(username, 30) || !USERNAME_REGEX.test(username)) {
                return res.status(400).json({status: 'error', message: USERNAME_RULE});
            }
            if (avatar !== undefined && !isAvatar(avatar)) {
                return res.status(400).json({status: 'error', message: 'Icône de profil invalide'});
            }
            try {
                const user = await service.registerWithProfile(username, profile, avatar);
                res.status(201).json({status: 'ok', data: sessionFor(user)});
            } catch (err) {
                if (err instanceof UserAlreadyExistsError) {
                    return res.status(409).json({status: 'error', message: "Ce nom d'utilisateur est déjà pris"});
                }
                if (err instanceof IdentityTakenError) {
                    // Compte déjà créé (double envoi) : on ouvre simplement la session
                    const user = await service.loginWithProfile(profile);
                    if (user) return res.status(200).json({status: 'ok', data: sessionFor(user)});
                }
                throw err;
            }
        }),

        // Retire un compte Google / Discord lié (refusé si c'est le seul moyen de se connecter)
        unlinkProvider: asyncHandler(async (req: Request, res: Response<unknown, AuthLocals>) => {
            const provider = routeParam(req.params, "provider");
            if (!isProvider(provider)) return res.status(404).json({status: 'error', message: 'Fournisseur de connexion inconnu'});
            const ok = await service.unlinkProvider(res.locals.userId!, provider);
            if (!ok) {
                return res.status(409).json({
                    status: 'error',
                    message: "Définis d'abord un mot de passe, sinon tu ne pourras plus te connecter"
                });
            }
            res.status(200).json({status: 'ok', data: null});
        }),

        // Profil du joueur connecté (route protégée par requireAuth)
        me: asyncHandler(async (_req: Request, res: Response<unknown, AuthLocals>) => {
            const user = await service.getMe(res.locals.userId!);
            if (!user) return res.status(404).json({status: 'error', message: 'Utilisateur introuvable'});
            res.status(200).json({status: 'ok', data: user});
        }),

        // Change l'icône de profil : { avatar }
        changeAvatar: asyncHandler(async (req: Request, res: Response<unknown, AuthLocals>) => {
            const {avatar} = req.body ?? {};
            if (!isAvatar(avatar)) return res.status(400).json({status: 'error', message: 'Icône de profil invalide'});
            await service.changeAvatar(res.locals.userId!, avatar);
            res.status(200).json({status: 'ok', data: {avatar}});
        }),

        // Parties gagnées par le joueur connecté, par pages : ?limit=10&offset=0 (limit ≤ 50)
        myResults: asyncHandler(async (req: Request, res: Response<unknown, AuthLocals>) => {
            const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 10));
            const offset = Math.max(0, Number(req.query.offset) || 0);
            const data = await results.listRecent(res.locals.userId!, limit, offset);
            res.status(200).json({status: 'ok', data});
        }),

        // Changement de mot de passe : { currentPassword, newPassword }
        // currentPassword est absent pour un joueur qui n'a pas encore de mot de passe (Google / Discord)
        changePassword: asyncHandler(async (req: Request, res: Response<unknown, AuthLocals>) => {
            const {currentPassword, newPassword} = req.body ?? {};
            if ((currentPassword !== undefined && !isNonEmptyString(currentPassword, 200)) || !isNonEmptyString(newPassword, 200)) {
                return res.status(400).json({status: 'error', message: 'Tous les champs sont obligatoires'});
            }
            const ok = await service.changePassword(res.locals.userId!, currentPassword, newPassword);
            if (!ok) return res.status(403).json({status: 'error', message: 'Mot de passe actuel incorrect'});
            res.status(200).json({status: 'ok', data: null});
        }),

        // Suppression définitive du compte : { password }, ou { username } pour un joueur sans mot de passe
        deleteAccount: asyncHandler(async (req: Request, res: Response<unknown, AuthLocals>) => {
            const {password, username} = req.body ?? {};
            if (!isNonEmptyString(password, 200) && !isNonEmptyString(username, 30)) {
                return res.status(400).json({status: 'error', message: 'Confirmation obligatoire'});
            }
            const ok = await service.deleteAccount(res.locals.userId!, {
                password: typeof password === 'string' ? password : undefined,
                username: typeof username === 'string' ? username : undefined,
            });
            if (!ok) return res.status(403).json({status: 'error', message: 'Confirmation incorrecte'});
            res.status(200).json({status: 'ok', data: null});
        }),

        // Profil public (id, username, niveau, xp)
        getByUserId: asyncHandler(async (req: Request, res: Response) => {
            const userId = routeParam(req.params, "userId");
            if (!userId || !isUuid(userId)) return res.status(400).json({status: 'error', message: "Identifiant d'utilisateur invalide"});
            const user = await service.getByUserId(userId);
            if (!user) return res.status(404).json({status: 'error', message: 'Utilisateur introuvable'});
            res.status(200).json({status: 'ok', data: user});
        })
    };
}
