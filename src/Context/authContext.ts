import {createContext, useContext} from "react";
import type {LoggedUser} from "../Models/loggedUser.model.ts";

/*
 * Session de l'utilisateur connecté, partagée dans toute l'app (voir AuthProvider).
 * Les composants qui l'utilisent se mettent à jour dès qu'elle change.
 */
export type AuthState = {
    userId: string | null;
    username: string | null;
    level: number;
    xp: number;
    credits: number;
    // Graine de l'icône de profil (null tant que le profil n'est pas chargé)
    avatar: string | null;
    // Administrateur : accès à la page Statistiques
    isAdmin: boolean;
    // Fond du site choisi dans la boutique (null : fond par défaut)
    background: string | null;
};

export type AuthContextValue = AuthState & {
    isLoggedIn: boolean;
    login: (user: LoggedUser) => void;
    logout: () => void;
    // Recharge niveau, XP et crédits depuis le serveur (après une victoire par exemple)
    refresh: () => Promise<void>;
    // Icône de profil changée : le header se met à jour tout de suite
    setAvatar: (avatar: string) => void;
    // Fond choisi dans la boutique (appliqué tout de suite au site), et crédits après un achat
    setBackground: (background: string | null) => void;
    setCredits: (credits: number) => void;
};

export const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth(): AuthContextValue {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error("useAuth doit être utilisé dans <AuthProvider>");
    return ctx;
}
