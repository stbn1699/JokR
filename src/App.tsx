import {useState} from "react";
import "./App.css";
import {UsernameGate} from "./features/auth/UsernameGate";
import {MainLayout} from "./layout/MainLayout";
import {GamesList} from "./features/games/GamesList";
import {AdminPage} from "./features/admin/AdminPage";

function App() {
    const isAdminRoute = typeof window !== "undefined" && window.location.pathname.startsWith("/admin");
    const [username, setUsername] = useState<string | null>(null);

    if (isAdminRoute) {
        return <AdminPage/>;
    }

    if (!username) {
        return <UsernameGate onUsernameSet={setUsername}/>;
    }

    return (
        <div className="app-root">
            <MainLayout username={username}>
                <GamesList username={username}/>
            </MainLayout>
        </div>
    );
}

export default App;
