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
};

export type AuthContextValue = AuthState & {
    isLoggedIn: boolean;
    login: (user: LoggedUser) => void;
    logout: () => void;
    // Recharge niveau, XP et crédits depuis le serveur (après une victoire par exemple)
    refresh: () => Promise<void>;
};

export const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth(): AuthContextValue {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error("useAuth doit être utilisé dans <AuthProvider>");
    return ctx;
}
