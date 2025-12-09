import {useEffect} from "react";
import {Navigate, Route, Routes, useNavigate} from "react-router-dom";
import {AdminPage} from "./features/admin/AdminPage";
import {HomePage} from "./features/home/HomePage";
import {RoomPage} from "./features/rooms/RoomPage";
import {useRoomSession} from "./features/rooms/hooks/useRoomSession";
import {AppLayout} from "./components/AppLayout/AppLayout";

type AppRouterProps = {
    username: string;
};

export function AppRouter({username}: AppRouterProps) {
    const session = useRoomSession(username);
    const navigate = useNavigate();

    const handleLeaveRoom = () => {
        navigate("/", {replace: true});
    };

    useEffect(() => {
        if (!session.activeRoom) return;

        navigate(`/room/${session.activeRoom.id}`, {replace: true});
    }, [session.activeRoom, navigate]);

    return (
        <Routes>
            <Route
                path="/"
                element={(
                    <AppLayout username={username} showHeader>
                        <HomePage session={session}/>
                    </AppLayout>
                )}
            />
            <Route
                path="/room/:roomId"
                element={(
                    <AppLayout showHeader={false}>
                        <RoomPage session={session} onLeave={handleLeaveRoom}/>
                    </AppLayout>
                )}
            />
            <Route
                path="/admin"
                element={(
                    <AppLayout showHeader={false}>
                        <AdminPage/>
                    </AppLayout>
                )}
            />
            <Route path="*" element={<Navigate to="/" replace/>}/>
        </Routes>
    );
}
