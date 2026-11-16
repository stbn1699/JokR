import {useEffect, useState} from "react";
import {Navigate, useParams} from "react-router-dom";
import {LEVEL_GAMES, type LevelsOverview, levelsService} from "../../Services/levels.service.ts";
import Queens from "../Queens/Queens.tsx";

/**
 * Partie d'un niveau (/niveaux/:gameCode/:level) : le jeu du puzzle, chargé sur la grille du niveau.
 * Le nombre de niveaux et la taille du tutoriel viennent du serveur (bouton « Niveau suivant », fin du tutoriel).
 */
export default function LevelPlay() {
    const {gameCode = "", level = ""} = useParams<{ gameCode: string; level: string }>();
    const code = gameCode.toUpperCase();
    const number = Number(level);
    const [overview, setOverview] = useState<LevelsOverview | null>(null);

    useEffect(() => {
        if (!LEVEL_GAMES.has(code)) return;
        const controller = new AbortController();
        levelsService.overview(code, controller.signal).then(setOverview).catch(() => undefined);
        return () => controller.abort();
    }, [code]);

    if (!LEVEL_GAMES.has(code) || !Number.isInteger(number) || number < 1) return <Navigate to="/" replace/>;

    const info = {count: overview?.levels.length ?? null, tutorial: overview?.tutorial ?? null};
    switch (code) {
        case "QUEENS":
            // key : passer au niveau suivant recharge une partie neuve
            return <Queens key={number} level={number} levelInfo={info}/>;
        default:
            return <Navigate to="/" replace/>;
    }
}
