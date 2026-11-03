import jwt from "jsonwebtoken";
import {randomBytes} from "node:crypto";
import {config} from "../config.js";

/*
 * Connexion avec un compte externe (OAuth 2, flux "authorization code").
 *
 * 1. Le front demande l'adresse de connexion (POST /users/oauth/:provider/start) et y envoie le joueur
 * 2. Le fournisseur renvoie le joueur sur le front (APP_URL/auth/callback/:provider) avec un `code`
 * 3. Le front transmet le code au serveur, qui l'échange contre le profil du joueur
 *
 * Le `state` est un JWT signé (pas de session côté serveur) : il garde le fournisseur, le mode
 * (connexion ou liaison à un compte existant) et expire au bout de 10 minutes. Le front garde
 * aussi sa copie et vérifie qu'elle revient à l'identique (protection contre le login CSRF).
 */

export const PROVIDERS = ["google", "discord"] as const;
export type Provider = typeof PROVIDERS[number];

export function isProvider(value: unknown): value is Provider {
    return typeof value === "string" && (PROVIDERS as readonly string[]).includes(value);
}

// Profil commun renvoyé par les fournisseurs
export type ExternalProfile = {
    provider: Provider;
    providerUserId: string;
    // email seulement s'il est vérifié par le fournisseur (sinon on ne peut pas lui faire confiance)
    email: string | null;
    displayName: string | null;
};

type ProviderConfig = {
    authorizeUrl: string;
    tokenUrl: string;
    scope: string;
    // paramètres en plus dans l'adresse de connexion
    extraParams: Record<string, string>;
    fetchProfile: (accessToken: string) => Promise<ExternalProfile>;
};

const PROVIDER_CONFIG: Record<Provider, ProviderConfig> = {
    google: {
        authorizeUrl: "https://accounts.google.com/o/oauth2/v2/auth",
        tokenUrl: "https://oauth2.googleapis.com/token",
        scope: "openid email profile",
        // laisse choisir le compte Google à chaque fois (utile sur un ordinateur partagé)
        extraParams: {prompt: "select_account"},
        fetchProfile: async (accessToken) =>
            parseGoogleProfile(await getJson("https://openidconnect.googleapis.com/v1/userinfo", accessToken)),
    },
    discord: {
        authorizeUrl: "https://discord.com/oauth2/authorize",
        tokenUrl: "https://discord.com/api/oauth2/token",
        scope: "identify email",
        extraParams: {},
        fetchProfile: async (accessToken) =>
            parseDiscordProfile(await getJson("https://discord.com/api/users/@me", accessToken)),
    },
};

// Fournisseurs dont les identifiants sont configurés (les autres boutons ne sont pas affichés)
export function enabledProviders(): Provider[] {
    return PROVIDERS.filter(p => config.oauth[p] !== undefined);
}

function redirectUri(provider: Provider): string {
    return `${config.appUrl}/auth/callback/${provider}`;
}

// ---------- state ----------

export type OAuthMode = "login" | "link";
type StatePayload = { purpose: "oauth-state"; provider: Provider; mode: OAuthMode; uid?: string; nonce: string };

export function createState(provider: Provider, mode: OAuthMode, linkUserId?: string): string {
    const payload: StatePayload = {purpose: "oauth-state", provider, mode, nonce: randomBytes(16).toString("base64url")};
    if (mode === "link" && linkUserId) payload.uid = linkUserId;
    return jwt.sign(payload, config.jwtSecret, {expiresIn: "10m"});
}

// null si le state est invalide, expiré ou prévu pour un autre fournisseur
export function readState(state: string, provider: Provider): { mode: OAuthMode; linkUserId?: string } | null {
    try {
        const payload = jwt.verify(state, config.jwtSecret);
        if (typeof payload === "string" || payload.purpose !== "oauth-state" || payload.provider !== provider) return null;
        if (payload.mode === "login") return {mode: "login"};
        if (payload.mode === "link" && typeof payload.uid === "string") return {mode: "link", linkUserId: payload.uid};
        return null;
    } catch {
        return null;
    }
}

// ---------- jeton d'inscription (choix du pseudo après une première connexion) ----------

type SignupPayload = { purpose: "oauth-signup"; provider: Provider; pid: string; email: string | null; name: string | null };

export function createSignupToken(profile: ExternalProfile): string {
    const payload: SignupPayload = {
        purpose: "oauth-signup", provider: profile.provider, pid: profile.providerUserId,
        email: profile.email, name: profile.displayName,
    };
    return jwt.sign(payload, config.jwtSecret, {expiresIn: "15m"});
}

export function readSignupToken(token: string): ExternalProfile | null {
    try {
        const p = jwt.verify(token, config.jwtSecret);
        if (typeof p === "string" || p.purpose !== "oauth-signup" || !isProvider(p.provider) || typeof p.pid !== "string") {
            return null;
        }
        return {
            provider: p.provider,
            providerUserId: p.pid,
            email: typeof p.email === "string" ? p.email : null,
            displayName: typeof p.name === "string" ? p.name : null,
        };
    } catch {
        return null;
    }
}

// ---------- échanges avec le fournisseur ----------

export class OAuthProviderError extends Error {
}

export function authorizeUrl(provider: Provider, state: string): string {
    const settings = PROVIDER_CONFIG[provider];
    const credentials = config.oauth[provider];
    if (!credentials) throw new OAuthProviderError(`${provider} n'est pas configuré`);
    const params = new URLSearchParams({
        client_id: credentials.clientId,
        redirect_uri: redirectUri(provider),
        response_type: "code",
        scope: settings.scope,
        state,
        ...settings.extraParams,
    });
    return `${settings.authorizeUrl}?${params}`;
}

// Échange le code reçu contre le profil du joueur
export async function fetchExternalProfile(provider: Provider, code: string): Promise<ExternalProfile> {
    const settings = PROVIDER_CONFIG[provider];
    const credentials = config.oauth[provider];
    if (!credentials) throw new OAuthProviderError(`${provider} n'est pas configuré`);

    const res = await fetch(settings.tokenUrl, {
        method: "POST",
        headers: {"Content-Type": "application/x-www-form-urlencoded", Accept: "application/json"},
        body: new URLSearchParams({
            client_id: credentials.clientId,
            client_secret: credentials.clientSecret,
            grant_type: "authorization_code",
            code,
            redirect_uri: redirectUri(provider),
        }),
        signal: AbortSignal.timeout(10_000),
    });
    const body: unknown = await res.json().catch(() => null);
    if (!res.ok || !isRecord(body) || typeof body.access_token !== "string") {
        throw new OAuthProviderError(`Échange du code ${provider} refusé (${res.status})`);
    }
    return settings.fetchProfile(body.access_token);
}

async function getJson(url: string, accessToken: string): Promise<unknown> {
    const res = await fetch(url, {
        headers: {Authorization: `Bearer ${accessToken}`, Accept: "application/json"},
        signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) throw new OAuthProviderError(`Profil refusé par ${url} (${res.status})`);
    return res.json();
}

function isRecord(v: unknown): v is Record<string, unknown> {
    return typeof v === "object" && v !== null;
}

function str(v: unknown): string | null {
    return typeof v === "string" && v.length > 0 ? v : null;
}

export function parseGoogleProfile(body: unknown): ExternalProfile {
    if (!isRecord(body) || !str(body.sub)) throw new OAuthProviderError("Profil Google invalide");
    return {
        provider: "google",
        providerUserId: body.sub as string,
        email: body.email_verified === true ? str(body.email)?.toLowerCase() ?? null : null,
        displayName: str(body.name) ?? str(body.given_name),
    };
}

export function parseDiscordProfile(body: unknown): ExternalProfile {
    if (!isRecord(body) || !str(body.id)) throw new OAuthProviderError("Profil Discord invalide");
    return {
        provider: "discord",
        providerUserId: body.id as string,
        email: body.verified === true ? str(body.email)?.toLowerCase() ?? null : null,
        // global_name = nom affiché, username = identifiant unique Discord
        displayName: str(body.global_name) ?? str(body.username),
    };
}

// Pseudo proposé à partir du nom chez le fournisseur : seulement les caractères autorisés, 3 à 30
export function usernameFromDisplayName(name: string | null): string {
    const cleaned = (name ?? "")
        .normalize("NFKC")
        .replace(/\s+/g, "_")
        .replace(/[^\p{L}\p{N}_.-]/gu, "")
        .slice(0, 30);
    return cleaned.length >= 3 ? cleaned : `joueur${cleaned}`.slice(0, 30);
}
