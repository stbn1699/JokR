import {useState} from "react";
import "./App.css";
import {UsernameGate} from "./features/auth/UsernameGate";
import {MainLayout} from "./layout/MainLayout";
import {GamesList} from "./features/games/GamesList";

function App() {
    const [username, setUsername] = useState<string | null>(null);

    if (!username) {
        return <UsernameGate onUsernameSet={setUsername}/>;
    }

    return (
        <div className="app-root">
            <MainLayout username={username}>
                <GamesList/>
            </MainLayout>
        </div>
    );
}

export default App;
