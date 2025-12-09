import {useState} from "react";
import {UsernameGate} from "./features/auth/UsernameGate";
import {AppRouter} from "./AppRouter";

export default function App() {
    const [username, setUsername] = useState<string | null>(null);

    if (!username) {
        return <UsernameGate onUsernameSet={setUsername}/>;
    }

    return <AppRouter username={username}/>;
}
