/**
 * Page d'un joueur (/joueur/:pseudo), ouverte depuis les classements. Voir PlayerProfileView.
 * Sa propre page : renvoie vers /profile (même affichage, avec ses réglages).
 */

import {Navigate, useParams} from "react-router-dom";
import {useAuth} from "../../Context/authContext.ts";
import PlayerProfileView from "./PlayerProfileView.tsx";

export default function PlayerProfile() {
    const {username = ""} = useParams();
    const {username: me} = useAuth();
    if (me && me === username) return <Navigate to="/profile" replace/>;
    return (
        <main className="profile player-profile">
            <PlayerProfileView username={username}/>
        </main>
    );
}
