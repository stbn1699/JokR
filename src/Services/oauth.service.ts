import {api} from "../api/api.ts";
import type {LoggedUser} from "../Models/loggedUser.model.ts";

/*
 * Connexion avec Google / Discord.
 * start() envoie le joueur chez le fournisseur, qui le renvoie sur /auth/callback/:provider.
 * Le state reçu est gardé dans sessionStorage pour vérifier au retour que c'est bien nous
 * qui avons lancé la connexion (sinon un site tiers pourrait nous connecter à son compte).
 */

export type Provider = "google" | "discord";
export type OAuthMode = "login" | "link";

export const PROVIDER_NAMES: Record<Provider, string> = {google: "Google", discord: "Discord"};

const PENDING_KEY = "oauth_pending";

type Pending = { provider: Provider; state: string; mode: OAuthMode; from?: string };

export type CallbackResult =
    | ({ result: "logged_in" } & LoggedUser)
    | { result: "needs_username"; signupToken: string; suggestedUsername: string }
    | { result: "linked"; provider: Provider };

const json = {"Content-Type": "application/json"};

export const oauthService = {
    // Fournisseurs configurés sur le serveur (liste vide si aucun)
    providers(signal?: AbortSignal): Promise<Provider[]> {
        return api<Provider[]>("/users/oauth/providers", {method: "GET"}, signal);
    },

    // Part chez le fournisseur. `from` : page à rouvrir une fois connecté
    async start(provider: Provider, mode: OAuthMode, from?: string): Promise<void> {
        const {url, state} = await api<{ url: string; state: string }>(`/users/oauth/${provider}/start`, {
            method: "POST", headers: json, body: JSON.stringify({mode}),
        });
        const pending: Pending = {provider, state, mode, ...(from ? {from} : {})};
        sessionStorage.setItem(PENDING_KEY, JSON.stringify(pending));
        window.location.assign(url);
    },

    // Connexion lancée par nous pour ce fournisseur et ce state (lu une seule fois)
    takePending(provider: string, state: string | null): Pending | null {
        const raw = sessionStorage.getItem(PENDING_KEY);
        sessionStorage.removeItem(PENDING_KEY);
        if (!raw || !state) return null;
        try {
            const pending = JSON.parse(raw) as Pending;
            return pending.provider === provider && pending.state === state ? pending : null;
        } catch {
            return null;
        }
    },

    callback(provider: Provider, code: string, state: string): Promise<CallbackResult> {
        return api<CallbackResult>(`/users/oauth/${provider}/callback`, {
            method: "POST", headers: json, body: JSON.stringify({code, state}),
        });
    },

    // Première connexion : crée le compte avec le pseudo choisi
    complete(signupToken: string, username: string, avatar?: string): Promise<LoggedUser> {
        return api<LoggedUser>("/users/oauth/complete", {
            method: "POST", headers: json, body: JSON.stringify({signupToken, username, avatar}),
        });
    },

    async unlink(provider: Provider): Promise<void> {
        await api(`/users/me/identities/${provider}`, {method: "DELETE"});
    },
};
