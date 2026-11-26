import {type ReactNode, useCallback, useEffect, useMemo, useRef, useState} from "react";
import {useNavigate} from "react-router-dom";
import {AuthContext, type AuthContextValue, type AuthState} from "./authContext.ts";
import {UNLIMITED_CREDITS} from "../Services/credits.ts";
import {authService} from "../Services/auth.service.ts";
import {userService} from "../Services/user.service.ts";
import {dropPushSubscription} from "../Services/push.service.ts";
import {ApiError, AUTH_EXPIRED_EVENT} from "../api/api.ts";
import type {LoggedUser} from "../Models/loggedUser.model.ts";

const LOGGED_OUT: AuthState = {userId: null, username: null, level: 1, xp: 0, credits: 0, avatar: null, isAdmin: false, background: null, adminMode: false, streak: null};

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

    const endSession = useCallback(() => {
        authService.clearSession();
        setState(LOGGED_OUT);
    }, []);

    // Déconnexion voulue : cet appareil ne reçoit plus les notifications du compte
    const logout = useCallback(() => {
        void dropPushSubscription();
        endSession();
    }, [endSession]);

    // Recharge le profil depuis le serveur via /users/me : un token expiré (401) ou un compte
    // supprimé (404) ferme la session
    const refresh = useCallback(async () => {
        if (!authService.getSession()) return;
        try {
            const user = await userService.getMe();
            setState({
                userId: user.id, username: user.username, level: user.user_level, xp: user.user_xp, credits: user.credits,
                avatar: user.avatar,
                isAdmin: user.isAdmin === true,
                background: user.background ?? null,
                adminMode: user.adminMode === true,
                streak: user.streak ?? null,
            });
        } catch (err) {
            const status = err instanceof ApiError ? err.status : undefined;
            if (status === 404) logout();
            // 401 : déjà géré par l'événement AUTH_EXPIRED_EVENT
            else if (status !== 401) console.error("Impossible de recharger le profil", err);
        }
    }, [logout]);

    const login = useCallback((user: LoggedUser) => {
        authService.saveSession(user.token, user.userId);
        setState({userId: user.userId, username: null, level: user.userLevel, xp: user.userXp, credits: 0, avatar: null, isAdmin: false, background: null, adminMode: false, streak: null});
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

    // Token expiré ou invalide : retour au login (l'appareil reste abonné : le joueur n'a pas choisi de partir)
    useEffect(() => {
        const onExpired = () => {
            endSession();
            navigate("/login");
        };
        window.addEventListener(AUTH_EXPIRED_EVENT, onExpired);
        return () => window.removeEventListener(AUTH_EXPIRED_EVENT, onExpired);
    }, [endSession, navigate]);

    const setAvatar = useCallback((avatar: string) => setState(s => ({...s, avatar})), []);
    const setBackground = useCallback((background: string | null) => setState(s => ({...s, background})), []);
    /*
     * Flamme pas encore allumée aujourd'hui : relit seulement la flamme sur le serveur (une mise, une partie de
     * quizz l'allument aussi, voir lightStreak côté serveur). Le reste de l'état n'est pas touché (les jeux
     * gardent l'affichage de leurs crédits pendant les animations).
     */
    const streakLit = useRef(false);
    useEffect(() => {
        streakLit.current = state.streak?.playedToday === true;
    }, [state.streak]);
    const touchStreak = useCallback(async () => {
        if (streakLit.current || !authService.getSession()) return;
        try {
            const user = await userService.getMe();
            setState(s => ({...s, streak: user.streak ?? null}));
        } catch {
            // sans importance : la flamme sera relue au prochain chargement du profil
        }
    }, []);

    // Solde changé par une mise : la flamme vient peut-être de s'allumer
    const setCredits = useCallback((credits: number) => {
        setState(s => ({...s, credits}));
        void touchStreak();
    }, [touchStreak]);

    const value = useMemo<AuthContextValue>(() => ({
        ...state,
        // mode admin : niveau max et crédits illimités (rien n'est retiré ni gagné côté serveur)
        ...(state.adminMode ? {level: 100, xp: 0, credits: UNLIMITED_CREDITS} : {}),
        account: {level: state.level, xp: state.xp, credits: state.credits},
        isLoggedIn: state.userId !== null,
        login,
        logout,
        refresh,
        setAvatar,
        setBackground,
        setCredits,
        touchStreak,
    }), [state, login, logout, refresh, setAvatar, setBackground, setCredits, touchStreak]);

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
