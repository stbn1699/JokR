import "./App.css";
import GameList from "./Components/GameList/GameList.tsx";
import {Route, Routes} from "react-router-dom";
import PlayGame from "./Components/PlayGame/PlayGame.tsx";

function App() {

    return (
        <div className="app-root">
            <Routes>
                <Route path="/" element={<GameList/>}/>
                <Route path="/playgame/:game" element={<PlayGame/>}></Route>
                <Route path="*" element={<div>404<br/>Page non trouvée</div>}/>
            </Routes>
        </div>
    );
}

export default App;
