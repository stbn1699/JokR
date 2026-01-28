import "./PlayGame.scss"
import {useParams} from "react-router-dom"
import Header from "../Header/Header.tsx";
import Sudoku from "../Sudoku/Sudoku.tsx";

type RouteParams = {
    gameCode?: string
}

export default function PlayGame() {
    const {gameCode} = useParams<RouteParams>()

    const renderGame = () => {
        switch (gameCode) {
            case "SUDOKU":
                return <Sudoku gameCode={gameCode}/>;
            default:
                return null;
        }
    }

    return (
        <>
            <Header/>
            {renderGame()}
        </>
    )
}