import "./PlayGame.scss"
import {useParams} from "react-router-dom"
import Header from "../Header/Header.tsx";
import Sudoku from "../Sudoku/Sudoku.tsx";

type RouteParams = {
    game?: string
}

export default function PlayGame() {
    const {game} = useParams<RouteParams>()

    const renderGame = () => {
        switch (game) {
            case "SUDOKU":
                return <Sudoku/>;
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