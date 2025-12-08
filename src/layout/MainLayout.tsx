import type {ReactNode} from "react";

interface MainLayoutProps {
    username: string;
    children: ReactNode;
}

function stringToColor(stringToConvert: string) {
    let hash = 0;

    // simple hash
    for (let i = 0; i < stringToConvert.length; i++) {
        hash = stringToConvert.charCodeAt(i) + ((hash << 5) - hash);
    }

    // transform hash into an HSL color
    const h = Math.abs(hash) % 360;        // Hue: 0–360
    const s = 60;                           // Saturation
    const l = 55;                           // Lightness

    return `hsl(${h}, ${s}%, ${l}%)`;
}

function modifyUsername() {
    return () => {
        const newUsername = prompt("Enter your new username:");
        if (newUsername && newUsername.trim().length > 0) {
            localStorage.setItem("jokr.username", newUsername.trim());
            window.location.reload();
        }
    };
}

export function MainLayout({username, children}: MainLayoutProps) {
    return (
        <div className="main-layout">
            <header className="app-header">
                <img className="logo" src="/logo.png" alt="JokR"/>

                <div className="user-box" onClick={modifyUsername()}>
                    <span
                        className="user-icon"
                        style={{background: stringToColor(username)}}
                    >
                        {username[0]}
                    </span>
                    <span className="user-name">{username}</span>
                </div>
            </header>

            <main className="app-main">{children}</main>
        </div>
    );
}