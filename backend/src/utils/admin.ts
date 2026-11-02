import {config} from "../config.js";

// Compte administrateur (accès à la page Statistiques) : nom présent dans ADMIN_USERNAMES, sans tenir compte des majuscules
export function isAdminUsername(username: string | undefined | null): boolean {
    return !!username && config.adminUsernames.includes(username.toLowerCase());
}
