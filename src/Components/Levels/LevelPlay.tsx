import {useEffect, useState} from "react";
import {Navigate, useParams} from "react-router-dom";
import {LEVEL_GAMES, type LevelsOverview, levelsService} from "../../Services/levels.service.ts";
import Queens from "../Queens/Queens.tsx";
import Loader from "../Loader/Loader.tsx";
import QueensTutorial from "./QueensTutorial.tsx";
import GalaxiesTutorial from "./GalaxiesTutorial.tsx";

/**
 * Partie d'un niveau (/niveaux/:gameCode/:level) : leçon guidée pour les niveaux du tutoriel, sinon le jeu du puzzle
 * chargé sur la grille du niveau. Le nombre de niveaux et la taille du tutoriel viennent du serveur.
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

    if (!overview) return <Loader label="Chargement du niveau…"/>;
    const info = {count: overview.levels.length, tutorial: overview.tutorial};
    switch (code) {
        case "QUEENS":
            // key : passer au niveau suivant recharge une partie neuve
            return number <= overview.tutorial
                ? <QueensTutorial key={number} level={number} tutorial={overview.tutorial}/>
                : <Queens key={number} level={number} levelInfo={info}/>;
        case "GALAXIES":
            // pour l'instant, seulement les leçons du tutoriel
            return number <= overview.tutorial && number <= overview.levels.length
                ? <GalaxiesTutorial key={number} level={number} tutorial={overview.tutorial}/>
                : <Navigate to="/niveaux/GALAXIES" replace/>;
        default:
            return <Navigate to="/" replace/>;
    }
}
