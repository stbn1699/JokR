import type {ReactNode} from "react";
import {AppHeader} from "../AppHeader/AppHeader";
import "./AppLayout.css";

type AppLayoutProps = {
    username?: string;
    showHeader?: boolean;
    children: ReactNode;
};

export function AppLayout({username, showHeader = true, children}: AppLayoutProps) {
    return (
        <div className="app-root">
            <div className="app-shell">
                {showHeader && username ? <AppHeader username={username}/> : null}
                <main className="app-main">{children}</main>
            </div>
        </div>
    );
}
