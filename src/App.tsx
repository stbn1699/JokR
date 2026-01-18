import "./App.css";
import Header from "./Components/Header/Header.tsx";
import GameList from "./Components/GameList/GameList.tsx";

function App() {

	return (
		<div className="app-root">
            <Header></Header>
            <GameList></GameList>
		</div>
	);
}

export default App;
