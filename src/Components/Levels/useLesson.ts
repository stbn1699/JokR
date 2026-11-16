import {useEffect, useRef, useState} from "react";
import {useAuth} from "../../Context/authContext.ts";
import {guestDone, levelsService, rememberGuestLevel} from "../../Services/levels.service.ts";
import type {WinResult} from "../../Models/gameResult.model.ts";
import {confetti} from "../Confetti/Confetti.tsx";

export type LessonDone = { xp: number | null; first: boolean };

/**
 * Chargement et validation d'une leçon du tutoriel (niveau du mode Niveaux) :
 * - grid : grille de départ envoyée par le serveur (null tant qu'elle n'est pas arrivée)
 * - finish(send) : grille finie, envoyée au serveur une seule fois (`send` appelle la validation du jeu) ;
 *   ensuite done dit l'XP gagnée et si c'est la première réussite (invité : gardée dans ce navigateur)
 */
export function useLesson<Grid>(gameCode: string, level: number) {
    const auth = useAuth();
    const [grid, setGrid] = useState<Grid | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [done, setDone] = useState<LessonDone | null>(null);
    const gameId = useRef<string | null>(null);

    useEffect(() => {
        let cancelled = false;
        levelsService.start<Grid>(gameCode, level).then(started => {
            if (cancelled || started.alreadyDone) return;
            gameId.current = started.gameId;
            setGrid(started.grid);
        }).catch((err: Error) => !cancelled && setError(err.message || "Impossible de charger la leçon."));
        return () => {
            cancelled = true;
        };
    }, [gameCode, level]);

    const finish = (send: (gameId: string) => Promise<WinResult>) => {
        const id = gameId.current;
        if (!id || done) return;
        gameId.current = null;
        const firstGuest = !auth.isLoggedIn && !guestDone(gameCode).includes(level);
        if (!auth.isLoggedIn) rememberGuestLevel(gameCode, level);
        send(id).then(result => {
            setDone({xp: result.xp ?? null, first: auth.isLoggedIn ? result.level?.first === true : firstGuest});
            if (result.xp !== undefined) void auth.refresh();
            confetti();
        }).catch((err: Error) => setError(err.message || "La validation a échoué."));
    };

    return {grid, error, done, finish};
}
