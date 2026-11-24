import type {ReactNode} from "react";
import "../PuzzleUI/PuzzleLayout.scss";
import "./WordGames.scss";
import {SuccessPopup} from "../SuccessPopup/SuccessPopup.tsx";
import GameNotice from "../PuzzleUI/GameNotice.tsx";
import GameTimer from "../PuzzleUI/GameTimer.tsx";
import GameToolbar from "../PuzzleUI/GameToolbar.tsx";
import HistoryButtons from "../PuzzleUI/HistoryButtons.tsx";
import type {Clock, useGameFlow} from "../PuzzleUI/useGameFlow.ts";
import type {useGridChallenge} from "../PuzzleUI/useGridChallenge.tsx";
import Loader from "../Loader/Loader.tsx";

type History = { canUndo: boolean; canRedo: boolean; canReset?: boolean; onUndo: () => void; onRedo: () => void; onReset?: () => void };

type WordGameShellProps = {
    className: string;
    gameCode: string;
    gameName: string;
    flow: ReturnType<typeof useGameFlow>;
    // Chrono affiché (partie perdue : figé)
    clock?: Clock;
    rules: ReactNode;
    // Panneau de gauche : progression de la partie
    info: ReactNode;
    history?: History;
    settings: ReactNode;
    // défis (du jour, passé ou d'un·e ami·e) : voir useGridChallenge
    challenge: ReturnType<typeof useGridChallenge>;
    children: ReactNode;
};

const noop = () => undefined;

// Crédit demandé par la licence du dictionnaire
const wordCredit = (
    <p className="word-credit">
        Mots issus de <a href="https://www.lexique.org" target="_blank" rel="noreferrer">Lexique 4.10</a>,
        sous licence <a href="https://creativecommons.org/licenses/by-sa/4.0/deed.fr" target="_blank" rel="noreferrer">CC BY-SA 4.0</a>
    </p>
);

// Mise en page commune aux jeux de mots : progression à gauche, jeu au centre, actions et règles à droite
export default function WordGameShell({className, gameCode, gameName, flow, clock = flow.clock, rules, info, history, settings, challenge, children}: WordGameShellProps) {
    return (
        <div className={`puzzle-layout word-game ${className}`}>
            <GameToolbar gameName={gameName} label={challenge.toolbarLabel} clock={clock}
                         canUndo={history?.canUndo ?? false} canRedo={history?.canRedo ?? false}
                         onUndo={history?.onUndo ?? noop} onRedo={history?.onRedo ?? noop} rules={<>{rules}{wordCredit}</>}/>

            <div className="options">
                <h2 className="title">{gameName}</h2>
                <div className="word-info">{info}</div>
            </div>

            <div className="game">
                {challenge.banner}
                <h1 className="title">{gameName}</h1>
                {challenge.loading && <Loader size="small" label="Chargement du défi…"/>}
                {children}
            </div>

            <div className="actions">
                <h2 className="title">Actions</h2>
                <GameTimer clock={clock}/>
                {history && <HistoryButtons {...history}/>}
                <GameNotice message={challenge.error ?? flow.notice} onClose={flow.clearNotice}/>
                <div className="rules">
                    <h3>Règles</h3>
                    {rules}
                    {wordCredit}
                </div>
            </div>

            {settings}

            {challenge.donePopup}

            {flow.victory && (
                <SuccessPopup gameName={gameName} gameCode={gameCode} xpAwarded={flow.victory.xpAwarded}
                              creditsAwarded={flow.victory.creditsAwarded} rewardMultiplier={flow.victory.rewardMultiplier}
                              before={flow.victory.before} durationMs={flow.victory.durationMs}
                              personalBest={flow.victory.personalBest} daily={flow.victory.daily}
                              streak={flow.victory.streak} {...challenge.victory(flow.newGame)}/>
            )}
        </div>
    );
}
