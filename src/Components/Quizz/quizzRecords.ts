import {useEffect, useState} from "react";
import type {QuizzMode} from "./quizzMatch.ts";
import {quizzService} from "../../Services/quizz.service.ts";

/**
 * Records du Quizz, par thème, gardés dans ce navigateur (localStorage) : meilleur score en solo.
 * Joueur connecté : ses parties sont aussi enregistrées sur le serveur (statistiques) ; useSoloBest prend le meilleur
 * des deux, pour un record qui suit le joueur d'un appareil à l'autre.
 * Stockage indisponible (navigation privée…) : tout reste à zéro, sans erreur.
 */

export type QuizzRecord = { soloBest: number; soloGames: number; wins: number; draws: number; losses: number };

const EMPTY: QuizzRecord = {soloBest: 0, soloGames: 0, wins: 0, draws: 0, losses: 0};

const key = (topicId: string) => `quizz:${topicId}`;

export function readRecord(topicId: string): QuizzRecord {
    try {
        const raw = localStorage.getItem(key(topicId));
        return raw ? {...EMPTY, ...JSON.parse(raw) as Partial<QuizzRecord>} : EMPTY;
    } catch {
        return EMPTY;
    }
}

// Fin de partie : met à jour le record du thème
export function saveResult(topicId: string, mode: QuizzMode, myScore: number, opponentScore = 0): QuizzRecord {
    const r = readRecord(topicId);
    const next: QuizzRecord = mode === "solo"
        ? {...r, soloBest: Math.max(r.soloBest, myScore), soloGames: r.soloGames + 1}
        : myScore > opponentScore ? {...r, wins: r.wins + 1}
            : myScore < opponentScore ? {...r, losses: r.losses + 1} : {...r, draws: r.draws + 1};
    try {
        localStorage.setItem(key(topicId), JSON.stringify(next));
    } catch {
        // stockage indisponible : le record n'est pas gardé
    }
    return next;
}

// Meilleur score solo sur ce thème (ou ce mélange) : celui de ce navigateur, ou celui du serveur s'il est meilleur
export function useSoloBest(topicId: string, loggedIn: boolean): number {
    const [local] = useState(() => readRecord(topicId).soloBest);
    const [server, setServer] = useState(0);
    useEffect(() => {
        if (!loggedIn) return;
        const controller = new AbortController();
        quizzService.soloRecord(topicId, controller.signal).then(r => setServer(r.best)).catch(() => undefined);
        return () => controller.abort();
    }, [topicId, loggedIn]);
    return Math.max(local, server);
}
