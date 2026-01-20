import "./App.css";
import GameList from "./Components/GameList/GameList.tsx";
import {Route, Routes} from "react-router-dom";
import PlayGame from "./Components/PlayGame/PlayGame.tsx";
import Login from "./Components/UserSection/Login/Login.tsx";
import Register from "./Components/UserSection/Register/Register.tsx";

function App() {

    return (
        <div className="app-root">
            <Routes>
                <Route path="/" element={<GameList/>}/>
                <Route path="/playgame/:game" element={<PlayGame/>}/>
                <Route path="/login" element={<Login/>}/>
                <Route path="/register" element={<Register/>}/>
                <Route path="*" element={<div>404<br/>Page non trouvée</div>}/>
            </Routes>
        </div>
    );
}

export default App;
