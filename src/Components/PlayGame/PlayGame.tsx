import "./PlayGame.scss"
import {useParams} from "react-router-dom"
import Header from "../Header/Header.tsx";

type RouteParams = {
    game?: string
}

export default function PlayGame() {
    const {game} = useParams<RouteParams>()

    return (
        <>
            <Header/>
            <div className="play-game">
                {game ? `Jeu : ${game}` : "Jeu non précisé"}
            </div>
        </>
    )
}