import {type ReactNode, useCallback, useEffect, useMemo, useState} from "react";
import {useNavigate} from "react-router-dom";
import {AuthContext, type AuthContextValue, type AuthState} from "./authContext.ts";
import {authService} from "../Services/auth.service.ts";
import {userService} from "../Services/user.service.ts";
import {ApiError, AUTH_EXPIRED_EVENT} from "../api/api.ts";
import type {LoggedUser} from "../Models/loggedUser.model.ts";

const LOGGED_OUT: AuthState = {userId: null, username: null, level: 1, xp: 0, credits: 0};

/*
 * Fournit la session à toute l'app.
 * - Au démarrage : reprend la session stockée et vérifie le token en rechargeant le profil
 * - Si le serveur répond 401 à une requête authentifiée (token expiré), on déconnecte
 */
export function AuthProvider({children}: { children: ReactNode }) {
    const navigate = useNavigate();
    const [state, setState] = useState<AuthState>(() => ({
        ...LOGGED_OUT,
        userId: authService.getSession()?.userId ?? null,
    }));

    const logout = useCallback(() => {
        authService.clearSession();
        setState(LOGGED_OUT);
    }, []);

    // Recharge le profil depuis le serveur via /users/me : un token expiré (401) ou un compte
    // supprimé (404) ferme la session
    const refresh = useCallback(async () => {
        if (!authService.getSession()) return;
        try {
            const user = await userService.getMe();
            setState({userId: user.id, username: user.username, level: user.user_level, xp: user.user_xp, credits: user.credits});
        } catch (err) {
            const status = err instanceof ApiError ? err.status : undefined;
            if (status === 404) logout();
            // 401 : déjà géré par l'événement AUTH_EXPIRED_EVENT
            else if (status !== 401) console.error("Impossible de recharger le profil", err);
        }
    }, [logout]);

    const login = useCallback((user: LoggedUser) => {
        authService.saveSession(user.token, user.userId);
        setState({userId: user.userId, username: null, level: user.userLevel, xp: user.userXp, credits: 0});
        void refresh(); // récupère le username et les crédits
    }, [refresh]);

    // Chargement initial du profil, lancé juste après le montage (et pas pendant l'effet lui-même)
    useEffect(() => {
        let cancelled = false;
        const timer = window.setTimeout(() => {
            if (!cancelled) void refresh();
        }, 0);
        return () => {
            cancelled = true;
            window.clearTimeout(timer);
        };
    }, [refresh]);

    // Token expiré ou invalide : déconnexion + retour au login
    useEffect(() => {
        const onExpired = () => {
            logout();
            navigate("/login");
        };
        window.addEventListener(AUTH_EXPIRED_EVENT, onExpired);
        return () => window.removeEventListener(AUTH_EXPIRED_EVENT, onExpired);
    }, [logout, navigate]);

    const value = useMemo<AuthContextValue>(() => ({
        ...state,
        isLoggedIn: state.userId !== null,
        login,
        logout,
        refresh,
    }), [state, login, logout, refresh]);

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
