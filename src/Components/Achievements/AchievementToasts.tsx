/**
 * Popups « Succès débloqué » : petites cartes en haut à droite, une par succès, qui partent toutes seules
 * (un clic ouvre la page /succes). Le serveur débloque les succès pendant le jeu ; le site lui demande ce qu'il
 * n'a pas encore montré juste après chaque action (requête autre que GET), et toutes les 30 secondes (roulette
 * en direct, loteries, clôture des défis du jour). La récompense est ajoutée tout de suite aux jetons du header.
 */

import "./Achievements.scss";
import {useCallback, useEffect, useRef, useState} from "react";
import {useNavigate} from "react-router-dom";
import {FaTrophy} from "react-icons/fa";
import {API_WRITE_EVENT} from "../../api/api.ts";
import {useAuth} from "../../Context/authContext.ts";
import {ACHIEVEMENTS_CHECK_EVENT, achievementsService} from "../../Services/achievements.service.ts";
import {achievement, ACHIEVEMENT_TIER_NAMES} from "../../../backend/src/utils/achievements.ts";
import {formatCredits} from "../../Services/credits.ts";

const rewardText = (n: number) => (n >= 10_000 ? formatCredits(n) : n.toLocaleString("fr-FR"));

const POLL_MS = 30_000;
const AFTER_ACTION_MS = 1500;
const SHOW_MS = 7000;
const MAX_SHOWN = 3;

type Toast = { key: string; id: string; reward: number; leaving: boolean };

export default function AchievementToasts() {
    const auth = useAuth();
    const navigate = useNavigate();
    const [toasts, setToasts] = useState<Toast[]>([]);
    const waiting = useRef<Toast[]>([]);
    const known = useRef(new Set<string>());
    const authRef = useRef(auth);
    useEffect(() => {
        authRef.current = auth;
    }, [auth]);
    const active = auth.isLoggedIn && !auth.adminMode;

    const dismiss = useCallback((key: string) => {
        setToasts(list => list.map(t => (t.key === key ? {...t, leaving: true} : t)));
        window.setTimeout(() => {
            setToasts(list => {
                const rest = list.filter(t => t.key !== key);
                const next = waiting.current.shift();
                return next ? [...rest, next] : rest;
            });
        }, 300);
    }, []);

    const check = useCallback(async () => {
        if (document.hidden) return;
        try {
            const {unlocked} = await achievementsService.unseen();
            const fresh = unlocked.filter(u => !known.current.has(u.id) && achievement(u.id));
            if (fresh.length === 0) return;
            fresh.forEach(u => known.current.add(u.id));
            await achievementsService.markSeen(fresh.map(u => u.id));
            const reward = fresh.reduce((n, u) => n + u.reward, 0);
            if (reward > 0) authRef.current.setCredits(authRef.current.account.credits + reward);
            const items = fresh.map(u => ({key: `${u.id}-${Date.now()}`, id: u.id, reward: u.reward, leaving: false}));
            setToasts(list => {
                const room = Math.max(0, MAX_SHOWN - list.length);
                waiting.current.push(...items.slice(room));
                return [...list, ...items.slice(0, room)];
            });
        } catch {
            // hors ligne, session expirée… on réessaiera
        }
    }, []);

    useEffect(() => {
        if (!active) return;
        let timer: number | undefined;
        const soon = (ms: number) => {
            window.clearTimeout(timer);
            timer = window.setTimeout(() => void check(), ms);
        };
        const onWrite = () => soon(AFTER_ACTION_MS);
        const onCheck = () => soon(300);
        soon(2000);
        const poll = window.setInterval(() => void check(), POLL_MS);
        window.addEventListener(API_WRITE_EVENT, onWrite);
        window.addEventListener(ACHIEVEMENTS_CHECK_EVENT, onCheck);
        return () => {
            window.clearTimeout(timer);
            window.clearInterval(poll);
            window.removeEventListener(API_WRITE_EVENT, onWrite);
            window.removeEventListener(ACHIEVEMENTS_CHECK_EVENT, onCheck);
        };
    }, [active, check]);

    // chaque carte part toute seule
    useEffect(() => {
        const timers = toasts.filter(t => !t.leaving).map(t => window.setTimeout(() => dismiss(t.key), SHOW_MS));
        return () => timers.forEach(window.clearTimeout);
    }, [toasts, dismiss]);

    if (!active || toasts.length === 0) return null;

    return (
        <div className="achievement-toasts" aria-live="polite">
            {toasts.map(t => {
                const a = achievement(t.id)!;
                return (
                    <button key={t.key} type="button" className={`achievement-toast tier-${a.tier} ${t.leaving ? "leaving" : ""}`}
                            onClick={() => {
                                dismiss(t.key);
                                navigate("/succes");
                            }}>
                        <span className="achievement-toast-icon" aria-hidden><FaTrophy/></span>
                        <span className="achievement-toast-body">
                            <span className="achievement-toast-kicker">Succès débloqué · {ACHIEVEMENT_TIER_NAMES[a.tier]}</span>
                            <strong>{a.name}</strong>
                            <span className="achievement-toast-desc">{a.description}</span>
                        </span>
                        <span className="achievement-toast-reward">+{rewardText(t.reward)}</span>
                    </button>
                );
            })}
        </div>
    );
}
