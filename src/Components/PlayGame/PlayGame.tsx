import "./PlayGame.scss"
import {useParams} from "react-router-dom"
import Header from "../Header/Header.tsx";
import type {JSX} from "react";
import Sudoku from "../Sudoku/Sudoku.tsx";

type RouteParams = {
    game?: string
}

export default function PlayGame() {
    const {game} = useParams<RouteParams>()

    return (<>
        <Header/>
            {() => {
                const components: Record<string, JSX.Element> = {
                    sudoku: <Sudoku/>
                };
                return components[game ?? ""] ?? null;
            }}
    </>)
}