import {type ComponentType, useEffect, useState} from "react";
import {Navigate, useParams} from "react-router-dom";
import {LEVEL_GAMES, type LevelsOverview, levelsService} from "../../Services/levels.service.ts";
import Queens from "../Queens/Queens.tsx";
import Binero from "../Binero/Binero.tsx";
import Galaxies from "../Galaxies/Galaxies.tsx";
import Rikudo from "../Rikudo/Rikudo.tsx";
import Shikaku from "../Shikaku/Shikaku.tsx";
import Sudoku from "../Sudoku/Sudoku.tsx";
import Tectonic from "../Tectonic/Tectonic.tsx";
import Trace from "../Trace/Trace.tsx";
import type {LevelInfo} from "./LevelVictory.tsx";
import Loader from "../Loader/Loader.tsx";
import QueensTutorial from "./QueensTutorial.tsx";
import GalaxiesTutorial from "./GalaxiesTutorial.tsx";
import BineroTutorial from "./BineroTutorial.tsx";
import SudokuTutorial from "./SudokuTutorial.tsx";
import TraceTutorial from "./TraceTutorial.tsx";
import RikudoTutorial from "./RikudoTutorial.tsx";
import TectonicTutorial from "./TectonicTutorial.tsx";
import ShikakuTutorial from "./ShikakuTutorial.tsx";

type LessonProps = { level: number; tutorial: number | null };

// Leçons guidées de chaque jeu (les `tutorial` premiers niveaux)
const TUTORIALS: Record<string, ComponentType<LessonProps>> = {
    QUEENS: QueensTutorial,
    GALAXIES: GalaxiesTutorial,
    BINERO: BineroTutorial,
    SUDOKU: SudokuTutorial,
    TRACE: TraceTutorial,
    RIKUDO: RikudoTutorial,
    TECTONIC: TectonicTutorial,
    SHIKAKU: ShikakuTutorial,
};

type LevelGameProps = { level: number; levelInfo: LevelInfo };

// Jeu de chaque puzzle, chargé sur la grille d'un niveau (niveaux après le tutoriel)
const GAMES: Record<string, ComponentType<LevelGameProps>> = {
    QUEENS: Queens,
    GALAXIES: Galaxies,
    BINERO: Binero,
    SUDOKU: Sudoku,
    TRACE: Trace,
    RIKUDO: Rikudo,
    TECTONIC: Tectonic,
    SHIKAKU: Shikaku,
};

/**
 * Partie d'un niveau (/niveaux/:gameCode/:level) : leçon guidée pour les niveaux du tutoriel, sinon le jeu du puzzle
 * chargé sur la grille du niveau.
 * Le nombre de niveaux et la taille du tutoriel viennent du serveur.
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
    if (number > overview.levels.length) return <Navigate to={`/niveaux/${code}`} replace/>;

    // key : passer au niveau suivant recharge une partie neuve
    const Lesson = TUTORIALS[code];
    if (Lesson && number <= overview.tutorial) return <Lesson key={number} level={number} tutorial={overview.tutorial}/>;
    const Game = GAMES[code];
    if (!Game) return <Navigate to={`/niveaux/${code}`} replace/>;
    return <Game key={number} level={number} levelInfo={{count: overview.levels.length, tutorial: overview.tutorial}}/>;
}
