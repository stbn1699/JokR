import {useEffect, useState} from "react";
import "./App.css";
import {HomePage} from "./pages/HomePage";
import {RoomPage} from "./pages/RoomPage";

type Route = {name: "home"} | {name: "room"; roomId: string; search: string};

const normalizeBasePath = (value: string | undefined) => {
    if (!value) {
        return "";
    }

    if (value === "/") {
        return "";
    }

    return value.endsWith("/") ? value.slice(0, -1) : value;
};

const BASE_PATH = normalizeBasePath(import.meta.env.BASE_URL);
const heroImageSrc = `${BASE_PATH}/JokR.png`;

const ROOM_ROUTE_REGEX = /^\/rooms\/([^/?#]+)/i;
const stripBasePath = (pathname: string) => {
    if (!BASE_PATH) {
        return pathname;
    }

    if (pathname.toLowerCase().startsWith(BASE_PATH.toLowerCase())) {
        const stripped = pathname.slice(BASE_PATH.length) || "/";
        return stripped.startsWith("/") ? stripped : `/${stripped}`;
    }

    return pathname;
};

const readRouteFromLocation = (): Route => {
    if (typeof window === "undefined") {
        return {name: "home"};
    }

    const {pathname, search} = window.location;
    const relativePath = stripBasePath(pathname);
    const match = relativePath.match(ROOM_ROUTE_REGEX);
    if (match) {
        const roomId = decodeURIComponent(match[1] ?? "").trim();
        if (roomId) {
            return {name: "room", roomId, search: search ?? ""};
        }
    }

    return {name: "home"};
};

const generateRoomId = () => {
    if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
        return crypto.randomUUID().split("-")[0].toUpperCase();
    }

    return Math.random().toString(36).slice(2, 10).toUpperCase();
};

const buildHomePath = () => BASE_PATH || "/";

const buildRoomPath = (roomId: string, search: string) => `${BASE_PATH}/rooms/${roomId}${search}`;

export default function App() {
    const [route, setRoute] = useState<Route>(() => readRouteFromLocation());

    useEffect(() => {
        if (typeof window === "undefined") {
            return;
        }

        const handlePopState = () => {
            setRoute(readRouteFromLocation());
        };

        window.addEventListener("popstate", handlePopState);
        return () => window.removeEventListener("popstate", handlePopState);
    }, []);

    const navigateTo = (target: Route) => {
        if (typeof window === "undefined") {
            setRoute(target);
            return;
        }

        const targetPath =
            target.name === "home"
                ? buildHomePath()
                : buildRoomPath(target.roomId, target.search);
        const currentPath = `${window.location.pathname}${window.location.search}`;

        if (targetPath !== currentPath) {
            window.history.pushState(null, "", targetPath);
        }

        setRoute(target);
    };

    const handleSelectGame = (gameId: string | null) => {
        const roomId = generateRoomId();
        const search = gameId ? `?game=${encodeURIComponent(gameId)}` : "";
        navigateTo({name: "room", roomId, search});
    };

    const handleBackToHome = () => {
        navigateTo({name: "home"});
    };

    const isRoomView = route.name === "room";

    return (
        <div className={`app-shell ${isRoomView ? "lobby-view" : "home-view"}`}>
            <div className={`app-container ${isRoomView ? "lobby" : "home"}`}>
                {route.name === "home" && (
                    <HomePage heroImageSrc={heroImageSrc} onSelectGame={handleSelectGame} />
                )}
                {route.name === "room" && (
                    <RoomPage
                        key={route.roomId}
                        roomId={route.roomId}
                        search={route.search}
                        onBackToHome={handleBackToHome}
                    />
                )}
            </div>
        </div>
    );
}
