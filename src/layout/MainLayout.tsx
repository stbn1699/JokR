import type {ReactNode} from "react";

interface MainLayoutProps {
    username: string;
    children: ReactNode;
}

export function MainLayout({username, children}: MainLayoutProps) {
    return (
        <div className="main-layout">
            <header className="app-header">
                <img className="logo" src="/logo.png" alt="JokR"/>

                <div className="user-box">
                    <span className="user-label">Connecté en tant que</span>
                    <span className="user-name">{username}</span>
                </div>
            </header>

            <main className="app-main">{children}</main>
        </div>
    );
}