import "./AppHeader.css";

type AppHeaderProps = {
    username: string;
};

function stringToColor(stringToConvert: string) {
    let hash = 0;

    for (let i = 0; i < stringToConvert.length; i++) {
        hash = stringToConvert.charCodeAt(i) + ((hash << 5) - hash);
    }

    const h = Math.abs(hash) % 360;
    const s = 60;
    const l = 55;

    return `hsl(${h}, ${s}%, ${l}%)`;
}

export function AppHeader({username}: AppHeaderProps) {
    const changeUsername = () => {
        const newUsername = prompt("Enter your new username:");
        if (newUsername && newUsername.trim().length > 0) {
            localStorage.setItem("jokr.username", newUsername.trim());
            window.location.reload();
        }
    };

    return (
        <header className="app-header">
            <img className="logo" src="/logo.png" alt="JokR"/>

            <button className="user-box" onClick={changeUsername}>
                <span
                    className="user-icon"
                    style={{background: stringToColor(username)}}
                >
                    {username[0]}
                </span>
                <span className="user-name">{username}</span>
            </button>
        </header>
    );
}
