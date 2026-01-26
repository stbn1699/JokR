import "./App.css";
import GameList from "./Components/GameList/GameList.tsx";
import {Route, Routes} from "react-router-dom";
import PlayGame from "./Components/PlayGame/PlayGame.tsx";
import Login from "./Components/UserSection/Login/Login.tsx";
import Register from "./Components/UserSection/Register/Register.tsx";
import {gameStatsService} from "./Services/gameStats.service.ts";
import type {GameStats} from "./Models/gameStats.model.ts";
import {useEffect, useState} from "react";

function App() {
    const userId = window.localStorage.getItem("userId");
    const [userStats, setUserStats] = useState<GameStats[] | null>(null);

    useEffect(() => {
        if (!userId) return;
        let cancelled = false;

        (async () => {
            try {
                const stats :GameStats[] = await gameStatsService.getStatsByUserId(userId);
                if (!cancelled) setUserStats(stats);
                console.log(stats);
            } catch (err) {
                console.error("Erreur lors de la récupération des stats :", err);
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [userId]);

    return (
        <div className="app-root">
            <Routes>
                <Route path="/" element={<GameList userStats={userStats}/>}/>
                <Route path="/playgame/:game" element={<PlayGame/>}/>
                <Route path="/login" element={<Login/>}/>
                <Route path="/register" element={<Register/>}/>
                <Route path="*" element={<div>404<br/>Page non trouvée</div>}/>
            </Routes>
        </div>
    );
}

export default App;
